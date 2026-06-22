import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const REQUIRED_TAGS = [
  { name: "Title", regex: /<title[^>]*>([\s\S]*?)<\/title>/i },
  { name: "Meta Description", regex: /<meta\s+name="description"\s+content="([^"]*)"/i },
  { name: "Canonical URL", regex: /<link\s+rel="canonical"\s+href="([^"]*)"/i },
  { name: "OpenGraph Title", regex: /<meta\s+property="og:title"\s+content="([^"]*)"/i },
  { name: "JSON-LD Schema", regex: /<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i },
];

async function validateUrl(url: string, isVideo = false) {
  console.log(`\n🔍 Validating SEO for: ${url}`);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP Error: ${res.status}`);
    }
    const html = await res.text();

    let allPassed = true;
    for (const tag of REQUIRED_TAGS) {
      if (tag.name === "JSON-LD Schema" && !isVideo) {
        continue; 
      }

      const match = html.match(tag.regex);
      if (match && match[1]) {
        console.log(`  ✅ ${tag.name} found.`);
        if (tag.name === "Canonical URL") {
          const canonicalUrl = match[1];
          const expectedPath = new URL(url).pathname;
          const canonicalPath = new URL(canonicalUrl).pathname;
          if (expectedPath !== canonicalPath) {
            console.error(`  ❌ Canonical Mismatch: expected path ${expectedPath}, got ${canonicalPath}`);
            allPassed = false;
          }
        }
      } else {
        console.error(`  ❌ Missing ${tag.name}`);
        allPassed = false;
      }
    }

    if (!allPassed) {
      throw new Error(`SEO validation failed for ${url}`);
    }

  } catch (error) {
    console.error(`  💥 Failed: ${error}`);
    process.exit(1);
  }
}

async function run() {
  console.log(`🚀 Starting SEO & Metadata Quality Control check against ${BASE_URL}...`);

  // Static routes
  await validateUrl(`${BASE_URL}/`);
  await validateUrl(`${BASE_URL}/categories`);

  // Dynamic Categories (sample 2)
  const categories = await prisma.category.findMany({
    take: 2,
    where: {
      videos: { some: {} }
    }
  });
  
  for (const cat of categories) {
    // URL slug logic: spaces to dashes etc. In LustHub we usually slugify.
    const slug = cat.name.toLowerCase().replace(/\s+/g, "-");
    await validateUrl(`${BASE_URL}/category/${slug}`);
  }

  // Dynamic Videos (sample 2)
  const videos = await prisma.video.findMany({
    where: { status: "ACTIVE" },
    take: 2,
    orderBy: { addedAt: "desc" }
  });

  for (const v of videos) {
    await validateUrl(`${BASE_URL}/watch/${v.id}`, true);
  }

  console.log(`\n🎉 All SEO metadata checks passed successfully.`);
  process.exit(0);
}

run();
