import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fix #11: Remove X-Powered-By header to avoid leaking framework info
  poweredByHeader: false,
  
  // Optimize large libraries to fix Cloudflare 3MiB bundle limit
  modularizeImports: {
    "lucide-react": {
      transform: "lucide-react/dist/esm/icons/{{kebabCase member}}",
      preventFullImport: true,
    },
  },

  // Centralized security headers applied natively by Next.js to all routes
  async headers() {
    return [
      // ── Global security headers — applied to all routes ──────────────────
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            // plausible.io added to script-src (load script) and connect-src (send beacons)
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' plausible.io https://glamournakedemployee.com https://*.glamournakedemployee.com; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https: plausible.io; frame-src 'self' https://www.eporner.com https://eporner.com https://glamournakedemployee.com https://*.glamournakedemployee.com https:; object-src 'none'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },

      // ── Cache-Control Headers — ISR via Node.js Runtime ─────────────────
      //
      // Now that Edge Runtime is removed, Next.js ISR (export const revalidate)
      // works correctly on the Node.js runtime. These Cache-Control headers serve
      // as a secondary layer, instructing Cloudflare CDN to also cache the
      // server-rendered HTML at the edge level for maximum performance.
      //
      // This creates a 2-layer cache:
      //   1. Cloudflare CDN (edge): s-maxage = N seconds
      //   2. Next.js ISR (disk):   revalidate = N seconds
      //
      // Result: most visitors are served from Cloudflare without hitting the
      // Node.js server at all — dramatically reducing CPU load.
      {
        // Homepage — revalidate = 1800 (30 minutes)
        source: "/",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=1800, stale-while-revalidate=86400",
          },
        ],
      },
      {
        // Individual watch pages — revalidate = 3600 (1 hour)
        source: "/watch/:id",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        // Category pages (Tier-1 SEO pages) — revalidate = 3600 (1 hour)
        source: "/category/:slug",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        // Categories listing page — revalidate = 86400 (24 hours)
        source: "/categories",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=86400, stale-while-revalidate=86400",
          },
        ],
      },
      {
        // Search results — fresh results expected, short cache
        source: "/results",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=300, stale-while-revalidate=3600",
          },
        ],
      },
      {
        // Video detail API — used by ContinueWatching component.
        // Cache at CDN for 5 minutes; serve stale for 1 hour while revalidating.
        // Prevents N requests for the same video from all hitting the DB.
        source: "/api/videos/:id",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=300, stale-while-revalidate=3600",
          },
        ],
      },
      {
        // Related videos API — stable per video ID, cache aggressively.
        source: "/api/videos/:id/related",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=600, stale-while-revalidate=3600",
          },
        ],
      },
      {
        // Sitemap segments — regenerate daily, very safe to cache at CDN
        source: "/api/sitemap/:id",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=86400, stale-while-revalidate=86400",
          },
        ],
      },
      {
        // API routes — tell crawlers not to index these even if they slip past robots.txt
        source: "/api/(.*)",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow",
          },
        ],
      },
      {
        // Library page — belt-and-suspenders: already has noindex metadata,
        // this HTTP header reinforces it for bots that ignore meta robots.
        source: "/library",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow",
          },
        ],
      },
    ];
  },

  // Intercept sitemap index requests to route them through our custom API endpoint
  // This circumvents Next.js Cloudflare Edge bug where automatically generated sitemap indexes return 404
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/sitemap.xml',
          destination: '/api/sitemap-index',
        },
        {
          source: '/sitemap_index.xml',
          destination: '/api/sitemap-index',
        },
        {
          source: '/sitemap/:id.xml',
          destination: '/api/sitemap/:id',
        },
      ],
    };
  },

  // Permanent redirects for URL normalization and legacy path support
  async redirects() {
    return [
      // ── non-www → www redirect ────────────────────────────────────────────
      // HANDLED BY CLOUDFLARE REDIRECT RULE — not duplicated here to avoid
      // ERR_TOO_MANY_REDIRECTS when Cloudflare and Next.js both redirect.
      // Cloudflare Redirect Rule: lusthub.web.id → https://www.lusthub.web.id

      // ── Legacy /video/{id} path format ────────────────────────────────────
      // Legacy /video/{id} → single-hop 301 to new canonical /watch/{id}
      {
        source: "/video/:id",
        destination: "/watch/:id",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
