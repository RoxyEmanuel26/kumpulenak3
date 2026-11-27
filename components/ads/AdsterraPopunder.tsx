"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

/**
 * AdsterraPopunder
 *
 * Loads the Adsterra Popunder script EXCLUSIVELY on video watch pages (`/watch/*`).
 * Never mounted on homepage, category pages, or search pages so browsing stays clean
 * and user-friendly on mobile, tablet, and desktop.
 */
export function AdsterraPopunder() {
  const pathname = usePathname();

  if (!pathname?.startsWith("/watch/")) {
    return null;
  }

  return (
    <Script
      id="adsterra-popunder"
      src="https://benchform.org/1/9835f2cb11a4b0a607981a859816aa31"
      strategy="afterInteractive"
      data-cfasync="false"
    />
  );
}
