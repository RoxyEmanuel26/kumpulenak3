import { NextRequest, NextResponse } from "next/server";
import { buildSitemapSegment } from "@/lib/sitemap";

export const runtime = "edge";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const segmentId = parseInt(resolvedParams.id, 10);
    if (isNaN(segmentId)) {
      return new NextResponse("Invalid segment ID", { status: 400 });
    }

    const sitemapItems = await buildSitemapSegment(segmentId);
    
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapItems.map((item) => `  <url>
    <loc>${item.url}</loc>
    ${item.lastModified ? `<lastmod>${new Date(item.lastModified).toISOString()}</lastmod>` : ""}
    ${item.changeFrequency ? `<changefreq>${item.changeFrequency}</changefreq>` : ""}
    ${item.priority !== undefined ? `<priority>${item.priority.toFixed(2)}</priority>` : ""}
  </url>`).join("\n")}
</urlset>`;

    return new NextResponse(xml.trim(), {
      status: 200,
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=43200, s-maxage=43200, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("[Sitemap Segment] Generation failed:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
