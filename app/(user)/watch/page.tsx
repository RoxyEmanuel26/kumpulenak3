import { permanentRedirect, notFound } from "next/navigation";

/**
 * Backward-compatibility handler for the legacy query-param URL format.
 *
 * Old:  /watch?v={id}
 * New:  /watch/{id}  ← canonical URL (served by app/(user)/watch/[id]/page.tsx)
 *
 * REDIRECT TYPE:
 * Uses permanentRedirect() which emits HTTP 308 Permanent Redirect.
 * Google treats 308 identically to 301 — full SEO equity transfer.
 *
 * PREVIOUS BUG (fixed here):
 * The original code used redirect(..., RedirectType.permanent).
 * RedirectType only has "push" and "replace" — "permanent" does not exist
 * in Next.js 16, so the call was silently treated as a 307 Temporary Redirect,
 * meaning Google would NOT transfer PageRank through this redirect.
 *
 * This page must never emit its own canonical tag or render any HTML.
 * All metadata, canonical, and content rendering happens in /watch/[id]/page.tsx.
 */
export default async function WatchLegacyRedirect({
  searchParams,
}: {
  searchParams: Promise<{ v?: string }>;
}) {
  const resolved = await searchParams;
  const videoId = resolved.v;

  // No ?v= param → not a valid legacy watch URL
  if (!videoId) return notFound();

  // HTTP 308 Permanent Redirect → /watch/{id}
  // Browsers and crawlers treat 308 as permanently moved (same as 301).
  permanentRedirect(`/watch/${videoId}`);
}
