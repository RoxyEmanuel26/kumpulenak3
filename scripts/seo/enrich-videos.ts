import { EpornerAPI } from "../../lib/api/eporner";
import { 
  getAllEnrichedVideos, 
  computeSourceHash,
  EnrichedVideoData 
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
    process.exit(0);
  }

  const batchSize = parseInt(process.env.GEMINI_BATCH_SIZE || "5", 10);
  const dailyLimit = parseInt(process.env.GEMINI_DAILY_REQUEST_LIMIT || "1000", 10);

  console.log(`⚙️  Configuration:`);
  console.log(`   - Model: ${process.env.GEMINI_MODEL || "gemini-3.5-flash"}`);
  console.log(`   - Batch Size: ${batchSize} videos / request`);
  console.log(`   - Daily Request Quota Limit: ${dailyLimit}`);

  // Fetch top viewed & popular videos to prioritize high-traffic pages first
  console.log("\n📡 Fetching candidate videos from catalog...");
  const existingStore = getAllEnrichedVideos();

  const [popularRes, weeklyRes, latestRes] = await Promise.all([
    EpornerAPI.search({ order: "most-popular", per_page: 50 }),
    EpornerAPI.search({ order: "top-weekly", per_page: 50 }),
    EpornerAPI.search({ order: "latest", per_page: 50 }),
  ]);

  const candidateMap = new Map<string, VideoInputItem>();

  const ingest = (videos: any[]) => {
    for (const v of videos) {
      if (!candidateMap.has(v.id)) {
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

  ingest(popularRes?.videos || []);
  ingest(weeklyRes?.videos || []);
  ingest(latestRes?.videos || []);

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
    process.exit(0);
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

runEnrichment().catch((err) => {
  console.error("Fatal error during enrichment run:", err);
  process.exit(1);
});
