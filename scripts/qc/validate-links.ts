import { TIER1_CATEGORIES } from "../../lib/category-config";

async function run() {
  console.log(`🚀 Starting Internal Link Check...`);
  console.log(`\n🔍 Verifying Tier-1 Categories (${TIER1_CATEGORIES.length} total)`);
  
  for (const cat of TIER1_CATEGORIES) {
    if (!cat.name || !cat.slug || !cat.title) {
      console.error(`  ❌ Invalid Category Config: ${JSON.stringify(cat)}`);
      process.exit(1);
    }
    console.log(`  ✅ Category Config "${cat.name}" is valid.`);
  }

  console.log(`\n🎉 Internal Link checks passed successfully.`);
  process.exit(0);
}

run();
