"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

/**
 * AdsterraBanner
 *
 * Renders a single Adsterra iframe banner unit.
 *
 * Props:
 *   - adKey:   The Adsterra ad unit key
 *   - width:   Banner width in pixels
 *   - height:  Banner height in pixels
 *   - className: Optional wrapper class (for responsive show/hide)
 *
 * Supported units:
 *   - 728×90  (Leaderboard) — desktop/tablet only
 *   - 320×50  (Mobile Banner) — mobile only
 *   - 300×250 (Medium Rectangle) — sidebar / watch page
 *
 * The script tag sets window.atOptions before invoking the ad script.
 * We use a ref-keyed container so React doesn't accidentally
 * re-inject the script on re-renders.
 */

interface AdsterraBannerProps {
  adKey: string;
  width: number;
  height: number;
  className?: string;
}

export function AdsterraBanner({ adKey, width, height, className = "" }: AdsterraBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const injectedRef = useRef(false);

  useEffect(() => {
    if (injectedRef.current || !containerRef.current || containerRef.current.firstChild) return;

    // Viewport-based responsive check to avoid race conditions on global atOptions.
    // Supports both Tailwind md (768px) and lg (1024px) breakpoints.
    const isMd = window.matchMedia("(min-width: 768px)").matches;
    const isLg = window.matchMedia("(min-width: 1024px)").matches;

    // Detect which breakpoint this banner uses for its show/hide logic
    const isDesktopOnlyLg = className.includes("hidden lg:flex") || (className.includes("lg:flex") && className.includes("hidden"));
    const isDesktopOnlyMd = !isDesktopOnlyLg && (className.includes("hidden md:flex") || (className.includes("md:flex") && className.includes("hidden")));
    const isMobileOnlyLg = className.includes("lg:hidden");
    const isMobileOnlyMd = !isMobileOnlyLg && className.includes("md:hidden");

    if (isDesktopOnlyLg && !isLg) return;
    if (isDesktopOnlyMd && !isMd) return;
    if (isMobileOnlyLg && isLg) return;
    if (isMobileOnlyMd && isMd) return;

    injectedRef.current = true;

    // Set atOptions on the window before the invoke script runs
    const optionsScript = document.createElement("script");
    optionsScript.text = `
      atOptions = {
        'key': '${adKey}',
        'format': 'iframe',
        'height': ${height},
        'width': ${width},
        'params': {}
      };
    `;
    containerRef.current.appendChild(optionsScript);

    // Load the invoke script
    const invokeScript = document.createElement("script");
    invokeScript.src = `https://glamournakedemployee.com/${adKey}/invoke.js`;
    invokeScript.async = true;
    containerRef.current.appendChild(invokeScript);
  }, [adKey, width, height, className]);

  return (
    <div
      className={`flex items-center justify-center overflow-hidden ${className}`}
      style={{ minHeight: height, minWidth: width, maxWidth: "100%" }}
      aria-hidden="true"
    >
      <div ref={containerRef} />
    </div>
  );
}
