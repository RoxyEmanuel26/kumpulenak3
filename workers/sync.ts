import { Worker, Job } from "bullmq";
import { QUEUE_NAMES, enqueueBroadcastJob } from "../lib/queue/bullmq";
import { redisConnection } from "../lib/queue/redis";
import { EpornerAPI } from "../lib/api/eporner";
import { prisma } from "../lib/db/prisma";

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
      // 1. Fetch Removed Videos
      console.log(`[SyncWorker] Fetching removed videos...`);
      const removedRes = await EpornerAPI.getRemoved();
      if (removedRes && removedRes.removed_videos.length > 0) {
        await prisma.video.updateMany({
          where: { id: { in: removedRes.removed_videos } },
          data: { status: "REMOVED" },
        });
        console.log(`[SyncWorker] Updated removed videos status.`);
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
            // New video -> Add to DB
            await prisma.video.create({
              data: {
                id: v.id,
                title: v.title,
                duration: v.length_min,
                rating: v.rate,
                views: v.views,
                thumbnail: v.default_thumb?.src,
                embedUrl: v.embed,
                status: "ACTIVE",
                // Handle tags
                tags: {
                  create: v.keywords.split(",").map((t) => {
                    const cleanTag = t.trim().toLowerCase();
                    return {
                      tag: {
                        connectOrCreate: {
                          where: { name: cleanTag },
                          create: { name: cleanTag },
                        },
                      },
                    };
                  }),
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
