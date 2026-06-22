import { redirect, notFound, RedirectType } from "next/navigation";

/**
 * Backward-compatibility redirect for the legacy query-param URL format.
 *
 * Old:  /watch?v={id}
 * New:  /watch/{id}  ← canonical URL (served by app/(user)/watch/[id]/page.tsx)
 *
 * This page is intentionally minimal — it exists only to perform a permanent
 * 301 redirect. It must never emit its own canonical tag or render any HTML.
 * All metadata, canonical, and content rendering happens in /watch/[id]/page.tsx.
 */
export default async function WatchLegacyRedirect({
  searchParams,
}: {
  searchParams: Promise<{ v?: string }>;
}) {
  const resolved = await searchParams;
  const videoId = resolved.v;

  // No ?v= param at all → not a valid watch URL
  if (!videoId) return notFound();

  // Permanent redirect to the new canonical path
  redirect(`/watch/${videoId}`, RedirectType.permanent);
}
