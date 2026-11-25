const DEFAULT_SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.lusthub.web.id";

/**
 * Strict whitelist for Eporner thumbnail paths proxied through /thumbs/[...path].
 * Blocks path traversal, arbitrary URLs, query injection, and non-JPEG resources (100% SSRF-safe).
 * Example match: "static4/1/19/190/19014010/2_360.jpg"
 */
export const EPORNER_THUMB_PATH_REGEX = /^static\d+\/\d+\/\d+\/\d+\/\d+\/\d+(?:_\d+)?\.jpg$/;

const EPORNER_THUMB_URL_REGEX =
  /^https?:\/\/static-[a-z0-9-]+-cdn\.eporner\.com\/thumbs\/(static\d+\/\d+\/\d+\/\d+\/\d+\/\d+(?:_\d+)?\.jpg)(?:[?#].*)?$/i;

/**
 * Rewrites an Eporner CDN thumbnail URL to our first-party Cloudflare-cached
 * `/thumbs/...jpg` URL so Googlebot crawls thumbnails from our global edge
 * instead of hitting third-party hostload limits on `static-ca-cdn.eporner.com`.
 */
export function toProxiedThumbUrl(
  rawUrl: string | null | undefined,
  siteUrl: string = DEFAULT_SITE_URL
): string | null {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  const match = trimmed.match(EPORNER_THUMB_URL_REGEX);
  if (match && match[1]) {
    const cleanBase = siteUrl.replace(/\/+$/, "");
    return `${cleanBase}/thumbs/${match[1]}`;
  }

  return trimmed;
}
