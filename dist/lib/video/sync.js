"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncVideoToDatabase = syncVideoToDatabase;
const prisma_1 = require("@/lib/db/prisma");
const eporner_1 = require("@/lib/api/eporner");
const gemini_1 = require("@/lib/api/gemini");
const bullmq_1 = require("@/lib/queue/bullmq");
async function syncVideoToDatabase(videoId) {
    console.log(`[SyncVideo] Starting internal sync for video ID: ${videoId}`);
    // Check if video already exists in database
    const existing = await prisma_1.prisma.video.findUnique({
        where: { id: videoId },
    });
    if (existing) {
        console.log(`[SyncVideo] Video ${videoId} already exists in database.`);
        return existing;
    }
    // Fetch video details from Eporner API
    const v = await eporner_1.EpornerAPI.getById(videoId);
    if (!v) {
        throw new Error(`Video with ID ${videoId} not found on Eporner.`);
    }
    // Call Gemini AI Classification
    console.log(`[SyncVideo] Running Gemini AI classification for: "${v.title}"`);
    const aiResult = await gemini_1.GeminiAPI.classifyVideo(v.title, v.keywords);
    const rawTags = aiResult.cleanedTags.length > 0
        ? aiResult.cleanedTags
        : v.keywords.split(",");
    const finalTags = Array.from(new Set(rawTags.map((t) => t.trim().toLowerCase()))).filter(Boolean);
    // Save to DB
    const newVideo = await prisma_1.prisma.video.create({
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
    // Enqueue Broadcast Job
    if (newVideo.status === "ACTIVE") {
        await (0, bullmq_1.enqueueBroadcastJob)(newVideo.id);
        console.log(`[SyncVideo] Broadcast job enqueued for video ${newVideo.id}`);
    }
    return newVideo;
}
