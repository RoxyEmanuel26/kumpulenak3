"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncWorker = void 0;
const bullmq_1 = require("bullmq");
const bullmq_2 = require("../lib/queue/bullmq");
const redis_1 = require("../lib/queue/redis");
const eporner_1 = require("../lib/api/eporner");
const prisma_1 = require("../lib/db/prisma");
const gemini_1 = require("../lib/api/gemini");
exports.syncWorker = new bullmq_1.Worker(bullmq_2.QUEUE_NAMES.SYNC, async (job) => {
    console.log(`[SyncWorker] Starting job ${job.id}`);
    const syncJob = await prisma_1.prisma.syncJob.create({
        data: {
            status: "RUNNING",
        },
    });
    let itemsProcessed = 0;
    let itemsAdded = 0;
    try {
        // 1. Fetch Removed Videos (only if last check was > 24 hours ago)
        const lastSyncSetting = await prisma_1.prisma.settings.findUnique({ where: { key: "last_removed_sync_at" } });
        const lastSync = lastSyncSetting ? new Date(JSON.parse(lastSyncSetting.value)) : null;
        const now = new Date();
        const isDue = !lastSync || (now.getTime() - lastSync.getTime() > 24 * 60 * 60 * 1000);
        if (isDue) {
            console.log(`[SyncWorker] Fetching removed videos...`);
            const removedText = await eporner_1.EpornerAPI.getRemoved();
            // Get active videos from DB
            const activeVideos = await prisma_1.prisma.video.findMany({
                where: { status: "ACTIVE" },
                select: { id: true },
            });
            if (activeVideos.length > 0) {
                const activeIds = activeVideos.map((v) => v.id);
                const removedIds = activeIds.filter((id) => {
                    const index = removedText.indexOf(id);
                    if (index === -1)
                        return false;
                    const charBefore = index > 0 ? removedText[index - 1] : "\n";
                    const charAfter = index + id.length < removedText.length ? removedText[index + id.length] : "\n";
                    return (charBefore === "\n" || charBefore === "\r") && (charAfter === "\n" || charAfter === "\r");
                });
                if (removedIds.length > 0) {
                    console.log(`[SyncWorker] Found ${removedIds.length} removed videos. Updating status to REMOVED...`);
                    await prisma_1.prisma.video.updateMany({
                        where: { id: { in: removedIds } },
                        data: { status: "REMOVED" },
                    });
                }
                else {
                    console.log(`[SyncWorker] No active videos were found in the removed list.`);
                }
            }
            // Save last sync time
            await prisma_1.prisma.settings.upsert({
                where: { key: "last_removed_sync_at" },
                create: { key: "last_removed_sync_at", value: JSON.stringify(now.toISOString()) },
                update: { value: JSON.stringify(now.toISOString()) },
            });
            console.log(`[SyncWorker] Removed videos check completed.`);
        }
        else {
            console.log(`[SyncWorker] Skipping removed videos sync (last run: ${lastSync === null || lastSync === void 0 ? void 0 : lastSync.toISOString()})`);
        }
        // 2. Fetch Latest Videos
        console.log(`[SyncWorker] Fetching latest videos...`);
        // We limit to page 1 for incremental sync, but we could loop pages if necessary
        const latestRes = await eporner_1.EpornerAPI.search({ order: "latest", per_page: 100 });
        if (latestRes && latestRes.videos) {
            for (const v of latestRes.videos) {
                itemsProcessed++;
                // Check if video already exists
                const existing = await prisma_1.prisma.video.findUnique({ where: { id: v.id } });
                if (!existing) {
                    console.log(`[SyncWorker] Running Gemini AI classification for: "${v.title}"`);
                    const aiResult = await gemini_1.GeminiAPI.classifyVideo(v.title, v.keywords);
                    const rawTags = aiResult.cleanedTags.length > 0
                        ? aiResult.cleanedTags
                        : v.keywords.split(",");
                    const finalTags = Array.from(new Set(rawTags.map((t) => t.trim().toLowerCase()))).filter(Boolean);
                    // New video -> Add to DB
                    await prisma_1.prisma.video.create({
                        data: {
                            id: v.id,
                            title: v.title,
                            lengthMin: v.length_min,
                            lengthSec: v.length_sec,
                            addedAt: v.added ? new Date(v.added) : undefined,
                            rate: v.rate,
                            views: v.views,
                            defaultThumb: v.default_thumb,
                            thumbs: v.thumbs,
                            keywords: v.keywords,
                            embedUrl: v.embed,
                            status: aiResult.isSpam ? "DRAFT" : "ACTIVE",
                            // AI features
                            aiScoreTrending: aiResult.scores.trending,
                            aiScoreEngagement: aiResult.scores.engagement,
                            aiScoreSpam: aiResult.scores.spam,
                            aiSpamFlag: aiResult.isSpam,
                            aiDescription: aiResult.seoDescription,
                            // Handle tags
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
                            // Handle category
                            categories: {
                                create: [
                                    {
                                        category: {
                                            connectOrCreate: {
                                                where: { name: aiResult.category.trim() },
                                                create: { name: aiResult.category.trim() },
                                            },
                                        },
                                    },
                                ],
                            },
                        },
                    });
                    itemsAdded++;
                    // Enqueue Broadcast Job
                    await (0, bullmq_2.enqueueBroadcastJob)(v.id);
                }
            }
        }
        await prisma_1.prisma.syncJob.update({
            where: { id: syncJob.id },
            data: {
                status: "COMPLETED",
                runEndedAt: new Date(),
                itemsProcessed,
                itemsAdded,
            },
        });
        console.log(`[SyncWorker] Finished job ${job.id}. Processed: ${itemsProcessed}, Added: ${itemsAdded}`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }
    catch (error) {
        console.error(`[SyncWorker] Error in job ${job.id}:`, error);
        await prisma_1.prisma.syncJob.update({
            where: { id: syncJob.id },
            data: {
                status: "FAILED",
                runEndedAt: new Date(),
                errorLog: error.message,
            },
        });
        throw error;
    }
}, 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
{ connection: redis_1.redisConnection });
exports.syncWorker.on("completed", (job) => {
    console.log(`SyncJob ${job.id} has completed!`);
});
exports.syncWorker.on("failed", (job, err) => {
    console.log(`SyncJob ${job === null || job === void 0 ? void 0 : job.id} has failed with ${err.message}`);
});
