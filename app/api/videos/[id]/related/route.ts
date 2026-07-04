import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { cleanEpornerText } from "@/lib/api/eporner";

export const runtime = "edge";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const video = await prisma.video.findUnique({
      where: { id },
      include: { 
        tags: { select: { tagId: true } }, 
        categories: { select: { categoryId: true } } 
      },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found." }, { status: 404 });
    }

    const tagIds = video.tags.map((t) => t.tagId);
    const categoryIds = video.categories.map((c) => c.categoryId);

    // Fetch related videos matching categories or tags
    const related = await prisma.video.findMany({
      where: {
        status: "ACTIVE",
        id: { not: video.id },
        OR: [
          { categories: { some: { categoryId: { in: categoryIds } } } },
          { tags: { some: { tagId: { in: tagIds } } } },
        ],
      },
      take: 4, // 4 items for modal sidebar recommendations
      orderBy: { views: "desc" },
    });

    const cleanedRelated = related.map((v) => ({
      ...v,
      title: cleanEpornerText(v.title),
      keywords: cleanEpornerText(v.keywords || ""),
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
