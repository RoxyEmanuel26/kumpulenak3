import "dotenv/config";
import { sql } from "../../lib/db";
import { runRemovedVideosCleanup } from "../../lib/video/cleanup";

async function main() {
  console.log("==================================================");
  console.log("🧹 LustHub Daily Removed-Video & DB Storage Cleanup");
  console.log("==================================================\n");

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not configured. Skipping cleanup.");
    process.exitCode = 1;
    return;
  }

  const force = process.argv.includes("--force");
  const start = Date.now();

  try {
    const res = await runRemovedVideosCleanup({ force });
    console.log("Summary:", {
      ...res,
      durationMs: Date.now() - start,
    });
  } catch (err) {
    const error = err as Error & { code?: string };
    const isQuotaOrPaused =
      error.code === "53000" ||
      /exceeded.*quota|endpoint is disabled|project is paused|upgrade your plan/i.test(
        error.message
      );
    if (isQuotaOrPaused) {
      console.warn("[DailyCleanup] Neon DB paused/over-quota, skipping:", error.message);
      return;
    }
    throw err;
  }
}

main()
  .catch((err) => {
    console.error("Fatal error during daily cleanup:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await sql.end({ timeout: 5 });
    } catch {
      // Ignore close errors
    }
  });
