import { Queue } from "bullmq";
import { redisConnection } from "./redis";

export const QUEUE_NAMES = {
  SYNC: "sync-queue",
  BROADCAST: "broadcast-queue",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const syncQueue = new Queue(QUEUE_NAMES.SYNC, { connection: redisConnection as any });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const broadcastQueue = new Queue(QUEUE_NAMES.BROADCAST, { connection: redisConnection as any });

export async function enqueueSyncJob() {
  await syncQueue.add("run-sync", {}, { removeOnComplete: true, removeOnFail: 100 });
}

export async function enqueueBroadcastJob(videoId: string) {
  await broadcastQueue.add("run-broadcast", { videoId }, { removeOnComplete: true, removeOnFail: 100 });
}
