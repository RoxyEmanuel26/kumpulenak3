import { permanentRedirect, notFound } from "next/navigation";
import { resolveCanonicalWatchPath } from "@/lib/video/resolve-watch";

/**
 * Backward-compatibility handler for the legacy query-param URL format.
 * Resolves `/watch?v={id}` straight to `/watch/{slug}-{id}` in a single 308 hop
 * (or 404 when the video is removed or invalid).
 */
export default async function WatchLegacyRedirect({
  searchParams,
}: {
  searchParams: Promise<{ v?: string }>;
}) {
  const resolved = await searchParams;
  const videoId = resolved.v;

  if (!videoId) return notFound();

  const canonicalPath = await resolveCanonicalWatchPath(videoId);
  if (!canonicalPath) return notFound();

  permanentRedirect(canonicalPath);
}
