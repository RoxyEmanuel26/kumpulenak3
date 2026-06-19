import { NextRequest, NextResponse } from "next/server";
import { syncVideoToDatabase } from "../../../../lib/video/sync";
import { timingSafeEqual } from "node:crypto";

/**
 * Timing-safe comparison to prevent timing attacks on webhook secret.
 */
function verifyWebhookSecret(provided: string, expected: string): boolean {
  try {
    const a = Buffer.from(provided, "utf-8");
    const b = Buffer.from(expected, "utf-8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Webhook authentication — REQUIRED, never bypass
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("[WebhookFeed] WEBHOOK_SECRET is not configured. Rejecting request.");
      return NextResponse.json(
        { error: "Server misconfiguration." },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized: Missing Authorization header." },
        { status: 401 }
      );
    }

    // Accept "Bearer <secret>" or raw secret
    const providedSecret = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;

    if (!verifyWebhookSecret(providedSecret, webhookSecret)) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid webhook secret token." },
        { status: 401 }
      );
    }

    // Replay Protection: Require and validate timestamp
    const timestampStr = request.headers.get("X-Timestamp");
    if (!timestampStr) {
      return NextResponse.json(
        { error: "Unauthorized: Missing X-Timestamp header for replay protection." },
        { status: 401 }
      );
    }

    const requestTime = parseInt(timestampStr, 10);
    const currentTime = Date.now();
    const ALLOWED_DRIFT_MS = 5 * 60 * 1000; // 5 minutes

    if (isNaN(requestTime) || Math.abs(currentTime - requestTime) > ALLOWED_DRIFT_MS) {
      return NextResponse.json(
        { error: "Unauthorized: Request expired or timestamp out of bounds (replay protection)." },
        { status: 401 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Bad Request: Invalid JSON body." },
        { status: 400 }
      );
    }
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
    // Fix #14: Do not expose internal error details to client
    return NextResponse.json(
      { error: "An internal error occurred while processing the webhook." },
      { status: 500 }
    );
  }
}
