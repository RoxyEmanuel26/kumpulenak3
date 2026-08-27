/**
 * app/api/cron/sync/route.ts
 *
 * Lightweight sync endpoint designed to be called by cron-job.org every 15 minutes.
 * Replaces the need for a running BullMQ/Redis/Docker worker on a dedicated server.
 *
 * DESIGN CONSTRAINTS (Cloudflare Edge = 30s CPU time):
 * - Uses a single batch DB query instead of N individual queries (N+1 fix)
 * - Processes MAX_NEW_PER_RUN new videos per call to stay under time limit
 * - Hard time-guard at 25s to ensure clean response
 * - Eporner API calls are cached via Next.js fetch cache (5 min) to reduce upstream hits
 *
 * SECURITY:
 * - POST only (no GET) to prevent accidental browser triggers
 * - Authenticated via Authorization: Bearer <CRON_SECRET> header
 * - Uses CRON_SECRET env var (or falls back to WEBHOOK_SECRET if not set)
 *
 * SETUP AT CRON-JOB.ORG:
 * 1. URL: https://www.lusthub.web.id/api/cron/sync
 * 2. Method: POST
 * 3. Header: Authorization: Bearer <your-CRON_SECRET-value>
 * 4. Schedule: Every 15 minutes  ← changed from 30 min
 * 5. Timeout: 30 seconds (cron-job.org side)
 *
 * For daily removed-video cleanup, use a separate cron job:
 * 1. URL: https://www.lusthub.web.id/api/cron/sync?cleanup=true
 * 2. Schedule: Once daily (e.g. 02:00 UTC)
 */

import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { EpornerAPI } from "@/lib/api/eporner";
import { GeminiAPI } from "@/lib/api/gemini";
import { TIER1_CATEGORIES } from "@/lib/category-config";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * Cleans up leftover `.trash` directories created by Next.js ISR cache atomic
 * file replacement. When Next.js replaces a fetch-cache entry it:
 *   1. Renames the old file to a `*_trashpath_*_trash_*` path
 *   2. Writes new data to the real path
 *   3. Deletes the trash path
 * If the process is killed between steps 2 and 3 (e.g. by Pterodactyl CPU kill),
 * the trash files accumulate and fill up disk.
 *
 * This function removes:
 *   - `<cwd>/.trash/`         — root-level trash folder
 *   - `<cwd>/.next/.trash/`   — .next-level trash folder
 *   - Any `*_trash_*` pattern files directly inside .next/cache/fetch-cache/
 */
/** Shared recursive directory size walker */
function walkDirSize(dir: string): number {
  let size = 0;
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) size += walkDirSize(full);
      else { try { size += fs.statSync(full).size; } catch { /* skip */ } }
    }
  } catch { /* skip */ }
  return size;
}

/**
 * Removes leftover `.trash` directories and `*_trash_*` files created by
 * Next.js ISR atomic cache swaps interrupted by Pterodactyl CPU kills.
 */
async function cleanTrashFiles(): Promise<{ deleted: number; freedBytes: number }> {
  let deleted = 0;
  let freedBytes = 0;
  const cwd = process.cwd();

  const trashDirs = [
    path.join(cwd, ".trash"),
    path.join(cwd, ".next", ".trash"),
    path.join(cwd, ".next", "cache", ".trash"),
  ];

  for (const trashDir of trashDirs) {
    try {
      if (!fs.existsSync(trashDir)) continue;
      const stat = fs.statSync(trashDir);
      if (stat.isDirectory()) {
        freedBytes += walkDirSize(trashDir);
        fs.rmSync(trashDir, { recursive: true, force: true });
        deleted++;
        console.log(`[CronSync] Deleted trash dir: ${trashDir}`);
      }
    } catch (e) {
      console.warn(`[CronSync] Could not clean ${trashDir}:`, (e as Error).message);
    }
  }

  // Sweep fetch-cache for stray *_trash_* / *_trashpath_* files
  const fetchCacheDir = path.join(cwd, ".next", "cache", "fetch-cache");
  try {
    if (fs.existsSync(fetchCacheDir)) {
      for (const name of fs.readdirSync(fetchCacheDir)) {
        if (name.includes("_trash_") || name.includes("_trashpath_")) {
          const full = path.join(fetchCacheDir, name);
          try {
            freedBytes += fs.statSync(full).size;
            fs.rmSync(full, { recursive: true, force: true });
            deleted++;
          } catch { /* ignore */ }
        }
      }
    }
  } catch { /* ignore */ }

  return { deleted, freedBytes };
}

/** 
 * Fetch-cache size limits — tuned for a 3 GB Pterodactyl disk.
 * Normal disk usage: build(~500MB) + node_modules(~700MB) ≈ 1.2GB used baseline.
 * Leaving ~1.8GB free. We cap cache at 1GB → minimum ~800MB always free for OS + logs.
 */
export const FETCH_CACHE_MAX_BYTES  = 1024 * 1024 * 1024;       // 1.0 GB  — trigger threshold
export const FETCH_CACHE_TARGET_BYTES = 800 * 1024 * 1024;       // 0.8 GB  — trim down to this

/**
 * Enforces a strict size limit on the Next.js fetch cache (.next/cache/fetch-cache).
 *
 * Strategy: LRW (Least Recently Written) eviction, ordered by mtime ascending.
 * We use mtime (write time) rather than atime (access time) because Pterodactyl / Docker
 * Linux containers mount filesystems with `relatime` or `noatime` — atime is unreliable.
 * mtime is updated when Next.js refreshes a cache entry (revalidation), so entries with
 * an old mtime are either: (a) expired and stale, or (b) rarely accessed. Both are safe to evict.
 *
 * Guarantees:
 *   - No-op if totalSize ≤ maxSizeBytes              (fast path: just scans, no deletes)
 *   - Deletes oldest-mtime files first until size ≤ targetSizeBytes
 *   - Skips trash files (handled by cleanTrashFiles)
 *   - Never throws — all errors caught and logged
 *   - Warns if even full eviction cannot reach target (disk in critical state)
 *
 * @param maxSizeBytes    Threshold above which eviction begins
 * @param targetSizeBytes Target size to trim down to (must be < maxSizeBytes)
 */
async function enforceFetchCacheSizeLimit(
  maxSizeBytes: number,
  targetSizeBytes: number,
): Promise<{ deleted: number; freedBytes: number; totalSizeBefore: number }> {
  let deleted = 0;
  let freedBytes = 0;
  let totalSizeBefore = 0;
  const cwd = process.cwd();
  const fetchCacheDir = path.join(cwd, ".next", "cache", "fetch-cache");

  // ── Bug Fix #1: Guard against misconfigured limits ─────────────────────────
  if (targetSizeBytes >= maxSizeBytes) {
    console.warn(
      `[CronSync] enforceFetchCacheSizeLimit: targetSizeBytes (${targetSizeBytes}) must be < maxSizeBytes (${maxSizeBytes}). Skipping.`
    );
    return { deleted, freedBytes, totalSizeBefore };
  }

  try {
    if (!fs.existsSync(fetchCacheDir)) return { deleted, freedBytes, totalSizeBefore };

    // ── Scan: Collect all valid files with size + mtime ────────────────────
    const files: { path: string; size: number; mtime: number }[] = [];
    let totalSize = 0;

    for (const name of fs.readdirSync(fetchCacheDir)) {
      // Skip trash files — already handled by cleanTrashFiles()
      if (name.includes("_trash_") || name.includes("_trashpath_")) continue;
      const full = path.join(fetchCacheDir, name);
      try {
        const stat = fs.statSync(full);
        if (stat.isFile()) {
          files.push({ path: full, size: stat.size, mtime: stat.mtimeMs });
          totalSize += stat.size;
        }
      } catch { /* skip missing/locked files */ }
    }

    totalSizeBefore = totalSize;

    // ── Bug Fix #2: Always log current size (monitoring, even if no cleanup) ─
    console.log(
      `[CronSync] fetch-cache scan: ${files.length} files, ${(totalSize / 1024 / 1024).toFixed(1)} MB total.`
    );

    // ── Fast path: under the limit, nothing to do ─────────────────────────
    if (totalSize <= maxSizeBytes) return { deleted, freedBytes, totalSizeBefore };

    // ── Eviction: Sort oldest-mtime first, delete until we hit target ──────
    files.sort((a, b) => a.mtime - b.mtime);

    let currentSize = totalSize;
    for (const file of files) {
      if (currentSize <= targetSizeBytes) break;
      try {
        fs.rmSync(file.path, { force: true });
        // Only count as freed if deletion actually succeeded (no exception)
        freedBytes += file.size;
        currentSize -= file.size;
        deleted++;
      } catch { /* skip locked/in-use files */ }
    }

    if (deleted > 0) {
      console.log(
        `[CronSync] Cache limit exceeded (${(totalSize / 1024 / 1024).toFixed(1)} MB > ` +
        `${(maxSizeBytes / 1024 / 1024).toFixed(0)} MB max). ` +
        `Pruned ${deleted} oldest files, freed ${(freedBytes / 1024 / 1024).toFixed(1)} MB. ` +
        `Remaining: ~${((currentSize) / 1024 / 1024).toFixed(1)} MB.`
      );
    }

    // ── Bug Fix #3: Warn if we couldn't reach the target size ─────────────
    if (currentSize > targetSizeBytes) {
      console.warn(
        `[CronSync] WARNING: fetch-cache still ${(currentSize / 1024 / 1024).toFixed(1)} MB after full eviction. ` +
        `Target was ${(targetSizeBytes / 1024 / 1024).toFixed(0)} MB. ` +
        `Files may have been locked or recreated during cleanup.`
      );
    }

  } catch (e) {
    console.warn("[CronSync] Error enforcing cache limit:", (e as Error).message);
  }

  return { deleted, freedBytes, totalSizeBefore };
}

/**
 * Returns the byte size of key cache directories for disk monitoring.
 * Runs only on directories likely to grow — avoids scanning entire .next/.
 */
function getCacheDiskUsage(): { fetchCacheBytes: number; trashBytes: number } {
  const cwd = process.cwd();
  const fetchCacheDir = path.join(cwd, ".next", "cache", "fetch-cache");
  const trashDir = path.join(cwd, ".trash");
  return {
    fetchCacheBytes: fs.existsSync(fetchCacheDir) ? walkDirSize(fetchCacheDir) : 0,
    trashBytes: fs.existsSync(trashDir) ? walkDirSize(trashDir) : 0,
  };
}



// Hard stop at 25s to leave buffer for response (Cloudflare edge allows 30s CPU)
const HARD_STOP_MS = 25_000;

// Max new videos to classify+insert per cron run.
// Each new video needs ~2-3s for Gemini + DB insert.
const MAX_NEW_PER_RUN = 2;

function verifySecret(provided: string, expected: string): boolean {
  if (provided.length !== expected.length) return false;
  let result = 0;
  for (let i = 0; i < provided.length; i++) {
    result |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return result === 0;
}

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET || process.env.WEBHOOK_SECRET;
  if (!cronSecret) {
    console.error("[CronSync] CRON_SECRET or WEBHOOK_SECRET is not configured.");
    return NextResponse.json({ error: "Server misconfiguration." }, { status: 500 });
  }

  const authHeader = request.headers.get("Authorization");
  const providedSecret = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : (authHeader ?? "");

  if (!verifySecret(providedSecret, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  const doCleanup = searchParams.get("cleanup") === "true";

  
  const result = {
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
    // ── 0. Trash Cleanup (Runs every 30 min on every cron execution) ─────────
    // Instantly removes any .trash/ dirs or *_trash_* files left behind by Next.js
    // ISR atomic swaps if the process was killed or interrupted.
    const trashResult = await cleanTrashFiles();
    result.trashFilesDeleted = trashResult.deleted;
    result.trashFreedBytes = trashResult.freedBytes;
    if (trashResult.deleted > 0) {
      console.log(
        `[CronSync] Trash cleanup: removed ${trashResult.deleted} item(s), freed ${(trashResult.freedBytes / 1024 / 1024).toFixed(2)} MB`
      );
    }

    // ── 0.5 Fetch Cache Size Limiter (Runs every 30 min) ─────────────────────
    // LRW eviction: if fetch-cache > FETCH_CACHE_MAX_BYTES, trim oldest files to FETCH_CACHE_TARGET_BYTES.
    // Constants defined at module level (see FETCH_CACHE_MAX_BYTES / FETCH_CACHE_TARGET_BYTES).
    const cacheResult = await enforceFetchCacheSizeLimit(FETCH_CACHE_MAX_BYTES, FETCH_CACHE_TARGET_BYTES);
    result.staleCacheDeleted = cacheResult.deleted;
    result.staleCacheFreedBytes = cacheResult.freedBytes;
    result.fetchCacheSizeBytes = cacheResult.totalSizeBefore; // Always report current size

    // ── 1. Daily Maintenance (only when ?cleanup=true) ───────────────────────
    if (doCleanup) {
      console.log("[CronSync] Running daily cleanup...");

      const [lastSyncSetting] = await sql`
        SELECT value FROM "Settings" WHERE key = 'last_removed_sync_at'
      `;
      const lastSync = lastSyncSetting
        ? new Date(JSON.parse(lastSyncSetting.value as string))
        : null;
      const now = new Date();
      const isDue =
        !lastSync ||
        now.getTime() - lastSync.getTime() > 20 * 60 * 60 * 1000; // 20h guard

      if (isDue) {
        const removedText = await EpornerAPI.getRemoved();
        const activeVideos = await sql`
          SELECT id FROM "Video" WHERE status = 'ACTIVE'
        `;

        if (activeVideos.length > 0) {
          // Parse the massive text file ONCE into an O(1) Set lookup to prevent event loop freeze
          const removedIdsSet = new Set(
            removedText.split(/[\r\n,]+/).map((s) => s.trim()).filter(Boolean)
          );

          const removedIds = activeVideos
            .map((v) => v.id as string)
            .filter((id) => removedIdsSet.has(id));

          if (removedIds.length > 0) {
            const updated = await sql`
              UPDATE "Video" SET status = 'REMOVED', "updatedAt" = NOW()
              WHERE id = ANY(${removedIds})
            `;
            result.removedVideosDeactivated = (updated as unknown as { rowCount?: number }).rowCount ?? removedIds.length;
          }
        }

        await sql`
          INSERT INTO "Settings" (key, value, "updatedAt")
          VALUES ('last_removed_sync_at', ${JSON.stringify(now.toISOString())}, NOW())
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, "updatedAt" = NOW()
        `;
      }

      // ── Disk Usage Monitoring ────────────────────────────────────────────────
      const diskUsage = getCacheDiskUsage();
      result.fetchCacheSizeBytes = diskUsage.fetchCacheBytes;
      console.log(
        `[CronSync] Disk usage — fetch-cache: ${(diskUsage.fetchCacheBytes / 1024 / 1024).toFixed(1)} MB, trash: ${(diskUsage.trashBytes / 1024 / 1024).toFixed(1)} MB`
      );
    }

    // ── 2. New Video Sync ────────────────────────────────────────────────────
    // SKIPPED when doCleanup=true: daily cleanup cron already takes 15-25s for
    // removed-video sync. Adding video classification here would cause timeout.
    // The regular 15-min cron (no ?cleanup) handles all video syncing.
    if (!doCleanup && Date.now() - startTime < HARD_STOP_MS - 2000) {
      // Fetch latest 50 videos from Eporner (cached 5 min by Next.js fetch layer)
      const latestRes = await EpornerAPI.search({ order: "latest", per_page: 50 });
      const videos = latestRes?.videos ?? [];
      result.fetchedFromEporner = videos.length;

      if (videos.length > 0) {
        // N+1 FIX: Single batch query instead of N individual queries.
        const ids = videos.map((v) => v.id);
        const existing = await sql`
          SELECT id FROM "Video" WHERE id = ANY(${ids})
        `;
        const existingIds = new Set(existing.map((v) => v.id as string));

        const newVideos = videos.filter((v) => !existingIds.has(v.id));
        result.newVideosFound = newVideos.length;
        result.videosSkipped = videos.length - newVideos.length;

        const toProcess = newVideos.slice(0, MAX_NEW_PER_RUN);
        result.pendingNewVideos = Math.max(0, newVideos.length - toProcess.length);

        for (const v of toProcess) {
          if (Date.now() - startTime > HARD_STOP_MS) {
            console.warn("[CronSync] Hard time stop reached. Remaining videos will be processed on next run.");
            break;
          }

          try {
            // Strict pre-filter to drop gay/trans content immediately
            const lowerTitle = v.title.toLowerCase();
            const lowerKeywords = v.keywords.toLowerCase();
            const blacklistRegex = /\b(gay|shemale|tranny|ladyboy|trans|homo)\b/i;
            
            if (blacklistRegex.test(lowerTitle) || blacklistRegex.test(lowerKeywords)) {
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
                ${JSON.stringify(v.default_thumb)}, ${JSON.stringify(v.thumbs)},
                ${v.keywords}, ${v.embed},
                ${aiResult.isSpam ? "DRAFT" : "ACTIVE"},
                ${aiResult.scores.trending}, ${aiResult.scores.engagement},
                ${aiResult.scores.spam}, ${aiResult.isSpam}, ${aiResult.seoDescription}, NOW()
              )
              ON CONFLICT (id) DO NOTHING
            `;

            // Insert tags
            for (const tagName of finalTags) {
              const tagId = crypto.randomUUID();
              const [tag] = await sql`
                INSERT INTO "Tag" (id, name) VALUES (${tagId}, ${tagName})
                ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
                RETURNING id
              `;
              if (tag) {
                await sql`
                  INSERT INTO "VideoTag" ("videoId", "tagId") VALUES (${v.id}, ${tag.id})
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

            result.videosAdded++;
            console.log(`[CronSync] Added video: ${v.id} — "${v.title}"`);
          } catch (videoErr) {
            const err = videoErr as Error;
            console.error(`[CronSync] Failed to process video ${v.id}: ${err.message}`);
          }
        }
      }
    }

    result.durationMs = Date.now() - startTime;
    result.message =
      result.pendingNewVideos > 0
        ? `${result.pendingNewVideos} more new videos pending — will be processed on the next cron run.`
        : result.videosAdded > 0
        ? `${result.videosAdded} new video(s) added successfully.`
        : "DB is up to date. No new videos found.";

    console.log("[CronSync] Completed:", result);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const error = err as Error;
    result.durationMs = Date.now() - startTime;
    console.error("[CronSync] Fatal error:", error.message);
    return NextResponse.json(
      { success: false, error: error.message, ...result },
      { status: 500 }
    );
  }
}
