import { permanentRedirect } from "next/navigation";

/**
 * Legacy /video/{id} path handler.
 *
 * REDIRECT CHAIN:
 * 1. next.config.ts redirects() → HTTP 301 (routing layer, before React)
 * 2. This component → permanentRedirect() → HTTP 308 (belt-and-suspenders fallback)
 *
 * PREVIOUS BUG (fixed here):
 * Used redirect(..., RedirectType.permanent) which does not exist in Next.js 16.
 * This silently emitted a 307 Temporary Redirect instead of a permanent one.
 * Now correctly uses permanentRedirect() → HTTP 308.
 *
 * In practice, next.config.ts catches /video/:id first (true 301),
 * so this component should never actually execute in normal operation.
 * It exists only as a safety net for any routing edge cases.
 */
export default async function VideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  // Belt-and-suspenders: primary redirect is the 301 in next.config.ts.
  // This fallback emits HTTP 308 Permanent Redirect if routing layer misses it.
  permanentRedirect(`/watch/${resolvedParams.id}`);
}
