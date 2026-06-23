/**
 * lib/video/slug.ts
 *
 * Canonical watch URL helpers for SEO-friendly slug architecture.
 *
 * URL FORMAT:  /watch/{title-slug}-{id}
 * Example:     /watch/step-sis-caught-me-2fPfA79DdjL
 *
 * DESIGN PRINCIPLES:
 *   - The video ID is always the LAST hyphen-separated segment (source of truth)
 *   - The slug portion is derived from the title via slugify() (decorative helper)
 *   - Old /watch/{id} URLs redirect here via permanentRedirect in the page handler
 *   - Google treats the slug portion as keyword context for ranking signals
 *
 * SAFETY:
 *   - If slugify() returns empty string (all-special-char title), falls back to /watch/{id}
 *   - Max 60 chars for slug portion to keep URLs browser-friendly
 *   - Eporner video IDs do not contain hyphens, so last-segment extraction is reliable
 */

import { slugify } from "@/lib/utils";

/** Maximum character length for the title-derived slug portion of the URL. */
const MAX_SLUG_CHARS = 60;

/**
 * Builds the canonical watch URL for a given video.
 *
 * Examples:
 *   buildWatchUrl("2fPfA79DdjL", "Step Sis Caught Me")
 *   → "/watch/step-sis-caught-me-2fPfA79DdjL"
 *
 *   buildWatchUrl("abc123", "")
 *   → "/watch/abc123"  (fallback: no slug)
 */
export function buildWatchUrl(id: string, title: string): string {
  const rawSlug = slugify(title);
  if (!rawSlug) {
    // Fallback: bare ID URL when title produces no slug
    return `/watch/${id}`;
  }

  // Truncate to MAX_SLUG_CHARS and strip any trailing hyphen artifact
  const truncated = rawSlug.length > MAX_SLUG_CHARS
    ? rawSlug.slice(0, MAX_SLUG_CHARS).replace(/-+$/, "")
    : rawSlug;

  return `/watch/${truncated}-${id}`;
}

/**
 * Extracts the raw video ID from a watch page slug parameter.
 *
 * Convention: the video ID is always the LAST hyphen-separated segment.
 * This works because:
 *   - The slug portion uses slugify() → only [a-z0-9-] characters
 *   - Eporner video IDs are alphanumeric and never contain hyphens
 *
 * Examples:
 *   extractVideoId("step-sis-caught-me-2fPfA79DdjL") → "2fPfA79DdjL"
 *   extractVideoId("2fPfA79DdjL")                    → "2fPfA79DdjL"  (bare ID, backward compat)
 */
export function extractVideoId(slugParam: string): string {
  const segments = slugParam.split("-");
  return segments[segments.length - 1];
}
