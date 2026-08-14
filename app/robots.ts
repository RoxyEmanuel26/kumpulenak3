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
 *   /api/              → Internal API endpoints, never indexable
 *   /library           → User-specific library, no SEO value
 *   /watch?v=*         → Legacy URL format. 308 redirects to /watch/{id}.
 *                        Still crawlable without this rule — wastes budget
 *                        on redirect hops before reaching canonical.
 *   /?page=*           → Homepage pagination via query string.
 *   /?order=*          → Homepage sort-order variants. Same content.
 *   /?gay=*            → Homepage filter variants — not unique pages.
 *   /?lq=*             → Homepage quality filter variants.
 *   /results?page=*    → Results pagination deep pages — canonical handles
 *                        duplicate prevention, disallow saves crawl budget.
 *
 * NOT disallowed (intentionally crawlable):
 *   /results?search_query=* → Search pages have legitimate SEO value.
 *                             They capture long-tail queries with proper
 *                             canonical URLs. Disallowing reduces organic reach.
 *   /category/*             → Tier-1 category pages are primary SEO targets.
 *                             Each has a unique canonical, h1, description, and
 *                             JSON-LD. They MUST be crawlable.
 *   /watch/*                → Individual video pages are primary content.
 *
 * WWW → NON-WWW:
 *   Handled at 3 layers:
 *   1. Cloudflare Redirect Rule (edge — fires before origin, zero server cost)
 *      www.lusthub.web.id/* → lusthub.web.id/* (301)
 *   2. next.config.ts redirects() with has: [{ type: "host", value: "www..." }]
 *      Catches any www request that bypasses the edge rule
 *   3. public/_redirects (Cloudflare Pages fallback — harmless on Pterodactyl)
 *   This 3-layer defense fixes the 259 "403 Blocked" pages in Google Search Console.
 */
import { MetadataRoute } from "next";

export const runtime = "edge";

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

          // Paginated search results deep pages — low SEO value beyond page 1.
          // Page 1 of /results?search_query=X is allowed and indexed.
          // Deep pagination (?page=2+) wastes crawl budget.
          "/results?page=",
        ],
      },
    ],
    // Sitemap index — Google discovers all segmented sitemaps from here
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
