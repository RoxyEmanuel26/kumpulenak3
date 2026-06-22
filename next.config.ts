import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  
  // Fix #11: Remove X-Powered-By header to avoid leaking framework info
  poweredByHeader: false,

  // Centralized security headers applied natively by Next.js to all routes
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            // plausible.io added to script-src (load script) and connect-src (send beacons)
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' plausible.io https://glamournakedemployee.com https://*.glamournakedemployee.com; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https: plausible.io; frame-src 'self' https://www.eporner.com https://eporner.com https://glamournakedemployee.com https://*.glamournakedemployee.com https:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
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
    ];
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
