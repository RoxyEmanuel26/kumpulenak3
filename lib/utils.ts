import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts a display name into a URL-safe slug.
 * Example: "HD Porn 1080p" → "hd-porn-1080p"
 *          "Big Tits"      → "big-tits"
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim();
}

/**
 * Reverses a slug back to a readable title.
 * Example: "big-tits" → "Big Tits"
 */
export function deslugify(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Formats a video date string into a human-readable label.
 * Handles two input formats from Eporner API:
 *   - ISO date:  "2024-01-15"       → "Jan 15, 2024"
 *   - Relative:  "2 days ago"       → "2 days ago"  (pass-through)
 *   - Invalid:   anything else      → "" (hidden gracefully)
 */
export function formatVideoDate(dateStr: string): string {
  if (!dateStr) return "";

  // If it already looks like a relative date ("X days/months/years ago"), pass through
  if (/ago|yesterday|today/i.test(dateStr)) return dateStr;

  // Try parsing as ISO date (YYYY-MM-DD or full ISO string)
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return "";

  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Parses a positive 1-based page parameter from query strings.
 * Returns 1 when omitted/empty, or null for invalid values (0, negative, NaN, trailing text).
 */
export function parsePositivePage(raw?: string): number | null {
  if (raw === undefined || raw.trim() === "") return 1;
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : null;
}

/**
 * Detects literal schema template placeholders (e.g. `{search_term_string}`),
 * external spam domain/URL insertions, or malformed oversized queries that
 * should return 404 instead of hitting upstream APIs.
 */
export function isInvalidSearchQuery(raw?: string): boolean {
  if (!raw) return false;
  const trimmed = raw.trim();
  if (!trimmed) return false;
  return (
    /\{[^}]*\}/.test(trimmed) ||
    /[\u0000-\u001F\u007F]/.test(trimmed) ||
    /https?:\/\/|\bwww\.|\b[a-z0-9-]{2,}\.(?:com|net|org|co|io|xyz|tv|cc|ru|me|info|site|online|top)(?:\/|\b)/i.test(trimmed) ||
    trimmed.length > 200
  );
}
