import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db/prisma";

// Rate limiter to prevent DB write amplification / DoS
const TRACK_LIMITS = new Map<string, { count: number; resetAt: number }>();
const MAX_CLICKS_PER_MINUTE = 15;
const WINDOW_MS = 60 * 1000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = TRACK_LIMITS.get(ip);

  if (!record || now > record.resetAt) {
    TRACK_LIMITS.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  record.count++;
  return record.count > MAX_CLICKS_PER_MINUTE;
}

// Clean up memory leaks in server environment
if (typeof globalThis !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globalVal = globalThis as any;
  if (!globalVal.__trackLimiterInterval) {
    globalVal.__trackLimiterInterval = setInterval(() => {
      const now = Date.now();
      for (const [ip, record] of TRACK_LIMITS) {
        if (now > record.resetAt) {
          TRACK_LIMITS.delete(ip);
        }
      }
    }, 5 * 60 * 1000);
    // Unref interval to allow graceful shutdown
    if (globalVal.__trackLimiterInterval.unref) {
      globalVal.__trackLimiterInterval.unref();
    }
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const logId = searchParams.get("logId");
  const redirect = searchParams.get("redirect") || "/";

  if (logId) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "unknown";

    if (!isRateLimited(ip)) {
      try {
        // Record the click event
        await prisma.telegramClick.create({
          data: {
            broadcastLogId: logId,
          },
        });
      } catch (err) {
        const error = err as Error;
        console.error("[TrackAPI] Failed to record telegram click:", error.message);
      }
    } else {
      console.warn(`[TrackAPI] Rate limit exceeded for IP: ${ip}. Skipping DB write.`);
    }
  }

  // Perform redirect validation to prevent Open Redirect vulnerability
  let safeRedirect = "/";
  if (redirect) {
    try {
      // If it starts with a single slash (and not //), it's safe
      if (redirect.startsWith("/") && !redirect.startsWith("//")) {
        safeRedirect = redirect;
      } else {
        // Otherwise, strictly parse and validate the origin
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
        const parsedAppUrl = new URL(appUrl);
        const parsedRedirect = new URL(redirect);
        
        if (parsedRedirect.origin === parsedAppUrl.origin) {
          safeRedirect = redirect;
        }
      }
    } catch {
      // Invalid URL or parsing failed, fallback to safe default
      safeRedirect = "/";
    }
  }

  // Perform redirect
  return NextResponse.redirect(new URL(safeRedirect, request.url));
}
