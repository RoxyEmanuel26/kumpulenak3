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

      // ── Cloudflare CDN Cache headers — ISR replacement for Edge Runtime ──
      //
      // WHY: export const revalidate = N is silently IGNORED when a page runs
      // under Edge Runtime (inherited from app/layout.tsx runtime="edge").
      // Cloudflare Workers have no ISR cache store. The revalidate column in
      // the build output is empty for all edge routes.
      //
      // SOLUTION: Explicit Cache-Control headers instruct Cloudflare's CDN
      // to cache rendered HTML at the edge. This replicates ISR behaviour:
      //   - s-maxage=N   → Cloudflare caches the response for N seconds
      //   - stale-while-revalidate → Cloudflare serves stale while re-fetching
      //
      // Values mirror the original revalidate= declarations exactly.
      {
        // Homepage — was: revalidate = 1800 (30 minutes)
        source: "/",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=1800, stale-while-revalidate=86400",
          },
        ],
      },
      {
        // Individual watch pages — was: revalidate = 3600 (1 hour)
        source: "/watch/:id",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        // Category pages (Tier-1 SEO pages) — was: revalidate = 3600 (1 hour)
        source: "/category/:slug",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        // Categories listing page — was: revalidate = 86400 (24 hours)
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

  // Permanent 301 redirect for legacy /video/{id} path format
  // This runs at the routing layer before React, guaranteeing a real 301.
  async redirects() {
    return [
      {
        // Legacy /video/{id} path format → single-hop 301 to new canonical /watch/{id}
        // Bypasses the ?v= shim entirely for clean redirect chain.
        source: "/video/:id",
        destination: "/watch/:id",
        permanent: true, // HTTP 301
      },
    ];
  },
};

export default nextConfig;
