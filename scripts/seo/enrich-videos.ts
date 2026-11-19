import "dotenv/config";
import { EpornerAPI } from "../../lib/api/eporner";
import { sql } from "../../lib/db";
import { TIER1_CATEGORIES } from "../../lib/category-config";
import type { EpornerVideo } from "../../types/eporner";
import { 
  getAllEnrichedVideosAsync,
  syncLocalStoreToDb,
  closeEnrichmentDb,
  computeSourceHash,
} from "../../lib/seo/enrichment-store";
import { 
  processBatchWithGemini, 
  VideoInputItem 
} from "../../lib/seo/gemini-enricher";

async function runEnrichment() {
  console.log("==================================================");
  console.log("🚀 LustHub Gemini SEO Enrichment Background Job 🚀");
  console.log("==================================================\n");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log("ℹ️  Note: GEMINI_API_KEY is not defined in environment.");
    console.log("   To run AI enrichment against live Gemini API, provide GEMINI_API_KEY.");
    console.log("   Example: GEMINI_API_KEY=AIzaSy... npm run seo:enrich\n");
    console.log("   Existing videos will continue serving default metadata safely.\n");
    return;
  }

  const batchSize = parseInt(process.env.GEMINI_BATCH_SIZE || "5", 10);
  const dailyLimit = parseInt(process.env.GEMINI_DAILY_REQUEST_LIMIT || "1000", 10);

  console.log(`⚙️  Configuration:`);
  console.log(`   - Model: ${process.env.GEMINI_MODEL || "gemini-3.5-flash"}`);
  console.log(`   - Batch Size: ${batchSize} videos / request`);
  console.log(`   - Daily Request Quota Limit: ${dailyLimit}`);
  console.log(`   - Storage: ${process.env.DATABASE_URL ? "Neon PostgreSQL + Local JSON fallback" : "Local JSON store only"}`);

  if (process.env.DATABASE_URL) {
    const syncRes = await syncLocalStoreToDb();
    if (syncRes.synced > 0) {
      console.log(`\n🔄 Backfilled ${syncRes.synced} existing JSON record(s) into Neon DB.`);
    }
  }

  // Fetch live homepage & Tier-1 category page-1 videos FIRST (highest crawl frequency
  // in GSC), followed by broad popular/weekly/latest feeds for depth.
  console.log("\n📡 Fetching candidate videos (Homepage + 16 Tier-1 categories first)...");
  const existingStore = await getAllEnrichedVideosAsync();

  const candidateMap = new Map<string, VideoInputItem>();
  const fullVideoMap = new Map<string, EpornerVideo>();

  const ingest = (videos: EpornerVideo[] | undefined) => {
    if (!Array.isArray(videos)) return;
    for (const v of videos) {
      if (v?.id && !candidateMap.has(v.id)) {
        fullVideoMap.set(v.id, v);
        candidateMap.set(v.id, {
          id: v.id,
          title: v.title,
          keywords: v.keywords,
          length_min: v.length_min,
          views: v.views,
        });
      }
    }
  };

  // 1. Homepage page 1 (exact params used by app/(user)/page.tsx)
  const homeRes = await EpornerAPI.search({
    query: "all",
    page: 1,
    per_page: 30,
    order: "latest",
    lq: 1,
  }).catch(() => null);
  ingest(homeRes?.videos);

  // 2. All Tier-1 category page 1s (exact params used by app/(user)/category/[slug]/page.tsx)
  const CAT_CONCURRENCY = 4;
  for (let i = 0; i < TIER1_CATEGORIES.length; i += CAT_CONCURRENCY) {
    const chunk = TIER1_CATEGORIES.slice(i, i + CAT_CONCURRENCY);
    const catResults = await Promise.all(
      chunk.map((cat) =>
        EpornerAPI.search({
          query: cat.name,
          page: 1,
          per_page: 30,
          order: "latest",
        }).catch(() => null)
      )
    );
    for (const res of catResults) {
      ingest(res?.videos);
    }
    if (i + CAT_CONCURRENCY < TIER1_CATEGORIES.length) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  // 3. Broad popular, weekly & latest feeds
  const [popularRes, weeklyRes, latestRes] = await Promise.all([
    EpornerAPI.search({ order: "most-popular", per_page: 50 }).catch(() => null),
    EpornerAPI.search({ order: "top-weekly", per_page: 50 }).catch(() => null),
    EpornerAPI.search({ order: "latest", per_page: 50 }).catch(() => null),
  ]);

  ingest(popularRes?.videos);
  ingest(weeklyRes?.videos);
  ingest(latestRes?.videos);

  const allCandidates = Array.from(candidateMap.values());
  console.log(`🔍 Total unique candidate videos gathered: ${allCandidates.length}`);

  // Filter out candidates that are already enriched with same hash
  const queue: VideoInputItem[] = [];
  for (const candidate of allCandidates) {
    const existing = existingStore[candidate.id];
    const currentHash = computeSourceHash(candidate.title, candidate.keywords);

    if (existing && existing.status === "enriched" && existing.source_hash === currentHash) {
      continue; // Up to date, skip
    }

    queue.push(candidate);
  }

  // Support --limit=N CLI flag
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const maxVideosToProcess = limitArg
    ? parseInt(limitArg.split("=")[1], 10)
    : parseInt(process.env.SEO_ENRICH_LIMIT || "0", 10);

  const targetQueue = maxVideosToProcess > 0 ? queue.slice(0, maxVideosToProcess) : queue;

  console.log(`📋 Queued for enrichment: ${queue.length} videos (processing up to: ${targetQueue.length})`);

  if (targetQueue.length === 0) {
    console.log("✨ All candidate videos are already enriched and up-to-date. Done!");
    return;
  }

  let totalEnriched = 0;
  let totalRejected = 0;
  let totalFailed = 0;
  let requestCount = 0;

  for (let i = 0; i < targetQueue.length; i += batchSize) {
    if (requestCount >= dailyLimit) {
      console.warn(`\n🛑 Daily request limit reached (${dailyLimit} requests). Pausing until next cycle.`);
      break;
    }

    const batch = targetQueue.slice(i, i + batchSize);
    requestCount++;
    console.log(`\n⚡ Processing Batch ${requestCount} (${batch.length} videos: ${batch.map((b) => b.id).join(", ")})...`);

    const result = await processBatchWithGemini(batch);
    totalEnriched += result.enrichedCount;
    totalRejected += result.rejectedCount;
    totalFailed += result.failedCount;

    if (process.env.DATABASE_URL && result.enrichedCount > 0) {
      const updatedStore = await getAllEnrichedVideosAsync();
      for (const b of batch) {
        if (updatedStore[b.id]?.status !== "enriched") continue;
        const full = fullVideoMap.get(b.id);
        if (!full) continue;
        await sql`
          INSERT INTO "Video" (
            id, title, "lengthMin", "lengthSec", "addedAt", rate, views,
            "defaultThumb", thumbs, keywords, "embedUrl", status,
            "aiScoreTrending", "aiScoreEngagement", "aiScoreSpam", "aiSpamFlag",
            "aiDescription", "updatedAt"
          ) VALUES (
            ${full.id}, ${full.title}, ${full.length_min}, ${full.length_sec},
            ${full.added ? new Date(full.added).toISOString() : null},
            ${full.rate}, ${full.views ?? 0},
            ${JSON.stringify(full.default_thumb)}, ${JSON.stringify(full.thumbs)},
            ${full.keywords},
            ${full.embed ? full.embed.replace(/\/+$/, "") : `https://www.eporner.com/embed/${full.id}`},
            'ACTIVE', 60, 60, 5, false,
            ${updatedStore[b.id].summary}, NOW()
          )
          ON CONFLICT (id) DO NOTHING
        `.catch(() => {});
      }
    }

    console.log(`   -> Batch result: ${result.enrichedCount} enriched, ${result.rejectedCount} rejected by QC, ${result.failedCount} failed.`);
    
    // Polite pacing: 1.5s delay between requests to stay well within free tier RPM
    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log("\n==================================================");
  console.log("🎉 Enrichment Run Summary:");
  console.log(`   - Requests Sent: ${requestCount}`);
  console.log(`   - Enriched: ${totalEnriched}`);
  console.log(`   - Rejected by QC: ${totalRejected}`);
  console.log(`   - Failed: ${totalFailed}`);
  console.log("==================================================\n");
}

runEnrichment()
  .catch((err) => {
    console.error("Fatal error during enrichment run:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeEnrichmentDb();
  });
