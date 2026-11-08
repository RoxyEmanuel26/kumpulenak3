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
          // API routes — internal backend endpoints, never public
          "/api/",

          // Note on /library: intentionally NOT disallowed here so crawlers can visit
          // and read the <meta name="robots" content="noindex, nofollow"> and
          // X-Robots-Tag header, permanently de-indexing it from search results
          // instead of triggering "Indexed, though blocked by robots.txt".

          // Note on /watch?v=: intentionally NOT disallowed here so crawlers can receive
          // HTTP 308 Permanent Redirect to /watch/[id] and transfer full SEO link equity.

          // Note on /?page=, /?order=, etc.: intentionally NOT disallowed here so crawlers
          // can crawl pagination variants, read the canonical tag pointing to
          // https://www.lusthub.web.id, and consolidate indexing into the homepage
          // rather than creating "Indexed, though blocked by robots.txt" warnings in GSC.

          // Note on /results?page=: intentionally NOT disallowed here so crawlers can read
          // the `<meta name="robots" content="noindex, follow">` tag on deep search pages.
        ],
      },
    ],
    // Sitemap index — Google discovers all segmented sitemaps from here
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
