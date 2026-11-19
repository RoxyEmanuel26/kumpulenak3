import { NextResponse } from 'next/server';
import { generateSitemapsWithMeta } from '@/lib/sitemap';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { sitemaps, degraded } = await generateSitemapsWithMeta();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.lusthub.web.id';

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.map((s) => `  <sitemap>
    <loc>${baseUrl}/sitemap/${s.id}.xml</loc>${s.lastModified ? `\n    <lastmod>${s.lastModified}</lastmod>` : ''}
  </sitemap>`).join('\n')}
</sitemapindex>`;

    // Never allow Cloudflare or intermediate proxies to cache a degraded/1-segment
    // sitemap index when Neon DB was cold-starting or temporarily unreachable.
    const cacheControl =
      degraded || sitemaps.length <= 1
        ? 'no-store, no-cache, must-revalidate'
        : 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400';

    return new NextResponse(xml.trim(), {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': cacheControl,
      },
    });
  } catch (error) {
    console.error('[Sitemap Index] Generation failed:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
