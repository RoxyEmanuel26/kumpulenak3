import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "./lib/auth/jwt";

/**
 * Security headers applied to every response.
 * These protect against clickjacking, MIME sniffing, XSS, and other common attacks.
 */
const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';",
};

function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

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
      return applySecurityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const payload = await verifyJWT(sessionToken);
    if (!payload) {
      const response = NextResponse.json({ error: "Session expired" }, { status: 401 });
      response.cookies.delete("admin_session");
      return applySecurityHeaders(response);
    }
  }

  // 2. Protect all /admin pages (redirect to login)
  if (isAdminPage && pathname !== "/admin/login") {
    const sessionToken = request.cookies.get("admin_session")?.value;

    if (!sessionToken) {
      const url = new URL("/admin/login", request.url);
      const response = NextResponse.redirect(url);
      return applySecurityHeaders(response);
    }

    const payload = await verifyJWT(sessionToken);
    if (!payload) {
      // Token is invalid or expired -> Clear cookie and redirect to login
      const url = new URL("/admin/login", request.url);
      const response = NextResponse.redirect(url);
      response.cookies.delete("admin_session");
      return applySecurityHeaders(response);
    }
  }

  // 3. Redirect authenticated users trying to access login page back to dashboard
  if (pathname === "/admin/login") {
    const sessionToken = request.cookies.get("admin_session")?.value;
    if (sessionToken) {
      const payload = await verifyJWT(sessionToken);
      if (payload) {
        const url = new URL("/admin", request.url);
        return applySecurityHeaders(NextResponse.redirect(url));
      }
    }
  }

  // 4. Apply security headers to all other responses
  return applySecurityHeaders(NextResponse.next());
}

// Intercept admin routes AND all other routes for security headers
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
