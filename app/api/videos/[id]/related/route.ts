import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

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
      return NextResponse.json({ error: "Video tidak ditemukan." }, { status: 404 });
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

    return NextResponse.json(related);
  } catch (error: any) {
    console.error("[RelatedVideosAPI] Error fetching related videos:", error.message);
    return NextResponse.json(
      { error: "Gagal mengambil data video terkait." },
      { status: 500 }
    );
  }
}
