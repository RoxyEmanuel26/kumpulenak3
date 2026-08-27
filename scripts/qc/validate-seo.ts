import { sql } from "../../lib/db";
import { TIER1_CATEGORIES } from "../../lib/category-config";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.lusthub.web.id";

const REQUIRED_TAGS = [
  { name: "Title", regex: /<title[^>]*>([\s\S]*?)<\/title>/i },
  { name: "Meta Description", regex: /<meta\s+name="description"\s+content="([^"]*)"/i },
  { name: "Canonical URL", regex: /<link\s+rel="canonical"\s+href="([^"]*)"/i },
  { name: "OpenGraph Title", regex: /<meta\s+property="og:title"\s+content="([^"]*)"/i },
  { name: "JSON-LD Schema", regex: /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i },
];

async function validateUrl(url: string, isVideo = false) {
  console.log(`\n🔍 Validating SEO for: ${url}`);
  try {
    let res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP Error: ${res.status}`);
    }
    let html = await res.text();
    let finalUrl = res.url; // Capture URL after any HTTP redirects

    // Handle Next.js App Router streaming redirects (meta refresh)
    const metaRefreshMatch = html.match(/<meta[^>]*http-equiv="refresh"[^>]*content="[^"]*url=([^"]+)"[^>]*>/i);
    if (metaRefreshMatch && metaRefreshMatch[1]) {
      const redirectUrl = new URL(metaRefreshMatch[1], finalUrl).toString();
      res = await fetch(redirectUrl);
      if (!res.ok) {
        throw new Error(`HTTP Error after meta refresh: ${res.status}`);
      }
      html = await res.text();
      finalUrl = res.url;
    }

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
          const expectedPath = new URL(finalUrl).pathname; // Check against final redirected path
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
  const categories = TIER1_CATEGORIES.slice(0, 2);
  
  for (const cat of categories) {
    await validateUrl(`${BASE_URL}/category/${cat.slug}`);
  }

  // Dynamic Videos (sample 2)
  const videos = await sql`
    SELECT id FROM "Video"
    WHERE status = 'ACTIVE'
    ORDER BY "addedAt" DESC
    LIMIT 2
  `;

  for (const v of videos) {
    await validateUrl(`${BASE_URL}/watch/${v.id}`, true);
  }

  console.log(`\n🎉 All SEO metadata checks passed successfully.`);
  process.exit(0);
}

run();
