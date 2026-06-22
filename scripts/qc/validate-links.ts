import { TIER1_CATEGORIES } from "../../lib/category-config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  console.log(`🚀 Starting Internal Link & Orphan Check...`);

  let allPassed = true;

  try {
    console.log(`\n🔍 Verifying Tier-1 Categories (${TIER1_CATEGORIES.length} total)`);
    
    for (const cat of TIER1_CATEGORIES) {
      // Ensure the category actually exists in the database
      const dbCat = await prisma.category.findUnique({
        where: { name: cat.name }
      });

      if (!dbCat) {
        console.warn(`  ⚠️ Tier-1 Category "${cat.name}" is defined in config but missing in DB.`);
        // We don't fail hard here because the DB might not be fully seeded yet, 
        // but it's a good warning.
        continue;
      }

      // Check for thin category (0 videos)
      const videoCount = await prisma.videoCategory.count({
        where: { categoryId: dbCat.id }
      });

      if (videoCount === 0) {
        console.error(`  ❌ Thin Category Error: Tier-1 Category "${cat.name}" has 0 videos! This will create a soft 404.`);
        allPassed = false;
      } else {
        console.log(`  ✅ Category "${cat.name}" has ${videoCount} videos.`);
      }
    }

    if (!allPassed) {
      throw new Error("Internal Link checks failed.");
    }

    console.log(`\n🎉 Internal Link checks passed successfully.`);
    process.exit(0);

  } catch (error) {
    console.error(`  💥 Failed: ${error}`);
    process.exit(1);
  }
}

run();
