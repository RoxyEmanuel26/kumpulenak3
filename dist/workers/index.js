"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const sync_1 = require("./sync");
const broadcast_1 = require("./broadcast");
const bullmq_1 = require("../lib/queue/bullmq");
const node_cron_1 = __importDefault(require("node-cron"));
console.log("Starting BullMQ Workers...");
sync_1.syncWorker.on("ready", () => console.log("Sync Worker Ready"));
broadcast_1.broadcastWorker.on("ready", () => console.log("Broadcast Worker Ready"));
// Run Sync every 10 minutes
node_cron_1.default.schedule("*/10 * * * *", async () => {
    console.log("[Cron] Enqueueing sync job...");
    try {
        await (0, bullmq_1.enqueueSyncJob)();
    }
    catch (err) {
        console.error("Failed to enqueue sync job:", err);
    }
});
// Run an initial sync on startup
setTimeout(async () => {
    console.log("[Init] Enqueueing initial sync job...");
    await (0, bullmq_1.enqueueSyncJob)();
}, 5000);
console.log("Workers and Cron started. Waiting for jobs...");
