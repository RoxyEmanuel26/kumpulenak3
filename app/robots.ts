/**
 * app/robots.ts
 *
 * Robots.txt configuration for LustHub.
 *
 * CRAWL BUDGET STRATEGY:
 * We explicitly disallow routes that waste Google's crawl budget —
 * pages that are non-indexable, user-specific, or are parameterized
 * variants of indexable pages that don't add unique SEO value.
 *
 * Disallowed routes and reasoning:
 *   /api/         → Internal API endpoints, never indexable
 *   /library      → User-specific library, no SEO value
 *   /watch?v=*    → Legacy URL format. 301 redirects to /watch/{id}.
 *                   Still crawlable without this rule — wastes budget
 *                   on redirect hops before reaching canonical.
 *   /?page=*      → Homepage pagination via query string.
 *                   Paginated content is accessible via link rel=next,
 *                   but the query-string variants don't need direct crawl.
 *   /?order=*     → Homepage sort-order variants. Same content,
 *                   different order — not unique pages.
 *   /?gay=*       → Homepage filter variants — not unique pages.
 *   /?lq=*        → Homepage quality filter variants.
 *
 * NOT disallowed:
 *   /results?*    → Search result pages have legitimate SEO value.
 *                   They capture long-tail queries and have proper
 *                   canonical URLs. Disallowing would reduce organic reach.
 */
import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://lusthub.web.id";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          // API routes — never public
          "/api/",

          // User-specific pages — no SEO value
          "/library",

          // Legacy watch URL format — causes redirect hop before canonical
          // Canonical URL is /watch/{id}, not /watch?v={id}
          "/watch?v=",

          // Homepage query-string variants — same content, not unique pages
          "/?page=",
          "/?order=",
          "/?gay=",
          "/?lq=",
          "/?q=",
        ],
      },
    ],
    // Sitemap index — Google discovers all segmented sitemaps from here
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
