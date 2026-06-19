import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "./lib/auth/jwt";

// Security headers are now centralized in next.config.ts and applied natively.

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminApi = pathname === "/api/admin" || pathname.startsWith("/api/admin/");
  const isAdminPage = pathname === "/admin" || pathname.startsWith("/admin/");

  // 1. Protect all /api/admin routes (return JSON 401)
  if (
    isAdminApi &&
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
  if (isAdminPage && pathname !== "/admin/login") {
    const sessionToken = request.cookies.get("admin_session")?.value;

    if (!sessionToken) {
      const url = new URL("/admin/login", request.url);
      const response = NextResponse.redirect(url);
      return response;
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

  // 4. Proceed with the request
  return NextResponse.next();
}

// Intercept routes for authentication checks
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
