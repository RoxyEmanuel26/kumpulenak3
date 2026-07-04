import { NextResponse } from 'next/server';
import { generateSitemaps } from '@/lib/sitemap';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function GET() {
  try {
    const sitemaps = await generateSitemaps();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lusthub.web.id';

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.map((s) => `  <sitemap>
    <loc>${baseUrl}/sitemap/${s.id}.xml</loc>
  </sitemap>`).join('\n')}
</sitemapindex>`;

    return new NextResponse(xml.trim(), {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        // Cache for 1 hour, stale-while-revalidate for 24 hours
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('[Sitemap Index] Generation failed:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
