/**
 * app/api/cron/sync/route.ts
 *
 * Lightweight sync endpoint designed to be called by cron-job.org every 30 minutes.
 * Replaces the need for a running BullMQ/Redis/Docker worker on a dedicated server.
 *
 * DESIGN CONSTRAINTS (Vercel Hobby = 10s function timeout):
 * - Uses a single batch DB query instead of N individual findUnique calls (N+1 fix)
 * - Processes MAX_NEW_PER_RUN new videos per call to stay under 10s
 * - Hard time-guard at 7s to ensure clean response before Vercel cuts the connection
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
 * 5. Timeout: 30 seconds (cron-job.org side; Vercel will respond within 10s)
 *
 * For daily removed-video cleanup, use a separate cron job:
 * 1. URL: https://lusthub.web.id/api/cron/sync?cleanup=true
 * 2. Schedule: Once daily (e.g. 02:00 UTC)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { EpornerAPI } from "@/lib/api/eporner";
import { GeminiAPI } from "@/lib/api/gemini";
import { TIER1_CATEGORIES } from "@/lib/category-config";
import { Prisma } from "@prisma/client";
import { timingSafeEqual } from "node:crypto";

export const dynamic = "force-dynamic";

// Vercel Hobby plan: 10-second max. We hard-stop at 7s to leave buffer for response.
const HARD_STOP_MS = 7_000;

// Max new videos to classify+insert per cron run.
// Each new video needs ~2-3s for Gemini + DB insert.
// 2 × 3s = 6s → safely within 7s hard stop.
const MAX_NEW_PER_RUN = 2;

function verifySecret(provided: string, expected: string): boolean {
  try {
    const a = Buffer.from(provided, "utf-8");
    const b = Buffer.from(expected, "utf-8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
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
    durationMs: 0,
    message: "",
  };

  try {
    // ── 1. Removed Videos Cleanup (daily, only when ?cleanup=true) ───────────
    if (doCleanup) {
      console.log("[CronSync] Running removed videos cleanup...");
      const lastSyncSetting = await prisma.settings.findUnique({
        where: { key: "last_removed_sync_at" },
      });
      const lastSync = lastSyncSetting
        ? new Date(JSON.parse(lastSyncSetting.value))
        : null;
      const now = new Date();
      const isDue =
        !lastSync ||
        now.getTime() - lastSync.getTime() > 20 * 60 * 60 * 1000; // 20h guard

      if (isDue) {
        const removedText = await EpornerAPI.getRemoved();
        const activeVideos = await prisma.video.findMany({
          where: { status: "ACTIVE" },
          select: { id: true },
        });

        if (activeVideos.length > 0) {
          const removedIds = activeVideos
            .map((v) => v.id)
            .filter((id) => {
              const index = removedText.indexOf(id);
              if (index === -1) return false;
              const charBefore = index > 0 ? removedText[index - 1] : "\n";
              const charAfter =
                index + id.length < removedText.length
                  ? removedText[index + id.length]
                  : "\n";
              return (
                (charBefore === "\n" || charBefore === "\r") &&
                (charAfter === "\n" || charAfter === "\r")
              );
            });

          if (removedIds.length > 0) {
            const { count } = await prisma.video.updateMany({
              where: { id: { in: removedIds } },
              data: { status: "REMOVED" },
            });
            result.removedVideosDeactivated = count;
          }
        }

        await prisma.settings.upsert({
          where: { key: "last_removed_sync_at" },
          create: {
            key: "last_removed_sync_at",
            value: JSON.stringify(now.toISOString()),
          },
          update: { value: JSON.stringify(now.toISOString()) },
        });
      }
    }

    // ── 2. New Video Sync ────────────────────────────────────────────────────
    // Guard: don't spend remaining time if cleanup already took too long
    if (Date.now() - startTime < HARD_STOP_MS - 2000) {
      // Fetch latest 50 videos from Eporner (cached 5 min by Next.js fetch layer)
      const latestRes = await EpornerAPI.search({ order: "latest", per_page: 50 });
      const videos = latestRes?.videos ?? [];
      result.fetchedFromEporner = videos.length;

      if (videos.length > 0) {
        // N+1 FIX: Single batch query instead of N individual findUnique calls.
        // Check which video IDs already exist in DB in ONE round-trip.
        const ids = videos.map((v) => v.id);
        const existing = await prisma.video.findMany({
          where: { id: { in: ids } },
          select: { id: true },
        });
        const existingIds = new Set(existing.map((v) => v.id));

        const newVideos = videos.filter((v) => !existingIds.has(v.id));
        result.newVideosFound = newVideos.length;
        result.videosSkipped = videos.length - newVideos.length;

        // Process at most MAX_NEW_PER_RUN new videos to stay within Vercel timeout
        const toProcess = newVideos.slice(0, MAX_NEW_PER_RUN);
        result.pendingNewVideos = Math.max(0, newVideos.length - toProcess.length);

        for (const v of toProcess) {
          // Hard time guard — stop processing if we're approaching the deadline
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

            await prisma.video.create({
              data: {
                id: v.id,
                title: v.title,
                lengthMin: v.length_min,
                lengthSec: v.length_sec,
                addedAt: v.added ? new Date(v.added) : undefined,
                rate: v.rate,
                views: v.views,
                defaultThumb: v.default_thumb as unknown as Prisma.InputJsonValue,
                thumbs: v.thumbs as unknown as Prisma.InputJsonValue,
                keywords: v.keywords,
                embedUrl: v.embed,
                status: aiResult.isSpam ? "DRAFT" : "ACTIVE",
                aiScoreTrending: aiResult.scores.trending,
                aiScoreEngagement: aiResult.scores.engagement,
                aiScoreSpam: aiResult.scores.spam,
                aiSpamFlag: aiResult.isSpam,
                aiDescription: aiResult.seoDescription,
                tags: {
                  create: finalTags.map((cleanTag) => ({
                    tag: {
                      connectOrCreate: {
                        where: { name: cleanTag },
                        create: { name: cleanTag },
                      },
                    },
                  })),
                },
                ...(matchedCat
                  ? {
                      categories: {
                        create: [
                          {
                            category: {
                              connectOrCreate: {
                                where: { name: matchedCat.name },
                                create: { name: matchedCat.name },
                              },
                            },
                          },
                        ],
                      },
                    }
                  : {}),
              },
            });

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
