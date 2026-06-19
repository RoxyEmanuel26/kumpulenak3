import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const logId = searchParams.get("logId");
  const redirect = searchParams.get("redirect") || "/";

  if (logId) {
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
