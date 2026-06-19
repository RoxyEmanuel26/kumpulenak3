import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  
  // Fix #11: Remove X-Powered-By header to avoid leaking framework info
  poweredByHeader: false,

  // Security headers as fallback (proxy.ts is the primary enforcement)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
