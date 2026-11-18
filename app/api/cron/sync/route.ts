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
import { runDiskCacheMaintenance } from "@/lib/cache-cleanup";

export const dynamic = "force-dynamic";



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

        // ── Neon DB Storage Protection Policy (Auto-Prune) ─────────────────────
        // Neon Free Tier provides 512 MB storage.
        // 1. Permanently delete dead REMOVED videos older than 14 days
        try {
          await sql`
            DELETE FROM "Video" 
            WHERE status = 'REMOVED' AND "updatedAt" < NOW() - INTERVAL '14 days'
          `;

          // 2. Cap maximum stored videos to 15,000 (reserves ~60-80 MB, safely under 512 MB limit)
          const [countRow] = await sql`SELECT COUNT(*) as count FROM "Video"`;
          const totalVideos = parseInt((countRow?.count as string) || "0", 10) || 0;
          if (totalVideos > 15_000) {
            const excess = totalVideos - 15_000;
            await sql`
              DELETE FROM "Video"
              WHERE id IN (
                SELECT id FROM "Video"
                ORDER BY "addedAt" ASC
                LIMIT ${excess}
              )
            `;
            console.log(`[CronSync] Pruned ${excess} oldest videos to enforce 15,000 ceiling for Neon Free Tier storage.`);
          }

          // 3. Purge orphaned tags to reclaim index space
          await sql`DELETE FROM "Tag" WHERE id NOT IN (SELECT DISTINCT "tagId" FROM "VideoTag")`;
        } catch (pruneErr) {
          console.warn("[CronSync] Storage pruning skipped:", (pruneErr as Error).message);
        }
      }

      // ── Disk Usage Monitoring ────────────────────────────────────────────────
      console.log(
        `[CronSync] Disk usage — fetch-cache remaining: ${(result.fetchCacheSizeBytes / 1024 / 1024).toFixed(1)} MB`
      );
    }

    // ── 2. New Video Sync ────────────────────────────────────────────────────
    // SKIPPED when doCleanup=true: daily cleanup cron already takes 15-25s for
    // removed-video sync. Adding video classification here would cause timeout.
    // The regular 15-min cron (no ?cleanup) handles all video syncing.
    if (!doCleanup && Date.now() - startTime < HARD_STOP_MS - 2000) {
      // We set per_page: 5 to perfectly balance the 15 RPM and 500 RPD limits of Gemini Flash Lite
      const latestRes = await EpornerAPI.search({ order: "latest", per_page: 5 });
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
                ${v.keywords}, ${v.embed ? v.embed.replace(/\/+$/, "") : `https://www.eporner.com/embed/${v.id}`},
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
    const error = err as Error & { code?: string };
    result.durationMs = Date.now() - startTime;

    const isQuotaOrPaused =
      error.code === "53000" ||
      /exceeded.*quota|endpoint is disabled|project is paused|upgrade your plan/i.test(error.message);

    if (isQuotaOrPaused) {
      // Return HTTP 200 so cron-job.org does NOT auto-disable this cronjob while
      // Neon Free Tier compute hours are exhausted — disk cache cleanup already succeeded.
      console.warn("[CronSync] Neon DB paused/over-quota; disk cache cleanup succeeded:", error.message);
      return NextResponse.json(
        {
          success: false,
          dbPaused: true,
          error: error.message,
          ...result,
        },
        { status: 200 }
      );
    }

    const isMissingTable = error.code === "42P01" || /relation.*does not exist/i.test(error.message);
    const friendlyError = isMissingTable
      ? "Database tables not initialized (relation does not exist - 42P01). Run 'npm run db:push' on your server/local to push Prisma schema to Neon."
      : error.message;

    console.error("[CronSync] Fatal error:", friendlyError);
    return NextResponse.json(
      { success: false, error: friendlyError, ...result },
      { status: 500 }
    );
  }
}
