"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastQueue = exports.syncQueue = exports.QUEUE_NAMES = void 0;
exports.enqueueSyncJob = enqueueSyncJob;
exports.enqueueBroadcastJob = enqueueBroadcastJob;
const bullmq_1 = require("bullmq");
const redis_1 = require("./redis");
exports.QUEUE_NAMES = {
    SYNC: "sync-queue",
    BROADCAST: "broadcast-queue",
};
const globalForQueues = global;
let syncQueueInstance;
let broadcastQueueInstance;
if (globalForQueues.syncQueue && globalForQueues.broadcastQueue) {
    syncQueueInstance = globalForQueues.syncQueue;
    broadcastQueueInstance = globalForQueues.broadcastQueue;
}
else {
    syncQueueInstance = new bullmq_1.Queue(exports.QUEUE_NAMES.SYNC, { connection: redis_1.redisConnection });
    broadcastQueueInstance = new bullmq_1.Queue(exports.QUEUE_NAMES.BROADCAST, { connection: redis_1.redisConnection });
    if (process.env.NODE_ENV !== 'production') {
        globalForQueues.syncQueue = syncQueueInstance;
        globalForQueues.broadcastQueue = broadcastQueueInstance;
    }
}
exports.syncQueue = syncQueueInstance;
exports.broadcastQueue = broadcastQueueInstance;
async function enqueueSyncJob() {
    await exports.syncQueue.add("run-sync", {}, { removeOnComplete: true, removeOnFail: 100 });
}
async function enqueueBroadcastJob(videoId) {
    await exports.broadcastQueue.add("run-broadcast", { videoId }, { removeOnComplete: true, removeOnFail: 100 });
}
