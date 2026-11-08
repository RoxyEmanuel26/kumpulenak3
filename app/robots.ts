/**
 * app/robots.ts
 *
 * Robots.txt configuration for LustHub.
 *
 * CRAWL BUDGET & INDEXING STRATEGY:
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
 *   /results?page=*    → Results deep pagination (?page=2+) wastes crawl budget.
 *
 * Crawlable with noindex:
 *   /results?search_query=* → Page 1 is intentionally allowed in robots.txt so
 *                             crawlers can read the `<meta name="robots" content="noindex, follow">`
 *                             tag, de-indexing the thin search page while discovering
 *                             video/category links.
 *
 * Primary SEO targets (fully crawlable & indexed):
 *   /                       → Homepage (ISR 30 min)
 *   /category/*             → Tier-1 category landing pages (ISR 1 hr)
 *   /categories             → All categories hub (ISR 24 hr)
 *   /watch/*                → Canonical video player pages with VideoObject schema
 *
 * DOMAIN NORMALIZATION:
 *   Canonical domain: https://www.lusthub.web.id
 *   Apex to WWW redirect: lusthub.web.id/* → https://www.lusthub.web.id/* (301)
 */
import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.lusthub.web.id";

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
          // Page 1 of /results is allowed so crawlers process noindex, follow.
          "/results?page=",
        ],
      },
    ],
    // Sitemap index — Google discovers all segmented sitemaps from here
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
