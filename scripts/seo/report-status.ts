import { 
  getEnrichmentStats, 
  getAllEnrichedVideos,
  EnrichedVideoData 
} from "../../lib/seo/enrichment-store";

function runReport() {
  console.log("==================================================");
  console.log("📊 LustHub SEO Indexing & Quality Status Report 📊");
  console.log("==================================================\n");

  const stats = getEnrichmentStats();
  const store: Record<string, EnrichedVideoData> = getAllEnrichedVideos();
  const isGateEnforced = process.env.ENFORCE_INDEXING_GATE === "true";

  console.log("🛡️  Indexing Policy (Quality Gate):");
  console.log(`   - ENFORCE_INDEXING_GATE: ${isGateEnforced ? "ENABLED (Strict Quality Gate)" : "DISABLED (Permissive Growth Mode)"}`);
  if (isGateEnforced) {
    console.log("   -> Only videos with status 'enriched' emit 'index, follow'.");
    console.log("   -> Un-enriched/thin videos emit 'noindex, follow' to prevent soft-404 penalties.");
  } else {
    console.log("   -> All catalog videos emit 'index, follow' to protect initial organic reach");
    console.log("      until the first major enrichment batch completes.");
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
    console.log(`   • Run 'npm run seo:enrich' with GEMINI_API_KEY to enrich the top 200 videos.`);
    console.log(`   • Keep ENFORCE_INDEXING_GATE=false until at least 200 high-traffic videos are enriched.`);
  } else {
    console.log(`   • High quality threshold met (${stats.enriched} videos).`);
    console.log(`   • You can safely set ENFORCE_INDEXING_GATE=true to lock out thin pages.`);
  }
  console.log("==================================================\n");
}

runReport();
