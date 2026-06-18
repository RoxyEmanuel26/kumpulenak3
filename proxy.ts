import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "./lib/auth/jwt";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect all /admin routes except /admin/login
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

  // Redirect authenticated users trying to access login page back to dashboard
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

// Intercept requests matching /admin and any subpaths
export const config = {
  matcher: ["/admin/:path*"],
};
