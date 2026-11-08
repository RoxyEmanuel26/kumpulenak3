import { NextRequest, NextResponse } from "next/server";
import { buildSitemapXml } from "@/lib/sitemap";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const segmentId = parseInt(resolvedParams.id, 10);
    if (isNaN(segmentId) || segmentId < 0) {
      return new NextResponse("Invalid segment ID", { status: 400 });
    }

    const xml = await buildSitemapXml(segmentId);

    // Empty / unavailable video segment: 404 + no-store so CDN never caches it
    // and Google re-checks as soon as videos exist.
    if (xml === null) {
      return new NextResponse("Sitemap segment not available", {
        status: 404,
        headers: { "Cache-Control": "no-store" },
      });
    }

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=43200, s-maxage=43200, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("[Sitemap Segment] Generation failed:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
