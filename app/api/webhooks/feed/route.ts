import { NextRequest, NextResponse } from "next/server";
import { syncVideoToDatabase } from "../../../../lib/video/sync";

export async function POST(request: NextRequest) {
  try {
    // Webhook authentication check
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (webhookSecret) {
      const authHeader = request.headers.get("Authorization") || request.nextUrl.searchParams.get("secret");
      const expectedAuth = `Bearer ${webhookSecret}`;
      if (authHeader !== expectedAuth && authHeader !== webhookSecret) {
        return NextResponse.json(
          { error: "Unauthorized: Invalid webhook secret token." },
          { status: 401 }
        );
      }
    }

    const body = await request.json();
    const { videoId } = body;

    if (!videoId) {
      return NextResponse.json(
        { error: "The videoId parameter is required." },
        { status: 400 }
      );
    }

    console.log(`[WebhookFeed] Received ping for video ID: ${videoId}`);
    const video = await syncVideoToDatabase(videoId);

    return NextResponse.json({
      success: true,
      message: "Video successfully synced via Webhook.",
      video: {
        id: video.id,
        title: video.title,
        status: video.status,
      },
    });
  } catch (err) { const error = err as Error;
    console.error("[WebhookFeed] Error processing webhook ping:", error.message);
    return NextResponse.json(
      { error: `An error occurred while processing webhook sync: ${error.message}` },
      { status: 500 }
    );
  }
}

