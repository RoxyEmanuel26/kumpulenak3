import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { cleanEpornerText, EpornerAPI } from "@/lib/api/eporner";

export const runtime = "edge";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const sql = neon(process.env.DATABASE_URL!);
    const rows = await sql`
      SELECT
        v.id, v.title, v.keywords, v.views, v.rate, v."addedAt", v."lengthSec",
        v."lengthMin", v."embedUrl", v."defaultThumb", v.thumbs, v.status,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('tag', jsonb_build_object('name', t.name, 'id', t.id))) 
          FILTER (WHERE t.id IS NOT NULL), '[]'
        ) AS tags,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('category', jsonb_build_object('name', c.name, 'id', c.id)))
          FILTER (WHERE c.id IS NOT NULL), '[]'
        ) AS categories
      FROM "Video" v
      LEFT JOIN "VideoTag" vt ON v.id = vt."videoId"
      LEFT JOIN "Tag" t ON vt."tagId" = t.id
      LEFT JOIN "VideoCategory" vc ON v.id = vc."videoId"
      LEFT JOIN "Category" c ON vc."categoryId" = c.id
      WHERE v.id = ${id}
      GROUP BY v.id
    `;

    const video = rows[0];

    if (!video || video.status !== "ACTIVE") {
      // Fallback: If not in local DB (e.g. hasn't synced yet, or DB was reset but local storage remains),
      // fetch directly from Eporner API to serve basic metadata needed by ContinueWatching.
      try {
        const fallbackVideo = await EpornerAPI.getById(id);
        if (fallbackVideo) {
          return NextResponse.json({
            id: fallbackVideo.id,
            title: cleanEpornerText(fallbackVideo.title),
            keywords: cleanEpornerText(fallbackVideo.keywords || ""),
            defaultThumb: fallbackVideo.default_thumb,
            thumbs: fallbackVideo.thumbs,
            lengthSec: fallbackVideo.length_sec,
            rate: fallbackVideo.rate,
            views: fallbackVideo.views,
            addedAt: fallbackVideo.added,
            status: "ACTIVE"
          }, {
            headers: {
              // Cache Eporner fallback for 5 min at CDN edge, serve stale for 1hr
              'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
            },
          });
        }
      } catch (fallbackErr) {
        console.error(`[VideoDetailsAPI] Fallback fetch failed for ${id}:`, fallbackErr);
      }

      return NextResponse.json(
        { error: "Video not found or is no longer active." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: video.id,
      title: cleanEpornerText(video.title as string),
      keywords: cleanEpornerText((video.keywords as string) || ""),
      views: video.views,
      rate: video.rate,
      addedAt: video.addedAt,
      lengthSec: video.lengthSec,
      lengthMin: video.lengthMin,
      embedUrl: video.embedUrl,
      defaultThumb: video.defaultThumb,
      thumbs: video.thumbs,
      status: video.status,
      tags: video.tags,
      categories: video.categories,
    }, {
      headers: {
        // Cache at CDN edge for 5 minutes, serve stale for up to 1 hour while revalidating.
        // 10,000 ContinueWatching requests for the same video = 1 DB hit per 5 min.
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
      },
    });
  } catch (err) { const error = err as Error;
    console.error("[VideoDetailsAPI] Error fetching video details:", error.message);
    return NextResponse.json(
      { error: "Failed to load video details." },
      { status: 500 }
    );
  }
}
