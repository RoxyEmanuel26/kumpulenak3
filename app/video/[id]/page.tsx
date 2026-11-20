import { notFound, permanentRedirect } from "next/navigation";
import { resolveCanonicalWatchPath } from "@/lib/video/resolve-watch";

/**
 * Legacy /video/{id} path handler.
 * Resolves directly to canonical `/watch/{slug}-{id}` in a single 308 hop
 * (or 404 when the video is removed or invalid).
 */
export default async function VideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const canonicalPath = await resolveCanonicalWatchPath(resolvedParams.id);
  if (!canonicalPath) return notFound();

  permanentRedirect(canonicalPath);
}
