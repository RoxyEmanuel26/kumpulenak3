const https = require('https');

const routes = [
  'https://www.lusthub.web.id/',
  'https://www.lusthub.web.id/categories',
  'https://www.lusthub.web.id/category/japanese',
  'https://www.lusthub.web.id/about',
  'https://www.lusthub.web.id/contact',
  'https://www.lusthub.web.id/dmca',
];

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, html: data }));
    }).on('error', reject);
  });
}

async function verify() {
  console.log('==================================================');
  console.log('🔍 SSR HTML INSPECTION REPORT');
  console.log('==================================================\n');

  for (const url of routes) {
    try {
      const { status, html } = await fetchUrl(url);
      console.log(`URL: ${url}`);
      console.log(`HTTP Status: ${status}`);

      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : '❌ MISSING';

      const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
      const desc = descMatch ? descMatch[1].trim() : '❌ MISSING';

      const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
      const h1 = h1Match ? h1Match[1].replace(/<[^>]+>/g, '').trim() : '❌ MISSING';

      const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i);
      const canonical = canonicalMatch ? canonicalMatch[1] : '❌ MISSING';

      const hasJsonLd = html.includes('application/ld+json');

      console.log(`  <title>: ${title}`);
      console.log(`  <meta description>: ${desc}`);
      console.log(`  <h1>: ${h1}`);
      console.log(`  canonical: ${canonical}`);
      console.log(`  JSON-LD: ${hasJsonLd ? '✅ Present' : '❌ Missing'}`);
      console.log('--------------------------------------------------');
    } catch (err) {
      console.error(`Error fetching ${url}:`, err.message);
    }
  }

  // Also verify robots.txt and sitemap
  console.log('\n==================================================');
  console.log('🔍 ROBOTS & SITEMAP VERIFICATION');
  console.log('==================================================\n');
  const robots = await fetchUrl('https://www.lusthub.web.id/robots.txt');
  console.log('URL: https://www.lusthub.web.id/robots.txt');
  console.log(`HTTP Status: ${robots.status}`);
  console.log('Content preview:');
  console.log(robots.html.trim());
  console.log('--------------------------------------------------');

  const sitemapIndex = await fetchUrl('https://www.lusthub.web.id/sitemap.xml');
  console.log('URL: https://www.lusthub.web.id/sitemap.xml');
  console.log(`HTTP Status: ${sitemapIndex.status}`);
  console.log(`Is valid XML: ${sitemapIndex.html.includes('<?xml') && sitemapIndex.html.includes('<sitemapindex')}`);
  console.log('Content preview:');
  console.log(sitemapIndex.html.substring(0, 300) + '...');
  console.log('--------------------------------------------------');

  const sitemap0 = await fetchUrl('https://www.lusthub.web.id/sitemap/0.xml');
  console.log('URL: https://www.lusthub.web.id/sitemap/0.xml');
  console.log(`HTTP Status: ${sitemap0.status}`);
  console.log(`Contains URL tags: ${sitemap0.html.includes('<url>')}`);
  console.log('--------------------------------------------------');
}

verify();
