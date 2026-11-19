import { NextRequest, NextResponse } from "next/server";
import { buildSitemapXmlWithMeta } from "@/lib/sitemap";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    if (!/^\d+$/.test(resolvedParams.id)) {
      return new NextResponse("Invalid segment ID", { status: 400 });
    }
    const segmentId = Number.parseInt(resolvedParams.id, 10);
    if (!Number.isSafeInteger(segmentId) || segmentId < 0 || segmentId > 10_000) {
      return new NextResponse("Invalid segment ID", { status: 400 });
    }

    const { xml, degraded } = await buildSitemapXmlWithMeta(segmentId);

    // Empty / unavailable video segment: 404 + no-store so CDN never caches it
    // and Google re-checks as soon as videos exist.
    if (xml === null) {
      return new NextResponse("Sitemap segment not available", {
        status: 404,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const cacheControl = degraded
      ? "no-store, no-cache, must-revalidate"
      : "public, max-age=43200, s-maxage=43200, stale-while-revalidate=86400";

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": cacheControl,
      },
    });
  } catch (error) {
    console.error("[Sitemap Segment] Generation failed:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
