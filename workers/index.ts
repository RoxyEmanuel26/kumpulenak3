import "dotenv/config";
import { syncWorker } from "./sync";
import { broadcastWorker } from "./broadcast";
import { enqueueSyncJob } from "../lib/queue/bullmq";
import cron from "node-cron";

console.log("Starting BullMQ Workers...");

syncWorker.on("ready", () => console.log("Sync Worker Ready"));
broadcastWorker.on("ready", () => console.log("Broadcast Worker Ready"));

// Run Sync every 10 minutes
cron.schedule("*/10 * * * *", async () => {
  console.log("[Cron] Enqueueing sync job...");
  try {
    await enqueueSyncJob();
  } catch (err) {
    console.error("Failed to enqueue sync job:", err);
  }
});

// Run an initial sync on startup
setTimeout(async () => {
  console.log("[Init] Enqueueing initial sync job...");
  await enqueueSyncJob();
}, 5000);

console.log("Workers and Cron started. Waiting for jobs...");
