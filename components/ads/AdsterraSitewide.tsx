"use client";

import Script from "next/script";

/**
 * AdsterraSitewide
 *
 * Loads lightweight site-wide Adsterra Social Bar unit.
 * Popunder is intentionally excluded here and loaded ONLY on `/watch/*` via AdsterraPopunder
 * so homepage and category browsing stay interruption-free.
 *
 * Strategy:
 *   - afterInteractive: loads AFTER page hydration to avoid blocking LCP or causing CLS.
 */
export function AdsterraSitewide() {
  return (
    <>
      {/* Adsterra Social Bar — persistent floating unit */}
      <Script
        id="adsterra-social-bar"
        src="https://biomanos.org/14/b843bbc6e1e6cf26552406da09c429c7"
        strategy="afterInteractive"
        data-cfasync="false"
      />
    </>
  );
}
