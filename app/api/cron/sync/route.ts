/**
 * app/api/cron/sync/route.ts
 *
 * Lightweight sync & maintenance endpoint called by cron-job.org.
 * Replaces the need for a running BullMQ/Redis/Docker worker on a dedicated server.
 *
 * EXECUTION MODEL (cron-job.org 30s timeout safe):
 * - By default, validates auth and immediately returns HTTP 200 `{ started: true, background: true }`
 *   while running disk maintenance + sync/cleanup asynchronously in Node.js memory with a per-mode lock.
 * - Pass `?wait=true` for synchronous execution and full result JSON (used by manual CLI/tests).
 * - Uses batched SQL queries (UNNEST for tags, ANY for existing check) instead of N+1 round-trips.
 *
 * SECURITY:
 * - Supports POST (recommended) or GET with Authorization: Bearer <CRON_SECRET> or ?secret=<CRON_SECRET>.
 * - Uses CRON_SECRET env var (or falls back to WEBHOOK_SECRET if not set).
 *
 * SETUP AT CRON-JOB.ORG:
 * 1. Sync job: https://www.lusthub.web.id/api/cron/sync (every 15 minutes)
 * 2. Daily cleanup: https://www.lusthub.web.id/api/cron/sync?cleanup=true (daily, e.g. 00:00 / 12:00)
 * 3. Header: Authorization: Bearer <your-CRON_SECRET-value>
 */

import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { EpornerAPI, invalidateVideoCaches } from "@/lib/api/eporner";
import { GeminiAPI } from "@/lib/api/gemini";
import { TIER1_CATEGORIES } from "@/lib/category-config";
import { runDiskCacheMaintenance } from "@/lib/cache-cleanup";
import { runRemovedVideosCleanup } from "@/lib/video/cleanup";
import { invalidateSitemapCache } from "@/lib/sitemap";

export const dynamic = "force-dynamic";



// Time guard when callers wait synchronously (?wait=true) vs background cron execution.
const SYNC_WAIT_STOP_MS = 25_000;
const BACKGROUND_STOP_MS = 60_000;
const LOCK_STALE_MS = 10 * 60 * 1000;

// Max new videos to classify+insert per cron run.
// Each new video needs ~2-3s for Gemini + DB insert.
const MAX_NEW_PER_RUN = 2;

type SyncMode = "sync" | "cleanup";

const KNOWN_VIDEO_IDS_MAX = 500;

const globalForCron = globalThis as unknown as {
  cronRunningJobs?: Map<SyncMode, number>;
  cronKnownVideoIds?: Set<string>;
};
const runningJobs = globalForCron.cronRunningJobs ?? new Map<SyncMode, number>();
globalForCron.cronRunningJobs = runningJobs;

const knownVideoIds = globalForCron.cronKnownVideoIds ?? new Set<string>();
globalForCron.cronKnownVideoIds = knownVideoIds;

function rememberKnownVideoId(id: string) {
  if (knownVideoIds.has(id)) return;
  if (knownVideoIds.size >= KNOWN_VIDEO_IDS_MAX) {
    const oldest = knownVideoIds.values().next().value;
    if (oldest !== undefined) knownVideoIds.delete(oldest);
  }
  knownVideoIds.add(id);
}

interface SyncResult {
  fetchedFromEporner: number;
  newVideosFound: number;
  videosAdded: number;
  videosSkipped: number;
  pendingNewVideos: number;
  removedVideosDeactivated: number;
  trashFilesDeleted: number;
  trashFreedBytes: number;
  staleCacheDeleted: number;
  staleCacheFreedBytes: number;
  fetchCacheSizeBytes: number;
  durationMs: number;
  message: string;
}

type SyncOutcome =
  | { ok: true; status: 200; result: SyncResult }
  | { ok: false; dbPaused: boolean; status: 200 | 500; error: string; result: SyncResult };

function verifySecret(provided: string, expected: string): boolean {
  if (provided.length !== expected.length) return false;
  let result = 0;
  for (let i = 0; i < provided.length; i++) {
    result |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return result === 0;
}

export async function GET(request: NextRequest) {
  return handleSync(request);
}

export async function POST(request: NextRequest) {
  return handleSync(request);
}

async function handleSync(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET || process.env.WEBHOOK_SECRET;
  if (!cronSecret) {
    console.error("[CronSync] CRON_SECRET or WEBHOOK_SECRET is not configured.");
    return NextResponse.json({ error: "Server misconfiguration." }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const authHeader = request.headers.get("Authorization");
  const querySecret = searchParams.get("secret") || searchParams.get("key");
  const providedSecret = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : (authHeader || querySecret || "");

  if (!verifySecret(providedSecret, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const startTime = Date.now();
  const doCleanup = searchParams.get("cleanup") === "true";
  const waitForCompletion = searchParams.get("wait") === "true";
  const mode: SyncMode = doCleanup ? "cleanup" : "sync";

  const activeStartedAt = runningJobs.get(mode);
  if (activeStartedAt !== undefined && Date.now() - activeStartedAt < LOCK_STALE_MS) {
    return NextResponse.json({
      success: true,
      started: false,
      alreadyRunning: true,
      mode,
      background: !waitForCompletion,
      runningForMs: Date.now() - activeStartedAt,
      message: `${mode} job is already running in background.`,
    });
  }

  runningJobs.set(mode, startTime);
  const timeBudgetMs = waitForCompletion ? SYNC_WAIT_STOP_MS : BACKGROUND_STOP_MS;
  const runPromise = executeSyncJob(doCleanup, startTime, timeBudgetMs).finally(() => {
    runningJobs.delete(mode);
  });

  if (!waitForCompletion) {
    // Return immediately so external schedulers (e.g., cron-job.org 30s limit) never time out
    // while streaming the ~158MB removed feed or syncing against slow upstream APIs.
    void runPromise;
    return NextResponse.json({
      success: true,
      started: true,
      mode,
      background: true,
      message: doCleanup
        ? "Daily disk & removed-video cleanup started in background."
        : "Video sync & disk cache maintenance started in background.",
    });
  }

  const outcome = await runPromise;
  if (outcome.ok) {
    return NextResponse.json({ success: true, ...outcome.result });
  }
  return NextResponse.json(
    {
      success: false,
      ...(outcome.dbPaused ? { dbPaused: true } : {}),
      error: outcome.error,
      ...outcome.result,
    },
    { status: outcome.status }
  );
}

async function executeSyncJob(
  doCleanup: boolean,
  startTime: number,
  timeBudgetMs: number
): Promise<SyncOutcome> {
  const result: SyncResult = {
    fetchedFromEporner: 0,
    newVideosFound: 0,
    videosAdded: 0,
    videosSkipped: 0,
    pendingNewVideos: 0,
    removedVideosDeactivated: 0,
    trashFilesDeleted: 0,
    trashFreedBytes: 0,
    staleCacheDeleted: 0,
    staleCacheFreedBytes: 0,
    fetchCacheSizeBytes: 0,
    durationMs: 0,
    message: "",
  };

  try {
    // ── 0. Disk Cache Maintenance (Always runs first, even if DB is paused) ─
    const maintenance = await runDiskCacheMaintenance({ force: true });
    result.trashFilesDeleted = maintenance.trashFilesDeleted;
    result.trashFreedBytes = maintenance.trashFreedBytes;
    result.staleCacheDeleted = maintenance.staleCacheDeleted;
    result.staleCacheFreedBytes = maintenance.staleCacheFreedBytes;
    result.fetchCacheSizeBytes = Math.max(
      0,
      maintenance.fetchCacheSizeBytes - maintenance.staleCacheFreedBytes
    );

    // ── 1. Daily Maintenance (only when ?cleanup=true) ───────────────────────
    if (doCleanup) {
      console.log("[CronSync] Running streaming daily cleanup...");
      const cleanupRes = await runRemovedVideosCleanup();
      result.removedVideosDeactivated = cleanupRes.removedVideosDeactivated;
      if (cleanupRes.removedIds) {
        for (const removedId of cleanupRes.removedIds) {
          knownVideoIds.delete(removedId);
        }
      }

      // ── Disk Usage Monitoring ────────────────────────────────────────────────
      console.log(
        `[CronSync] Disk usage — fetch-cache remaining: ${(result.fetchCacheSizeBytes / 1024 / 1024).toFixed(1)} MB`
      );
    }

    // ── 2. New Video Sync ────────────────────────────────────────────────────
    // SKIPPED when doCleanup=true: daily cleanup streams the removed feed.
    // The regular cron (no ?cleanup) handles all video syncing.
    if (!doCleanup && Date.now() - startTime < timeBudgetMs - 2000) {
      // We set per_page: 5 to perfectly balance the 15 RPM and 500 RPD limits of Gemini Flash Lite
      const latestRes = await EpornerAPI.search(
        { order: "latest", per_page: 5 },
        { allowDbFallback: false }
      );
      const videos = latestRes?.videos ?? [];
      result.fetchedFromEporner = videos.length;

      if (videos.length > 0) {
        // Avoid waking Neon compute if all fetched Eporner IDs were already processed in RAM
        const ids = videos.map((v) => v.id);
        const uncheckedIds = ids.filter((id) => !knownVideoIds.has(id));
        const existingIds = new Set<string>(ids.filter((id) => knownVideoIds.has(id)));

        if (uncheckedIds.length > 0) {
          const existing = await sql`
            SELECT id FROM "Video" WHERE id = ANY(${uncheckedIds})
          `;
          for (const row of existing) {
            const existingId = row.id as string;
            existingIds.add(existingId);
            rememberKnownVideoId(existingId);
          }
        }

        const newVideos = videos.filter((v) => !existingIds.has(v.id));
        result.newVideosFound = newVideos.length;
        result.videosSkipped = videos.length - newVideos.length;

        const toProcess = newVideos.slice(0, MAX_NEW_PER_RUN);
        result.pendingNewVideos = Math.max(0, newVideos.length - toProcess.length);

        for (const v of toProcess) {
          if (Date.now() - startTime > timeBudgetMs) {
            console.warn("[CronSync] Hard time stop reached. Remaining videos will be processed on next run.");
            break;
          }

          try {
            // Strict pre-filter to drop gay/trans content immediately
            const lowerTitle = v.title.toLowerCase();
            const lowerKeywords = v.keywords.toLowerCase();
            const blacklistRegex = /\b(gay|shemale|tranny|ladyboy|trans|homo)\b/i;

            if (blacklistRegex.test(lowerTitle) || blacklistRegex.test(lowerKeywords)) {
              rememberKnownVideoId(v.id);
              console.log(`[CronSync] Skipped blacklisted video (gay/trans filter): ${v.id} - "${v.title}"`);
              continue; // Skip this video completely, do not insert into DB
            }

            const aiResult = await GeminiAPI.classifyVideo(v.title, v.keywords);

            const rawTags =
              aiResult.cleanedTags.length > 0
                ? aiResult.cleanedTags
                : v.keywords.split(",");
            const finalTags = Array.from(
              new Set(rawTags.map((t) => t.trim().toLowerCase()))
            ).filter(Boolean);

            const aiCatName = aiResult.category.trim().toLowerCase();
            const matchedCat = TIER1_CATEGORIES.find(
              (c) => c.name.toLowerCase() === aiCatName
            );

            // Insert video
            await sql`
              INSERT INTO "Video" (
                id, title, "lengthMin", "lengthSec", "addedAt", rate, views,
                "defaultThumb", thumbs, keywords, "embedUrl", status,
                "aiScoreTrending", "aiScoreEngagement", "aiScoreSpam", "aiSpamFlag", "aiDescription", "updatedAt"
              ) VALUES (
                ${v.id}, ${v.title}, ${v.length_min}, ${v.length_sec},
                ${v.added ? new Date(v.added).toISOString() : null},
                ${v.rate}, ${v.views},
                ${sql.json(v.default_thumb as unknown as Parameters<typeof sql.json>[0])}, ${sql.json(v.thumbs as unknown as Parameters<typeof sql.json>[0])},
                ${v.keywords}, ${v.embed ? v.embed.replace(/\/+$/, "") : `https://www.eporner.com/embed/${v.id}`},
                ${aiResult.isSpam ? "DRAFT" : "ACTIVE"},
                ${aiResult.scores.trending}, ${aiResult.scores.engagement},
                ${aiResult.scores.spam}, ${aiResult.isSpam}, ${aiResult.seoDescription}, NOW()
              )
              ON CONFLICT (id) DO NOTHING
            `;

            // Batch upsert tags (avoids 20-40 sequential SQL round-trips per video)
            if (finalTags.length > 0) {
              const tagIds = finalTags.map(() => crypto.randomUUID());
              const insertedTags = await sql`
                INSERT INTO "Tag" (id, name)
                SELECT tid, tname
                FROM UNNEST(${tagIds}::text[], ${finalTags}::text[]) AS t(tid, tname)
                ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
                RETURNING id
              `;
              const resolvedTagIds = insertedTags.map((t) => t.id as string);
              if (resolvedTagIds.length > 0) {
                await sql`
                  INSERT INTO "VideoTag" ("videoId", "tagId")
                  SELECT ${v.id}, tid
                  FROM UNNEST(${resolvedTagIds}::text[]) AS vt(tid)
                  ON CONFLICT DO NOTHING
                `;
              }
            }

            // Insert category
            if (matchedCat) {
              const catId = crypto.randomUUID();
              const [cat] = await sql`
                INSERT INTO "Category" (id, name) VALUES (${catId}, ${matchedCat.name})
                ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
                RETURNING id
              `;
              if (cat) {
                await sql`
                  INSERT INTO "VideoCategory" ("videoId", "categoryId") VALUES (${v.id}, ${cat.id})
                  ON CONFLICT DO NOTHING
                `;
              }
            }

            rememberKnownVideoId(v.id);
            invalidateVideoCaches(v.id);
            result.videosAdded++;
            console.log(`[CronSync] Added video: ${v.id} — "${v.title}"`);
          } catch (videoErr) {
            const err = videoErr as Error;
            console.error(`[CronSync] Failed to process video ${v.id}: ${err.message}`);
          }
        }
        if (result.videosAdded > 0) {
          invalidateSitemapCache();
        }
      }
    }

    result.durationMs = Date.now() - startTime;
    result.message = doCleanup
      ? `Daily cleanup finished (${result.removedVideosDeactivated} deactivated).`
      : result.pendingNewVideos > 0
        ? `${result.pendingNewVideos} more new videos pending — will be processed on the next cron run.`
        : result.videosAdded > 0
          ? `${result.videosAdded} new video(s) added successfully.`
          : "DB is up to date. No new videos found.";

    console.log("[CronSync] Completed:", result);
    return { ok: true, status: 200, result };
  } catch (err) {
    const error = err as Error & { code?: string };
    result.durationMs = Date.now() - startTime;

    const isQuotaOrPaused =
      error.code === "53000" ||
      /exceeded.*quota|endpoint is disabled|project is paused|upgrade your plan/i.test(error.message);

    if (isQuotaOrPaused) {
      // Return HTTP 200 so cron-job.org does NOT auto-disable this cronjob while
      // Neon Free Tier compute hours are exhausted — disk cache cleanup already succeeded.
      console.warn("[CronSync] Neon DB paused/over-quota; disk cache cleanup succeeded:", error.message);
      return { ok: false, dbPaused: true, status: 200, error: error.message, result };
    }

    const isMissingTable = error.code === "42P01" || /relation.*does not exist/i.test(error.message);
    const friendlyError = isMissingTable
      ? "Database tables not initialized (relation does not exist - 42P01). Run 'npm run db:push' on your server/local to push Prisma schema to Neon."
      : error.message;

    console.error("[CronSync] Fatal error:", friendlyError);
    return { ok: false, dbPaused: false, status: 500, error: friendlyError, result };
  }
}
