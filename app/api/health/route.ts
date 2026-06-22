/**
 * app/api/health/route.ts
 *
 * Minimal health check endpoint.
 *
 * Used by:
 *  - Docker HEALTHCHECK instruction (Dockerfile)
 *  - External uptime monitors (UptimeRobot, BetterStack, etc.)
 *  - Post-deploy smoke tests
 *
 * Intentionally minimal — returns only what monitoring needs.
 * Does NOT expose internal state, DB status, or env vars.
 *
 * Served at: /api/health
 * Method: GET
 * Response: 200 { status: "ok", ts: <unix ms> }
 *
 * NOTE: /api/ is disallowed in robots.txt, so this endpoint
 * will not be crawled or indexed by search engines.
 */

export const dynamic = "force-dynamic"; // Never cache — health checks must be live

export async function GET() {
  return Response.json(
    {
      status: "ok",
      ts: Date.now(),
    },
    {
      status: 200,
      headers: {
        // Instruct all caches (Cloudflare, CDN, browser) to never cache this response
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
