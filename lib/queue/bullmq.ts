import { Queue } from "bullmq";
import { redisConnection } from "./redis";

export const QUEUE_NAMES = {
  SYNC: "sync-queue",
  BROADCAST: "broadcast-queue",
};

const globalForQueues = global as unknown as {
  syncQueue: Queue;
  broadcastQueue: Queue;
};

let syncQueueInstance: Queue;
let broadcastQueueInstance: Queue;

if (globalForQueues.syncQueue && globalForQueues.broadcastQueue) {
  syncQueueInstance = globalForQueues.syncQueue;
  broadcastQueueInstance = globalForQueues.broadcastQueue;
} else {
  syncQueueInstance = new Queue(QUEUE_NAMES.SYNC, { connection: redisConnection as unknown as NonNullable<ConstructorParameters<typeof Queue>[1]>["connection"] });
  broadcastQueueInstance = new Queue(QUEUE_NAMES.BROADCAST, { connection: redisConnection as unknown as NonNullable<ConstructorParameters<typeof Queue>[1]>["connection"] });
  
  if (process.env.NODE_ENV !== 'production') {
    globalForQueues.syncQueue = syncQueueInstance;
    globalForQueues.broadcastQueue = broadcastQueueInstance;
  }
}

export const syncQueue = syncQueueInstance;
export const broadcastQueue = broadcastQueueInstance;

export async function enqueueSyncJob() {
  await syncQueue.add("run-sync", {}, { removeOnComplete: true, removeOnFail: 100 });
}

export async function enqueueBroadcastJob(videoId: string) {
  await broadcastQueue.add("run-broadcast", { videoId }, { removeOnComplete: true, removeOnFail: 100 });
}
