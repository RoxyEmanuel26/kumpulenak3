import { Queue } from "bullmq";
import { redisConnection } from "./redis";

export const QUEUE_NAMES = {
  SYNC: "sync-queue",
};

const globalForQueues = global as unknown as {
  syncQueue: Queue;
};

let syncQueueInstance: Queue;

if (globalForQueues.syncQueue) {
  syncQueueInstance = globalForQueues.syncQueue;
} else {
  syncQueueInstance = new Queue(QUEUE_NAMES.SYNC, { connection: redisConnection as unknown as NonNullable<ConstructorParameters<typeof Queue>[1]>["connection"] });
  
  if (process.env.NODE_ENV !== 'production') {
    globalForQueues.syncQueue = syncQueueInstance;
  }
}

export const syncQueue = syncQueueInstance;

export async function enqueueSyncJob() {
  await syncQueue.add("run-sync", {}, { removeOnComplete: true, removeOnFail: 100 });
}
