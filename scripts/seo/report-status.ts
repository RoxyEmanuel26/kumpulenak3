import "dotenv/config";
import { 
  computeEnrichmentStats,
  getAllEnrichedVideosAsync,
  closeEnrichmentDb,
  EnrichedVideoData 
} from "../../lib/seo/enrichment-store";

async function runReport() {
  console.log("==================================================");
  console.log("📊 LustHub SEO Indexing & Quality Status Report 📊");
  console.log("==================================================\n");

  const store: Record<string, EnrichedVideoData> = await getAllEnrichedVideosAsync();
  const stats = computeEnrichmentStats(store);
  const isGateEnforced = process.env.ENFORCE_INDEXING_GATE === "true";

  console.log("🛡️  Sitemap Indexing Policy (ENFORCE_INDEXING_GATE):");
  console.log(`   - ENFORCE_INDEXING_GATE: ${isGateEnforced ? "ENABLED (Curated Sitemap Mode)" : "DISABLED (Full Active Sitemap Mode)"}`);
  console.log("   -> Watch pages always emit 'index, follow' (never self-noindex).");
  if (isGateEnforced) {
    console.log("   -> Video sitemap (/sitemap/1.xml) only submits videos enriched in SeoEnrichment.");
  } else {
    console.log("   -> Video sitemap submits all active, non-spam videos in the DB.");
  }

  console.log("\n📈 Video Quality Breakdown:");
  console.log(`   - Total Processed in Store:  ${stats.total}`);
  console.log(`   - Enriched (High Quality):   ${stats.enriched} (${stats.total > 0 ? ((stats.enriched / stats.total) * 100).toFixed(1) : 0}%)`);
  console.log(`   - Pending Processing:        ${stats.pending}`);
  console.log(`   - Rejected by Auto-QC:       ${stats.rejected}`);
  console.log(`   - Failed Generations:        ${stats.failed}`);

  if (stats.rejected > 0) {
    console.log("\n⚠️  Sample QC Rejections (First 5):");
    const rejections = (Object.values(store) as EnrichedVideoData[])
      .filter((v) => v.status === "rejected")
      .slice(0, 5);
    for (const r of rejections) {
      console.log(`   • [${r.video_id}] "${r.seo_title || "Unknown"}": ${r.rejection_reason || "QC check failed"}`);
    }
  }

  console.log("\n💡 Next Recommended Actions:");
  if (stats.enriched < 200) {
    console.log(`   • Run 'npm run seo:enrich' with GEMINI_API_KEY to enrich homepage & Tier-1 categories.`);
    console.log(`   • Set ENFORCE_INDEXING_GATE=false so sitemaps submit all active videos during growth.`);
  } else {
    console.log(`   • High quality threshold met (${stats.enriched} videos).`);
    console.log(`   • You can optionally set ENFORCE_INDEXING_GATE=true to curate video sitemaps.`);
  }
  console.log("==================================================\n");
}

runReport()
  .catch((err) => {
    console.error("Fatal error during SEO report:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeEnrichmentDb();
  });
