import { Worker, Job } from "bullmq";
import { QUEUE_NAMES, enqueueBroadcastJob } from "../lib/queue/bullmq";
import { redisConnection } from "../lib/queue/redis";
import { EpornerAPI } from "../lib/api/eporner";
import { prisma } from "../lib/db/prisma";
import { GeminiAPI } from "../lib/api/gemini";


export const syncWorker = new Worker(
  QUEUE_NAMES.SYNC,
  async (job: Job) => {
    console.log(`[SyncWorker] Starting job ${job.id}`);
    
    const syncJob = await prisma.syncJob.create({
      data: {
        status: "RUNNING",
      },
    });

    let itemsProcessed = 0;
    let itemsAdded = 0;

    try {
      // 1. Fetch Removed Videos (only if last check was > 24 hours ago)
      const lastSyncSetting = await prisma.settings.findUnique({ where: { key: "last_removed_sync_at" } });
      const lastSync = lastSyncSetting ? new Date(JSON.parse(lastSyncSetting.value)) : null;
      const now = new Date();
      const isDue = !lastSync || (now.getTime() - lastSync.getTime() > 24 * 60 * 60 * 1000);

      if (isDue) {
        console.log(`[SyncWorker] Fetching removed videos...`);
        const removedText = await EpornerAPI.getRemoved();
        
        // Get active videos from DB
        const activeVideos = await prisma.video.findMany({
          where: { status: "ACTIVE" },
          select: { id: true },
        });

        if (activeVideos.length > 0) {
          const activeIds = activeVideos.map((v) => v.id);
          const removedIds = activeIds.filter((id) => {
            const index = removedText.indexOf(id);
            if (index === -1) return false;
            
            const charBefore = index > 0 ? removedText[index - 1] : "\n";
            const charAfter = index + id.length < removedText.length ? removedText[index + id.length] : "\n";
            
            return (charBefore === "\n" || charBefore === "\r") && (charAfter === "\n" || charAfter === "\r");
          });

          if (removedIds.length > 0) {
            console.log(`[SyncWorker] Found ${removedIds.length} removed videos. Updating status to REMOVED...`);
            await prisma.video.updateMany({
              where: { id: { in: removedIds } },
              data: { status: "REMOVED" },
            });
          } else {
            console.log(`[SyncWorker] No active videos were found in the removed list.`);
          }
        }

        // Save last sync time
        await prisma.settings.upsert({
          where: { key: "last_removed_sync_at" },
          create: { key: "last_removed_sync_at", value: JSON.stringify(now.toISOString()) },
          update: { value: JSON.stringify(now.toISOString()) },
        });

        console.log(`[SyncWorker] Removed videos check completed.`);
      } else {
        console.log(`[SyncWorker] Skipping removed videos sync (last run: ${lastSync?.toISOString()})`);
      }


      // 2. Fetch Latest Videos
      console.log(`[SyncWorker] Fetching latest videos...`);
      // We limit to page 1 for incremental sync, but we could loop pages if necessary
      const latestRes = await EpornerAPI.search({ order: "latest", per_page: 100 });
      
      if (latestRes && latestRes.videos) {
        for (const v of latestRes.videos) {
          itemsProcessed++;
          
          // Check if video already exists
          const existing = await prisma.video.findUnique({ where: { id: v.id } });
          if (!existing) {
            console.log(`[SyncWorker] Running Gemini AI classification for: "${v.title}"`);
            const aiResult = await GeminiAPI.classifyVideo(v.title, v.keywords);

            const rawTags = aiResult.cleanedTags.length > 0 
              ? aiResult.cleanedTags 
              : v.keywords.split(",");
            const finalTags = Array.from(new Set(rawTags.map((t) => t.trim().toLowerCase()))).filter(Boolean);

            // New video -> Add to DB
            await prisma.video.create({
              data: {
                id: v.id,
                title: v.title,
                lengthMin: v.length_min,
                lengthSec: v.length_sec,
                addedAt: v.added ? new Date(v.added) : undefined,
                rate: v.rate,
                views: v.views,
                defaultThumb: v.default_thumb as any,
                thumbs: v.thumbs as any,
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
            await enqueueBroadcastJob(v.id);
          }
        }
      }

      await prisma.syncJob.update({
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
    } catch (error: any) {
      console.error(`[SyncWorker] Error in job ${job.id}:`, error);
      
      await prisma.syncJob.update({
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
  { connection: redisConnection as any }
);

syncWorker.on("completed", (job) => {
  console.log(`SyncJob ${job.id} has completed!`);
});

syncWorker.on("failed", (job, err) => {
  console.log(`SyncJob ${job?.id} has failed with ${err.message}`);
});
