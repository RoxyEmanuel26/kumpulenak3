import fs from "fs";
import path from "path";
import crypto from "crypto";
import { sql } from "../db";

export interface EnrichedFaqItem {
  question: string;
  answer: string;
}

export interface EnrichedVideoData {
  video_id: string;
  source_hash: string;
  seo_title: string;
  meta_description: string;
  summary: string;
  highlights: string[];
  tags: string[];
  faq: EnrichedFaqItem[];
  status: "pending" | "enriched" | "failed" | "rejected";
  model: string;
  generated_at: string;
  attempts: number;
  rejection_reason?: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "seo-enrichment.json");
const STORE_CACHE_TTL_MS = 60_000;
const DB_ENRICHED_MAP_TTL_MS = 60 * 60 * 1000; // 1 hour RAM cache for enriched DB rows
const DB_FAILURE_BACKOFF_MS = 60_000;         // 1 min backoff if DB is paused/unreachable

const globalForEnrichment = globalThis as unknown as {
  seoDbEnrichedMap?: Map<string, EnrichedVideoData>;
  seoDbEnrichedLoadedAt?: number;
  seoDbEnrichedFailedAt?: number;
  seoDbEnrichedInFlight?: Promise<Map<string, EnrichedVideoData> | null> | null;
};

let memoryStoreCache: Record<string, EnrichedVideoData> | null = null;
let memoryStoreLoadedAt = 0;

/** Computes a stable SHA-256 hash of the input metadata to detect upstream changes */
export function computeSourceHash(title: string, keywords?: string): string {
  const content = `${title.trim()}|${(keywords || "").trim()}`;
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
}

/** Ensures the data directory and JSON store exist, caching parsed JSON in RAM for 60s */
function ensureStoreExists(): Record<string, EnrichedVideoData> {
  const now = Date.now();
  if (memoryStoreCache && now - memoryStoreLoadedAt < STORE_CACHE_TTL_MS) {
    return memoryStoreCache;
  }

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(STORE_PATH)) {
      fs.writeFileSync(STORE_PATH, JSON.stringify({}, null, 2), "utf8");
      memoryStoreCache = {};
      memoryStoreLoadedAt = now;
      return memoryStoreCache;
    }
    const raw = fs.readFileSync(STORE_PATH, "utf8");
    memoryStoreCache = JSON.parse(raw);
    memoryStoreLoadedAt = now;
    return memoryStoreCache!;
  } catch (err) {
    console.warn("[enrichment-store] Failed to read JSON store, returning empty cache:", err);
    return memoryStoreCache ?? {};
  }
}

/** Parses a JSONB array column that may arrive as an array or JSON string */
function parseJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Maps a PostgreSQL SeoEnrichment row into EnrichedVideoData */
function mapDbRowToEnriched(row: Record<string, unknown>): EnrichedVideoData {
  const generatedAt =
    row.generatedAt instanceof Date
      ? row.generatedAt.toISOString()
      : typeof row.generatedAt === "string"
        ? row.generatedAt
        : new Date().toISOString();

  return {
    video_id: row.videoId as string,
    source_hash: (row.sourceHash as string) || "",
    seo_title: (row.seoTitle as string) || "",
    meta_description: (row.metaDescription as string) || "",
    summary: (row.summary as string) || "",
    highlights: parseJsonArray<string>(row.highlights),
    tags: parseJsonArray<string>(row.tags),
    faq: parseJsonArray<EnrichedFaqItem>(row.faq),
    status: (row.status as EnrichedVideoData["status"]) || "pending",
    model: (row.model as string) || "unknown",
    generated_at: generatedAt,
    attempts: Number(row.attempts) || 1,
    ...(row.rejectionReason ? { rejection_reason: row.rejectionReason as string } : {}),
  };
}

/**
 * Loads all 'enriched' records from Neon once per hour into shared RAM cache.
 * Eliminates thousands of per-watch-page SeoEnrichment queries so un-enriched
 * videos do 0 Neon queries and compute can scale-to-zero cleanly.
 */
async function getDbEnrichedMap(): Promise<Map<string, EnrichedVideoData> | null> {
  if (!process.env.DATABASE_URL) return null;

  const now = Date.now();
  const cached = globalForEnrichment.seoDbEnrichedMap;
  const loadedAt = globalForEnrichment.seoDbEnrichedLoadedAt ?? 0;

  if (cached && now - loadedAt < DB_ENRICHED_MAP_TTL_MS) {
    return cached;
  }

  // During short DB backoff after failure, serve stale map if available
  const failedAt = globalForEnrichment.seoDbEnrichedFailedAt ?? 0;
  if (now - failedAt < DB_FAILURE_BACKOFF_MS) {
    return cached ?? null;
  }

  if (globalForEnrichment.seoDbEnrichedInFlight) {
    return globalForEnrichment.seoDbEnrichedInFlight;
  }

  const work = (async () => {
    try {
      const rows = await sql`
        SELECT "videoId", "sourceHash", "seoTitle", "metaDescription", summary,
               highlights, tags, faq, status, model, "generatedAt", attempts, "rejectionReason"
        FROM "SeoEnrichment"
        WHERE status = 'enriched'
      `;
      const map = new Map<string, EnrichedVideoData>();
      for (const row of rows) {
        const mapped = mapDbRowToEnriched(row as Record<string, unknown>);
        map.set(mapped.video_id, mapped);
      }
      globalForEnrichment.seoDbEnrichedMap = map;
      globalForEnrichment.seoDbEnrichedLoadedAt = Date.now();
      globalForEnrichment.seoDbEnrichedFailedAt = 0;
      return map;
    } catch {
      globalForEnrichment.seoDbEnrichedFailedAt = Date.now();
      return globalForEnrichment.seoDbEnrichedMap ?? null;
    } finally {
      globalForEnrichment.seoDbEnrichedInFlight = null;
    }
  })();

  globalForEnrichment.seoDbEnrichedInFlight = work;
  return work;
}

/**
 * Retrieves enriched data for a given video ID.
 * Priority: Cached Neon PostgreSQL map (1h TTL) -> local JSON store.
 * Basic DB descriptions (Video.aiDescription) are handled directly as fallback by the watch page.
 */
export async function getEnrichedVideo(videoId: string): Promise<EnrichedVideoData | null> {
  // 1. Check RAM-cached Neon SeoEnrichment map first (0 Neon queries when warm)
  const dbMap = await getDbEnrichedMap();
  if (dbMap?.has(videoId)) {
    return dbMap.get(videoId)!;
  }

  // 2. Fallback to local JSON store (bundled baseline / offline fallback)
  const store = ensureStoreExists();
  if (store[videoId] && store[videoId].status === "enriched") {
    return store[videoId];
  }

  return null;
}

/** Upserts a single EnrichedVideoData record into Neon PostgreSQL */
async function upsertEnrichedRecordToDb(record: EnrichedVideoData): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;

  try {
    const generatedAtIso =
      record.generated_at && !isNaN(Date.parse(record.generated_at))
        ? new Date(record.generated_at).toISOString()
        : new Date().toISOString();

    await sql`
      INSERT INTO "SeoEnrichment" (
        "videoId", "sourceHash", "seoTitle", "metaDescription", summary,
        highlights, tags, faq, status, model, "generatedAt", attempts,
        "rejectionReason", "updatedAt"
      ) VALUES (
        ${record.video_id},
        ${record.source_hash},
        ${record.seo_title},
        ${record.meta_description},
        ${record.summary},
        ${sql.json(record.highlights as unknown as Parameters<typeof sql.json>[0])},
        ${sql.json(record.tags as unknown as Parameters<typeof sql.json>[0])},
        ${sql.json(record.faq as unknown as Parameters<typeof sql.json>[0])},
        ${record.status},
        ${record.model},
        ${generatedAtIso}::timestamp,
        ${record.attempts},
        ${record.rejection_reason ?? null},
        NOW()
      )
      ON CONFLICT ("videoId") DO UPDATE SET
        "sourceHash" = EXCLUDED."sourceHash",
        "seoTitle" = EXCLUDED."seoTitle",
        "metaDescription" = EXCLUDED."metaDescription",
        summary = EXCLUDED.summary,
        highlights = EXCLUDED.highlights,
        tags = EXCLUDED.tags,
        faq = EXCLUDED.faq,
        status = EXCLUDED.status,
        model = EXCLUDED.model,
        "generatedAt" = EXCLUDED."generatedAt",
        attempts = EXCLUDED.attempts,
        "rejectionReason" = EXCLUDED."rejectionReason",
        "updatedAt" = NOW()
    `;
  } catch (err) {
    console.warn("[enrichment-store] Failed to sync SeoEnrichment to DB:", (err as Error).message);
    return false;
  }

  // Keep RAM enrichment map synchronized immediately on upsert
  if (globalForEnrichment.seoDbEnrichedMap) {
    if (record.status === "enriched") {
      globalForEnrichment.seoDbEnrichedMap.set(record.video_id, record);
    } else {
      globalForEnrichment.seoDbEnrichedMap.delete(record.video_id);
    }
  }

  // Keep legacy Video.aiDescription synced if video already exists in Video table
  if (record.status === "enriched") {
    try {
      await sql`
        UPDATE "Video"
        SET "aiDescription" = ${record.summary}
        WHERE id = ${record.video_id}
      `;
    } catch {
      // Non-fatal if Video table does not have this ID yet
    }
  }

  return true;
}

/** Saves an enriched video record to Neon PostgreSQL (primary) and local JSON store */
export async function saveEnrichedVideo(record: EnrichedVideoData): Promise<void> {
  // 1. Persist to local JSON store (non-fatal if running in read-only environment)
  const store = ensureStoreExists();
  store[record.video_id] = record;
  memoryStoreCache = store;
  memoryStoreLoadedAt = Date.now();

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    console.warn("[enrichment-store] Could not write to local JSON store:", err);
  }

  // 2. Persist full structured enrichment to Neon PostgreSQL
  await upsertEnrichedRecordToDb(record);
}

/**
 * Backfills any records present in local data/seo-enrichment.json that do not yet
 * exist in Neon PostgreSQL SeoEnrichment table. No-ops cleanly once in sync.
 */
export async function syncLocalStoreToDb(): Promise<{ synced: number; skipped: number }> {
  if (!process.env.DATABASE_URL) return { synced: 0, skipped: 0 };

  const store = ensureStoreExists();
  const records = Object.values(store);
  if (records.length === 0) return { synced: 0, skipped: 0 };

  let existingIds = new Set<string>();
  try {
    const rows = await sql`SELECT "videoId" FROM "SeoEnrichment"`;
    existingIds = new Set(rows.map((r) => r.videoId as string));
  } catch (err) {
    console.warn("[enrichment-store] Skipping backfill, DB query failed:", (err as Error).message);
    return { synced: 0, skipped: records.length };
  }

  const missing = records.filter((r) => !existingIds.has(r.video_id));
  let synced = 0;
  for (const record of missing) {
    if (await upsertEnrichedRecordToDb(record)) {
      synced++;
    }
  }

  return { synced, skipped: records.length - synced };
}

/** Retrieves all records from the local store */
export function getAllEnrichedVideos(): Record<string, EnrichedVideoData> {
  return ensureStoreExists();
}

/** Retrieves all records merged from local JSON store and Neon PostgreSQL (DB wins) */
export async function getAllEnrichedVideosAsync(): Promise<Record<string, EnrichedVideoData>> {
  const merged: Record<string, EnrichedVideoData> = { ...ensureStoreExists() };

  if (process.env.DATABASE_URL) {
    try {
      const rows = await sql`
        SELECT "videoId", "sourceHash", "seoTitle", "metaDescription", summary,
               highlights, tags, faq, status, model, "generatedAt", attempts, "rejectionReason"
        FROM "SeoEnrichment"
      `;
      for (const row of rows) {
        const mapped = mapDbRowToEnriched(row as Record<string, unknown>);
        merged[mapped.video_id] = mapped;
      }
    } catch {
      // Fallback safely to local store if table not created or DB unavailable
    }
  }

  return merged;
}

/** Computes summary statistics from an enrichment map */
export function computeEnrichmentStats(store: Record<string, EnrichedVideoData>) {
  const values = Object.values(store);

  return {
    total: values.length,
    enriched: values.filter((v) => v.status === "enriched").length,
    pending: values.filter((v) => v.status === "pending").length,
    rejected: values.filter((v) => v.status === "rejected").length,
    failed: values.filter((v) => v.status === "failed").length,
  };
}

/** Summarizes statistics for indexing gates and progress reporting (local store) */
export function getEnrichmentStats() {
  return computeEnrichmentStats(ensureStoreExists());
}

/** Summarizes statistics across local store + Neon PostgreSQL */
export async function getEnrichmentStatsAsync() {
  return computeEnrichmentStats(await getAllEnrichedVideosAsync());
}

/** Gracefully closes DB pool for standalone CLI scripts so Node exits immediately */
export async function closeEnrichmentDb(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  try {
    await sql.end({ timeout: 5 });
  } catch {
    // Ignore close errors
  }
}
