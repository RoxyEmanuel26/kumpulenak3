import { NextRequest, NextResponse } from "next/server";
import { EPORNER_THUMB_PATH_REGEX } from "@/lib/video/thumb-url";

const UPSTREAM_THUMB_ORIGIN = "https://static-ca-cdn.eporner.com/thumbs";
const THIRTY_DAYS_SECONDS = 2_592_000;

/**
 * First-party Cloudflare-cached thumbnail proxy: `/thumbs/[...path]`
 *
 * Why this exists:
 * Google Search Console reported 153+ "Thumbnail could not be crawled due to hostload"
 * errors because thousands of adult sites share `static-ca-cdn.eporner.com`.
 * Serving `.jpg` paths from our own domain lets Cloudflare cache them automatically
 * across 300+ global edge POPs (US, Europe, Asia) for 30 days with ~0% origin CPU
 * (pure stream pass-through, no sharp decoding).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolved = await params;
  const segments = resolved.path;

  if (!Array.isArray(segments) || segments.length === 0) {
    return new NextResponse("Invalid thumbnail path", {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    });
  }

  // Reject traversal or malformed segments strictly before joining
  if (segments.some((seg) => !seg || seg.includes("..") || seg.includes("\\") || seg.includes("/"))) {
    return new NextResponse("Invalid thumbnail path", {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const joinedPath = segments.join("/");
  if (!EPORNER_THUMB_PATH_REGEX.test(joinedPath)) {
    return new NextResponse("Invalid thumbnail path", {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const upstreamUrl = `${UPSTREAM_THUMB_ORIGIN}/${joinedPath}`;

  try {
    const upstreamRes = await fetch(upstreamUrl, {
      signal: AbortSignal.timeout(8000),
      headers: {
        "Accept": "image/jpeg,image/*;q=0.8",
      },
    });

    if (upstreamRes.status === 404 || upstreamRes.status === 410) {
      return new NextResponse("Thumbnail not found", {
        status: 404,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const contentType = upstreamRes.headers.get("content-type") || "";
    if (!upstreamRes.ok || !contentType.toLowerCase().startsWith("image/")) {
      return new NextResponse("Upstream thumbnail unavailable", {
        status: 502,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const body = await upstreamRes.arrayBuffer();
    if (body.byteLength === 0) {
      return new NextResponse("Empty upstream thumbnail", {
        status: 502,
        headers: { "Cache-Control": "no-store" },
      });
    }

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType.split(";")[0] || "image/jpeg",
        "Content-Length": String(body.byteLength),
        "Cache-Control": `public, max-age=${THIRTY_DAYS_SECONDS}, s-maxage=${THIRTY_DAYS_SECONDS}, immutable`,
        "CDN-Cache-Control": `public, max-age=${THIRTY_DAYS_SECONDS}`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Thumbnail fetch timeout", {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
