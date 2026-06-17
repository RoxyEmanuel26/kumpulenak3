import { Worker, Job } from "bullmq";
import { QUEUE_NAMES } from "../lib/queue/bullmq";
import { redisConnection } from "../lib/queue/redis";
import { prisma } from "../lib/db/prisma";
import { telegramBot } from "../lib/telegram/bot";
import { formatVideoMessage } from "../lib/telegram/formatter";
import { Markup } from "telegraf";

export const broadcastWorker = new Worker(
  QUEUE_NAMES.BROADCAST,
  async (job: Job) => {
    const { videoId } = job.data;
    console.log(`[BroadcastWorker] Processing videoId: ${videoId}`);

    if (!telegramBot) {
      throw new Error("Telegram bot not configured.");
    }

    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: { tags: { include: { tag: true } } },
    });

    if (!video || video.status !== "ACTIVE") {
      console.log(`[BroadcastWorker] Video ${videoId} is not active or not found.`);
      return;
    }

    const activeChannels = await prisma.telegramChannel.findMany({
      where: { isActive: true },
    });

    for (const channel of activeChannels) {
      // 1. Deduplication Check
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

      try {
        const text = formatVideoMessage(video, channel.template);
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        
        const keyboard = Markup.inlineKeyboard([
          [Markup.button.url("🎬 Tonton Video", `${appUrl}/video/${video.id}`)],
        ]);

        let msg;
        if (video.thumbnail) {
          msg = await telegramBot.telegram.sendPhoto(channel.id, video.thumbnail, {
            caption: text,
            parse_mode: "MarkdownV2",
            ...keyboard,
          });
        } else {
          msg = await telegramBot.telegram.sendMessage(channel.id, text, {
            parse_mode: "MarkdownV2",
            ...keyboard,
          });
        }

        await prisma.broadcastLog.update({
          where: { id: log.id },
          data: { status: "SENT", messageId: msg.message_id.toString() },
        });

        console.log(`[BroadcastWorker] Successfully sent to ${channel.id}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        console.error(`[BroadcastWorker] Failed to send to ${channel.id}:`, error);
        await prisma.broadcastLog.update({
          where: { id: log.id },
          data: { status: "FAILED", errorMessage: error.message },
        });
        
        throw error;
      }
    }
  },
  {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    connection: redisConnection as any,
    limiter: { max: 10, duration: 1000 },
  }
);
