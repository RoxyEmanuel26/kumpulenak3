import { Worker, Job } from "bullmq";
import { QUEUE_NAMES } from "../lib/queue/bullmq";
import { redisConnection } from "../lib/queue/redis";
import { prisma } from "../lib/db/prisma";
import { telegramBot } from "../lib/telegram/bot";
import { formatVideoMessage } from "../lib/telegram/formatter";
import { Markup, Telegraf } from "telegraf";

const botInstancesCache: Record<string, Telegraf> = {};

function getBotInstance(token: string): Telegraf {
  if (!botInstancesCache[token]) {
    botInstancesCache[token] = new Telegraf(token);
  }
  return botInstancesCache[token];
}

export const broadcastWorker = new Worker(
  QUEUE_NAMES.BROADCAST,
  async (job: Job) => {
    const { videoId } = job.data;
    console.log(`[BroadcastWorker] Processing videoId: ${videoId}`);

    const video = await prisma.video.findUnique({
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

    const activeChannels = await prisma.telegramChannel.findMany({
      where: { isActive: true },
      include: { bot: true },
    });

    for (const channel of activeChannels) {
      // 1. Smart Telegram Routing Filters
      if (channel.routingRules) {
        try {
          const rules = typeof channel.routingRules === "string"
            ? JSON.parse(channel.routingRules)
            : (channel.routingRules as Record<string, unknown>);

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
            const hasMatchedCategory = rules.categories.some((c: string) => videoCategories.includes(c.toLowerCase()));
            if (!hasMatchedCategory) {
              console.log(`[BroadcastWorker] Skipped video ${videoId} for channel ${channel.id}: Categories do not match.`);
              continue;
            }
          }

          // c. Tag Filter
          if (Array.isArray(rules.tags) && rules.tags.length > 0) {
            const videoTags = video.tags.map((t) => t.tag.name.toLowerCase());
            const hasMatchedTag = rules.tags.some((t: string) => videoTags.includes(t.toLowerCase()));
            if (!hasMatchedTag) {
              console.log(`[BroadcastWorker] Skipped video ${videoId} for channel ${channel.id}: Tags do not match.`);
              continue;
            }
          }
        } catch (err) {
          const error = err as Error;
          console.error(`[BroadcastWorker] Error parsing routing rules for channel ${channel.id}:`, error.message);
        }
      }

      // 2. Deduplication Check
      const existingLog = await prisma.broadcastLog.findUnique({
        where: { videoId_channelId: { videoId, channelId: channel.id } },
      });

      if (existingLog && existingLog.status === "SENT") {
        console.log(`[BroadcastWorker] Already sent video ${videoId} to channel ${channel.id}`);
        continue;
      }

      const log = await prisma.broadcastLog.upsert({
        where: { videoId_channelId: { videoId, channelId: channel.id } },
        create: { videoId, channelId: channel.id, status: "PENDING" },
        update: { status: "PENDING", retryCount: { increment: 1 } },
      });

      // 3. Select correct Telegram Bot (Multi-Bot Support)
      const bot = channel.bot ? getBotInstance(channel.bot.token) : telegramBot;
      if (!bot) {
        console.error(`[BroadcastWorker] No Telegram Bot configured for channel ${channel.id}`);
        await prisma.broadcastLog.update({
          where: { id: log.id },
          data: { status: "FAILED", errorMessage: "No bot token configured." },
        });
        continue;
      }

      try {
        const text = formatVideoMessage(video, channel.template);
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        
        // Link to tracking endpoint for CTR analytics
        const trackingUrl = `${appUrl}/api/track?logId=${log.id}&redirect=${encodeURIComponent(`${appUrl}/video/${video.id}`)}`;
        
        const keyboard = Markup.inlineKeyboard([
          [Markup.button.url("🎬 Tonton Video", trackingUrl)],
        ]);

        let msg;
        const thumbnailSrc = (video.defaultThumb as { src?: string } | null)?.src;
        if (thumbnailSrc) {
          msg = await bot.telegram.sendPhoto(channel.id, thumbnailSrc, {
            caption: text,
            parse_mode: "MarkdownV2",
            ...keyboard,
          });
        } else {
          msg = await bot.telegram.sendMessage(channel.id, text, {
            parse_mode: "MarkdownV2",
            ...keyboard,
          });
        }

        await prisma.broadcastLog.update({
          where: { id: log.id },
          data: { status: "SENT", messageId: msg.message_id.toString() },
        });

        console.log(`[BroadcastWorker] Successfully sent video ${videoId} to ${channel.id}`);
      } catch (err) {
        const error = err as Error;
        console.error(`[BroadcastWorker] Failed to send to ${channel.id}:`, error);
        await prisma.broadcastLog.update({
          where: { id: log.id },
          data: { status: "FAILED", errorMessage: error.message },
        });
        
        continue;
      }
    }
  },
  {
    connection: redisConnection as unknown as NonNullable<ConstructorParameters<typeof Worker>[2]>["connection"],
    limiter: { max: 10, duration: 1000 },
  }
);

