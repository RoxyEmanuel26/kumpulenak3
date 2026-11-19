import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import {
  cleanEpornerText,
  EpornerAPI,
  getDbCache,
  setDbCache,
  coalesceInFlight,
  DB_VIDEO_CACHE_TTL,
} from "@/lib/api/eporner";

const RELATED_CACHE_HEADER = "public, s-maxage=3600, stale-while-revalidate=86400";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let resolvedId = "";
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    resolvedId = id;

    const cacheKey = `db:api-related:${id}`;
    const memHit = getDbCache<Array<Record<string, unknown>>>(cacheKey);
    if (memHit) {
      return NextResponse.json(memHit, {
        headers: { "Cache-Control": RELATED_CACHE_HEADER },
      });
    }

    const result = await coalesceInFlight(cacheKey, async () => {
      // Get the video's tag and category IDs
      const videoRows = await sql`
        SELECT
          v.id,
          COALESCE(array_agg(DISTINCT vt."tagId") FILTER (WHERE vt."tagId" IS NOT NULL), '{}') AS "tagIds",
          COALESCE(array_agg(DISTINCT vc."categoryId") FILTER (WHERE vc."categoryId" IS NOT NULL), '{}') AS "categoryIds"
        FROM "Video" v
        LEFT JOIN "VideoTag" vt ON v.id = vt."videoId"
        LEFT JOIN "VideoCategory" vc ON v.id = vc."videoId"
        WHERE v.id = ${id}
        GROUP BY v.id
      `;

      if (!videoRows[0]) {
        return null;
      }

      const tagIds = videoRows[0].tagIds as string[];
      const categoryIds = videoRows[0].categoryIds as string[];

      // Fetch related videos matching categories or tags
      const related = await sql`
        SELECT
          v.id, v.title, v.keywords, v.views, v.rate, v."addedAt", v."lengthSec",
          v."lengthMin", v."embedUrl", v."defaultThumb", v.thumbs
        FROM "Video" v
        WHERE v.status = 'ACTIVE'
          AND v.id != ${id}
          AND (
            EXISTS (
              SELECT 1 FROM "VideoCategory" vc WHERE vc."videoId" = v.id AND vc."categoryId" = ANY(${categoryIds})
            )
            OR EXISTS (
              SELECT 1 FROM "VideoTag" vt WHERE vt."videoId" = v.id AND vt."tagId" = ANY(${tagIds})
            )
          )
        ORDER BY v.views DESC
        LIMIT 4
      `;

      return related.map((v) => ({
        ...v,
        title: cleanEpornerText(v.title as string),
        keywords: cleanEpornerText((v.keywords as string) || ""),
      }));
    });

    if (result === null) {
      return NextResponse.json({ error: "Video not found." }, { status: 404 });
    }

    setDbCache(cacheKey, result, DB_VIDEO_CACHE_TTL);

    return NextResponse.json(result, {
      headers: {
        // Related video lists are stable — cache in RAM (6h) + CDN edge (1h).
        "Cache-Control": RELATED_CACHE_HEADER,
      },
    });
  } catch (err) {
    const error = err as Error;
    console.warn("[RelatedVideosAPI] DB failed, falling back to Eporner popular videos:", error.message);
    try {
      const fallback = await EpornerAPI.search(
        { order: "most-popular", per_page: 5 },
        { allowDbFallback: false }
      );
      const filtered = (fallback.videos || [])
        .filter((v) => v.id !== resolvedId)
        .slice(0, 4)
        .map((v) => ({
          id: v.id,
          title: v.title,
          keywords: v.keywords,
          views: v.views,
          rate: v.rate,
          addedAt: v.added,
          lengthSec: v.length_sec,
          lengthMin: v.length_min,
          embedUrl: v.embed,
          defaultThumb: v.default_thumb,
          thumbs: v.thumbs,
        }));
      return NextResponse.json(filtered, {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
        },
      });
    } catch {
      return NextResponse.json([], { status: 200 });
    }
  }
}
