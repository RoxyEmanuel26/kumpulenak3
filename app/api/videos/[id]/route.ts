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
        tags: { include: { tag: true } },
        categories: { include: { category: true } },
      },
    });

    if (!video || video.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Video tidak ditemukan atau sudah tidak aktif." },
        { status: 404 }
      );
    }

    return NextResponse.json(video);
  } catch (error: any) {
    console.error("[VideoDetailsAPI] Error fetching video details:", error.message);
    return NextResponse.json(
      { error: "Gagal memuat data detail video." },
      { status: 500 }
    );
  }
}
