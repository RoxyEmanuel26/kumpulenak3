import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { cleanEpornerText } from "@/lib/api/eporner";

export const runtime = "edge";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const sql = neon(process.env.DATABASE_URL!);

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
      return NextResponse.json({ error: "Video not found." }, { status: 404 });
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

    const cleanedRelated = related.map((v) => ({
      ...v,
      title: cleanEpornerText(v.title as string),
      keywords: cleanEpornerText((v.keywords as string) || ""),
    }));

    return NextResponse.json(cleanedRelated, {
      headers: {
        // Related video lists are stable — same video always returns the same related set.
        // Cache at CDN edge for 10 minutes, serve stale for up to 1 hour.
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600',
      },
    });
  } catch (err) { const error = err as Error;
    console.error("[RelatedVideosAPI] Error fetching related videos:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch related videos data." },
      { status: 500 }
    );
  }
}
