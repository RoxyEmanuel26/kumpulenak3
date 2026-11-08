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

/** Computes a stable SHA-256 hash of the input metadata to detect upstream changes */
export function computeSourceHash(title: string, keywords?: string): string {
  const content = `${title.trim()}|${(keywords || "").trim()}`;
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
}

/** Ensures the data directory and JSON store exist */
function ensureStoreExists(): Record<string, EnrichedVideoData> {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(STORE_PATH)) {
      fs.writeFileSync(STORE_PATH, JSON.stringify({}, null, 2), "utf8");
      return {};
    }
    const raw = fs.readFileSync(STORE_PATH, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.warn("[enrichment-store] Failed to read JSON store, returning empty cache:", err);
    return {};
  }
}

/** Retrieves enriched data for a given video ID from local store or database */
export async function getEnrichedVideo(videoId: string): Promise<EnrichedVideoData | null> {
  // 1. Try in-memory / local JSON store first (zero latency)
  const store = ensureStoreExists();
  if (store[videoId] && store[videoId].status === "enriched") {
    return store[videoId];
  }

  // 2. Try PostgreSQL database if available
  try {
    const rows = await sql`
      SELECT id, "aiDescription"
      FROM "Video"
      WHERE id = ${videoId} AND "aiDescription" IS NOT NULL
      LIMIT 1
    `;
    if (rows && rows.length > 0 && rows[0].aiDescription) {
      // Return synthetic enriched object if DB has legacy aiDescription
      const aiDesc = rows[0].aiDescription as string;
      return {
        video_id: videoId,
        source_hash: "db_legacy",
        seo_title: "",
        meta_description: aiDesc.slice(0, 155),
        summary: aiDesc,
        highlights: [],
        tags: [],
        faq: [],
        status: "enriched",
        model: "db-persisted",
        generated_at: new Date().toISOString(),
        attempts: 1,
      };
    }
  } catch {
    // Database unreachable; fallback smoothly to JSON store
  }

  return store[videoId] || null;
}

/** Saves an enriched video record to local JSON store and attempts DB sync */
export async function saveEnrichedVideo(record: EnrichedVideoData): Promise<void> {
  const store = ensureStoreExists();
  store[record.video_id] = record;

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    console.error("[enrichment-store] Failed to write to JSON store:", err);
  }

  // Attempt database sync if connected and status is enriched
  if (record.status === "enriched") {
    try {
      await sql`
        UPDATE "Video"
        SET "aiDescription" = ${record.summary}
        WHERE id = ${record.video_id}
      `;
    } catch {
      // Non-fatal if database is currently unreachable
    }
  }
}

/** Retrieves all records from the local store */
export function getAllEnrichedVideos(): Record<string, EnrichedVideoData> {
  return ensureStoreExists();
}

/** Summarizes statistics for indexing gates and progress reporting */
export function getEnrichmentStats() {
  const store = ensureStoreExists();
  const values = Object.values(store);

  return {
    total: values.length,
    enriched: values.filter((v) => v.status === "enriched").length,
    pending: values.filter((v) => v.status === "pending").length,
    rejected: values.filter((v) => v.status === "rejected").length,
    failed: values.filter((v) => v.status === "failed").length,
  };
}
