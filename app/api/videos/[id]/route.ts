import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import {
  cleanEpornerText,
  EpornerAPI,
  parseJsonObject,
  getDbCache,
  setDbCache,
  coalesceInFlight,
  DB_VIDEO_CACHE_TTL,
} from "@/lib/api/eporner";

const VIDEO_API_CACHE_HEADER = "public, s-maxage=3600, stale-while-revalidate=86400";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const cacheKey = `db:api-video:${id}`;
    const memHit = getDbCache<Record<string, unknown>>(cacheKey);
    if (memHit) {
      return NextResponse.json(memHit, {
        headers: { "Cache-Control": VIDEO_API_CACHE_HEADER },
      });
    }

    let video: Record<string, unknown> | undefined;
    try {
      video = await coalesceInFlight(cacheKey, async () => {
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
        return rows[0] as Record<string, unknown> | undefined;
      });
    } catch (dbErr) {
      console.warn(`[VideoDetailsAPI] DB lookup failed for ${id}, falling back to Eporner:`, (dbErr as Error).message);
    }

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
              "Cache-Control": VIDEO_API_CACHE_HEADER,
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

    const payload = {
      id: video.id,
      title: cleanEpornerText(video.title as string),
      keywords: cleanEpornerText((video.keywords as string) || ""),
      views: video.views,
      rate: video.rate,
      addedAt: video.addedAt,
      lengthSec: video.lengthSec,
      lengthMin: video.lengthMin,
      embedUrl: video.embedUrl,
      defaultThumb: parseJsonObject(video.defaultThumb, null),
      thumbs: parseJsonObject(video.thumbs, []),
      status: video.status,
      tags: video.tags,
      categories: video.categories,
    };

    setDbCache(cacheKey, payload, DB_VIDEO_CACHE_TTL);

    return NextResponse.json(payload, {
      headers: {
        // Cache in server RAM (6h) + CDN edge (1h) so ContinueWatching/bots never wake Neon DB every 5 min.
        "Cache-Control": VIDEO_API_CACHE_HEADER,
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
