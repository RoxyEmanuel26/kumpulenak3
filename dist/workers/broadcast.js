"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastWorker = void 0;
const bullmq_1 = require("bullmq");
const bullmq_2 = require("../lib/queue/bullmq");
const redis_1 = require("../lib/queue/redis");
const prisma_1 = require("../lib/db/prisma");
const bot_1 = require("../lib/telegram/bot");
const formatter_1 = require("../lib/telegram/formatter");
const telegraf_1 = require("telegraf");
const botInstancesCache = {};
function getBotInstance(token) {
    if (!botInstancesCache[token]) {
        botInstancesCache[token] = new telegraf_1.Telegraf(token);
    }
    return botInstancesCache[token];
}
exports.broadcastWorker = new bullmq_1.Worker(bullmq_2.QUEUE_NAMES.BROADCAST, async (job) => {
    var _a;
    const { videoId } = job.data;
    console.log(`[BroadcastWorker] Processing videoId: ${videoId}`);
    const video = await prisma_1.prisma.video.findUnique({
        where: { id: videoId },
        include: {
            tags: { include: { tag: true } },
            categories: { include: { category: true } }
        },
    });
    if (!video || video.status !== "ACTIVE") {
        console.log(`[BroadcastWorker] Video ${videoId} is not active or not found.`);
        return;
    }
    const activeChannels = await prisma_1.prisma.telegramChannel.findMany({
        where: { isActive: true },
        include: { bot: true },
    });
    for (const channel of activeChannels) {
        // 1. Smart Telegram Routing Filters
        if (channel.routingRules) {
            try {
                const rules = typeof channel.routingRules === "string"
                    ? JSON.parse(channel.routingRules)
                    : channel.routingRules;
                // a. Rating Filter (top-rated)
                if (rules.order === "top-rated") {
                    const ratingStr = video.rate || "0";
                    const ratingVal = parseInt(ratingStr.replace(/[^0-9]/g, ""), 10) || 0;
                    if (ratingVal < 90) {
                        console.log(`[BroadcastWorker] Skipped video ${videoId} for channel ${channel.id}: Rating ${ratingStr} is below 90%`);
                        continue;
                    }
                }
                // b. Category Filter
                if (Array.isArray(rules.categories) && rules.categories.length > 0) {
                    const videoCategories = video.categories.map((c) => c.category.name.toLowerCase());
                    const hasMatchedCategory = rules.categories.some((c) => videoCategories.includes(c.toLowerCase()));
                    if (!hasMatchedCategory) {
                        console.log(`[BroadcastWorker] Skipped video ${videoId} for channel ${channel.id}: Categories do not match.`);
                        continue;
                    }
                }
                // c. Tag Filter
                if (Array.isArray(rules.tags) && rules.tags.length > 0) {
                    const videoTags = video.tags.map((t) => t.tag.name.toLowerCase());
                    const hasMatchedTag = rules.tags.some((t) => videoTags.includes(t.toLowerCase()));
                    if (!hasMatchedTag) {
                        console.log(`[BroadcastWorker] Skipped video ${videoId} for channel ${channel.id}: Tags do not match.`);
                        continue;
                    }
                }
            }
            catch (err) {
                const error = err;
                console.error(`[BroadcastWorker] Error parsing routing rules for channel ${channel.id}:`, error.message);
            }
        }
        // 2. Deduplication Check
        const existingLog = await prisma_1.prisma.broadcastLog.findUnique({
            where: { videoId_channelId: { videoId, channelId: channel.id } },
        });
        if (existingLog && existingLog.status === "SENT") {
            console.log(`[BroadcastWorker] Already sent video ${videoId} to channel ${channel.id}`);
            continue;
        }
        const log = await prisma_1.prisma.broadcastLog.upsert({
            where: { videoId_channelId: { videoId, channelId: channel.id } },
            create: { videoId, channelId: channel.id, status: "PENDING" },
            update: { status: "PENDING", retryCount: { increment: 1 } },
        });
        // 3. Select correct Telegram Bot (Multi-Bot Support)
        const bot = channel.bot ? getBotInstance(channel.bot.token) : bot_1.telegramBot;
        if (!bot) {
            console.error(`[BroadcastWorker] No Telegram Bot configured for channel ${channel.id}`);
            await prisma_1.prisma.broadcastLog.update({
                where: { id: log.id },
                data: { status: "FAILED", errorMessage: "No bot token configured." },
            });
            continue;
        }
        try {
            const text = (0, formatter_1.formatVideoMessage)(video, channel.template);
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
            // Link to tracking endpoint for CTR analytics
            const trackingUrl = `${appUrl}/api/track?logId=${log.id}&redirect=${encodeURIComponent(`${appUrl}/video/${video.id}`)}`;
            const keyboard = telegraf_1.Markup.inlineKeyboard([
                [telegraf_1.Markup.button.url("🎬 Tonton Video", trackingUrl)],
            ]);
            let msg;
            const thumbnailSrc = (_a = video.defaultThumb) === null || _a === void 0 ? void 0 : _a.src;
            if (thumbnailSrc) {
                msg = await bot.telegram.sendPhoto(channel.id, thumbnailSrc, Object.assign({ caption: text, parse_mode: "MarkdownV2" }, keyboard));
            }
            else {
                msg = await bot.telegram.sendMessage(channel.id, text, Object.assign({ parse_mode: "MarkdownV2" }, keyboard));
            }
            await prisma_1.prisma.broadcastLog.update({
                where: { id: log.id },
                data: { status: "SENT", messageId: msg.message_id.toString() },
            });
            console.log(`[BroadcastWorker] Successfully sent video ${videoId} to ${channel.id}`);
        }
        catch (err) {
            const error = err;
            console.error(`[BroadcastWorker] Failed to send to ${channel.id}:`, error);
            await prisma_1.prisma.broadcastLog.update({
                where: { id: log.id },
                data: { status: "FAILED", errorMessage: error.message },
            });
            continue;
        }
    }
}, {
    connection: redis_1.redisConnection,
    limiter: { max: 10, duration: 1000 },
});
