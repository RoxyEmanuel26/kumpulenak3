import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "./lib/auth/jwt";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Protect all /api/admin routes (return JSON 401)
  if (
    pathname.startsWith("/api/admin") &&
    pathname !== "/api/admin/login" &&
    pathname !== "/api/admin/logout"
  ) {
    const sessionToken = request.cookies.get("admin_session")?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyJWT(sessionToken);
    if (!payload) {
      const response = NextResponse.json({ error: "Session expired" }, { status: 401 });
      response.cookies.delete("admin_session");
      return response;
    }
  }

  // 2. Protect all /admin pages (redirect to login)
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const sessionToken = request.cookies.get("admin_session")?.value;

    if (!sessionToken) {
      const url = new URL("/admin/login", request.url);
      return NextResponse.redirect(url);
    }

    const payload = await verifyJWT(sessionToken);
    if (!payload) {
      // Token is invalid or expired -> Clear cookie and redirect to login
      const url = new URL("/admin/login", request.url);
      const response = NextResponse.redirect(url);
      response.cookies.delete("admin_session");
      return response;
    }
  }

  // 3. Redirect authenticated users trying to access login page back to dashboard
  if (pathname === "/admin/login") {
    const sessionToken = request.cookies.get("admin_session")?.value;
    if (sessionToken) {
      const payload = await verifyJWT(sessionToken);
      if (payload) {
        const url = new URL("/admin", request.url);
        return NextResponse.redirect(url);
      }
    }
  }

  return NextResponse.next();
}

// Intercept both /admin dashboard and /api/admin endpoints
export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

