import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { cleanEpornerText } from "@/lib/api/eporner";

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
        { error: "Video not found or is no longer active." },
        { status: 404 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { aiScoreTrending, aiScoreEngagement, aiScoreSpam, aiSpamFlag, ...safeVideo } = video;

    return NextResponse.json({
      ...safeVideo,
      title: cleanEpornerText(video.title),
      keywords: cleanEpornerText(video.keywords || ""),
    });
  } catch (err) { const error = err as Error;
    console.error("[VideoDetailsAPI] Error fetching video details:", error.message);
    return NextResponse.json(
      { error: "Failed to load video details." },
      { status: 500 }
    );
  }
}
