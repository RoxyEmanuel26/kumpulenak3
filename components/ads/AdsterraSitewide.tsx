"use client";

import Script from "next/script";

/**
 * AdsterraSitewide
 *
 * Loads site-wide Adsterra ad units that should fire once per session:
 *   1. Popunder  — fires on first click anywhere on the page
 *   2. Social Bar — persistent floating social bar
 *
 * Strategy:
 *   - afterInteractive: scripts load AFTER page hydration to avoid
 *     blocking LCP or causing layout shift on initial paint.
 *   - Mounted once in the root layout so it runs on every page.
 */
export function AdsterraSitewide() {
  return (
    <>
      {/* Adsterra Popunder — fires on first user interaction */}
      <Script
        src="https://glamournakedemployee.com/98/35/f2/9835f2cb11a4b0a607981a859816aa31.js"
        strategy="afterInteractive"
      />

      {/* Adsterra Social Bar — persistent floating unit */}
      <Script
        src="https://glamournakedemployee.com/b8/43/bb/b843bbc6e1e6cf26552406da09c429c7.js"
        strategy="afterInteractive"
      />
    </>
  );
}
