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
