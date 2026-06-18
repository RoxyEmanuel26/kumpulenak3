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
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    
    // Check if it's a relative path (starts with / and not //)
    const isRelative = redirect.startsWith("/") && !redirect.startsWith("//");
    // Check if it's an absolute path matching the app's base URL
    const isAbsoluteToApp = redirect.startsWith(appUrl);
    
    if (isRelative || isAbsoluteToApp) {
      safeRedirect = redirect;
    }
  }

  // Perform redirect
  return NextResponse.redirect(new URL(safeRedirect, request.url));
}
