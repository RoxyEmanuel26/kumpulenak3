const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function run() {
  console.log(`🚀 Starting Sitemap Quality Control check against ${BASE_URL}...`);

  try {
    // 1. Fetch main sitemap index
    console.log(`\n🔍 Fetching ${BASE_URL}/sitemap.xml`);
    const indexRes = await fetch(`${BASE_URL}/sitemap.xml`);
    if (!indexRes.ok) {
      throw new Error(`Failed to fetch sitemap index: ${indexRes.status}`);
    }
    const indexXml = await indexRes.text();

    const locRegex = /<loc>(.*?)<\/loc>/g;
    const segmentUrls = [];
    let match;
    while ((match = locRegex.exec(indexXml)) !== null) {
      segmentUrls.push(match[1]);
    }

    console.log(`  ✅ Found ${segmentUrls.length} sitemap segments.`);

    if (segmentUrls.length === 0) {
      throw new Error("No segments found in sitemap index.");
    }

    // 2. Fetch the first segment (static + categories)
    const segmentUrl = segmentUrls[0];
    console.log(`\n🔍 Fetching segment ${segmentUrl}`);
    const segmentRes = await fetch(segmentUrl);
    if (!segmentRes.ok) {
      throw new Error(`Failed to fetch segment: ${segmentRes.status}`);
    }
    const segmentXml = await segmentRes.text();

    const urlRegex = /<loc>(.*?)<\/loc>/g;
    const pageUrls = [];
    while ((match = urlRegex.exec(segmentXml)) !== null) {
      pageUrls.push(match[1]);
    }

    console.log(`  ✅ Found ${pageUrls.length} URLs in segment.`);

    if (pageUrls.length > 50000) {
      throw new Error("Segment exceeds 50k URL limit!");
    }

    // 3. Sample 5 URLs to ensure they return 200 OK
    const sampleSize = Math.min(5, pageUrls.length);
    const sampleUrls = pageUrls.sort(() => 0.5 - Math.random()).slice(0, sampleSize);

    console.log(`\n🔍 Verifying ${sampleSize} random URLs...`);
    for (const url of sampleUrls) {
      const pageRes = await fetch(url, { method: 'HEAD' });
      if (!pageRes.ok) {
        throw new Error(`URL failed validation: ${url} returned ${pageRes.status}`);
      }
      console.log(`  ✅ ${url} returned 200 OK`);
    }

    console.log(`\n🎉 Sitemap checks passed successfully.`);
    process.exit(0);
  } catch (error) {
    console.error(`  💥 Failed: ${error}`);
    process.exit(1);
  }
}

run();
