/**
 * app/api/cron/sync/route.ts
 *
 * Lightweight sync endpoint designed to be called by cron-job.org every 30 minutes.
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
 * 1. URL: https://lusthub.web.id/api/cron/sync
 * 2. Method: POST
 * 3. Header: Authorization: Bearer <your-CRON_SECRET-value>
 * 4. Schedule: Every 30 minutes
 * 5. Timeout: 30 seconds (cron-job.org side)
 *
 * For daily removed-video cleanup, use a separate cron job:
 * 1. URL: https://lusthub.web.id/api/cron/sync?cleanup=true
 * 2. Schedule: Once daily (e.g. 02:00 UTC)
 */

import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { EpornerAPI } from "@/lib/api/eporner";
import { GeminiAPI } from "@/lib/api/gemini";
import { TIER1_CATEGORIES } from "@/lib/category-config";

export const dynamic = "force-dynamic";
export const runtime = "edge";

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

  const sql = neon(process.env.DATABASE_URL!);

  const result = {
    fetchedFromEporner: 0,
    newVideosFound: 0,
    videosAdded: 0,
    videosSkipped: 0,
    pendingNewVideos: 0,
    removedVideosDeactivated: 0,
    durationMs: 0,
    message: "",
  };

  try {
    // ── 1. Removed Videos Cleanup (daily, only when ?cleanup=true) ───────────
    if (doCleanup) {
      console.log("[CronSync] Running removed videos cleanup...");

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
    }

    // ── 2. New Video Sync ────────────────────────────────────────────────────
    if (Date.now() - startTime < HARD_STOP_MS - 2000) {
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
