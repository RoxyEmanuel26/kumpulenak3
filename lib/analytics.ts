/**
 * lib/analytics.ts
 *
 * Thin, typed wrapper around Plausible analytics.
 * Also compatible with Umami if you switch providers.
 *
 * Usage:
 *   import { trackEvent } from "@/lib/analytics";
 *   trackEvent("category_click", { category: "japanese" });
 *
 * All calls are fire-and-forget. They safely no-op if:
 *   - Running on the server (SSR)
 *   - The script hasn't loaded yet
 *   - The user has an ad blocker
 *
 * ─── Event Taxonomy ──────────────────────────────────────────────────────────
 *
 * category_click        → Homepage featured category pill clicked
 *   { category: string }
 *
 * category_cta_click    → Browse category CTA on watch page clicked
 *   { category: string; from_video: string }
 *
 * see_more_click        → "See more X videos →" CTA clicked
 *   { keyword: string }
 *
 * sidebar_cat_click     → Top Categories sidebar link clicked
 *   { category: string }
 *
 * search_submit         → Search form submitted
 *   { query_length: number }   (length only — never the actual query string for privacy)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Type declarations for Plausible and Umami globals ────────────────────────

declare global {
  interface Window {
    plausible?: (
      event: string,
      options?: { props?: Record<string, string | number | boolean> }
    ) => void;
    umami?: {
      track: (
        event: string,
        data?: Record<string, string | number | boolean>
      ) => void;
    };
  }
}

// ── Core tracking function ────────────────────────────────────────────────────

/**
 * Fire a custom analytics event.
 * Uses Plausible if available, falls back to Umami, silently skips otherwise.
 *
 * @param event  - The event name string (use the taxonomy above)
 * @param props  - Optional key/value properties attached to the event
 */
export function trackEvent(
  event: string,
  props?: Record<string, string | number | boolean>
): void {
  // Guard: never run on the server
  if (typeof window === "undefined") return;

  // Plausible
  if (typeof window.plausible === "function") {
    window.plausible(event, props ? { props } : undefined);
    return;
  }

  // Umami fallback
  if (window.umami?.track) {
    window.umami.track(event, props);
    return;
  }

  // Development: log to console so we can verify events fire locally
  if (process.env.NODE_ENV === "development") {
    console.info("[Analytics]", event, props ?? "");
  }
}
