"use client";

import { useEffect, useRef, useState } from "react";

interface AdsterraBannerProps {
  adKey: string;
  width: number;
  height: number;
  className?: string;
  scriptSrc?: string;
  format?: "js" | "iframe";
}

// Per-unit overrides for Adsterra anti-adblock endpoints
const AD_UNIT_OVERRIDES: Record<string, { scriptSrc: string; format: "js" | "iframe" }> = {
  "3f7aeb74bde61edc8e369b2303797899": {
    scriptSrc: "https://biomanos.org/22/3f7aeb74bde61edc8e369b2303797899",
    format: "iframe",
  },
};

export function AdsterraBanner({
  adKey,
  width,
  height,
  className = "",
  scriptSrc,
  format,
}: AdsterraBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(false);

  const override = AD_UNIT_OVERRIDES[adKey];
  const resolvedSrc = scriptSrc ?? override?.scriptSrc ?? `https://glamournakedemployee.com/${adKey}/invoke.js`;
  const resolvedFormat = format ?? override?.format ?? "js";

  useEffect(() => {
    // Viewport-based responsive check to avoid race conditions.
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

    setShouldRender(true);
  }, [className]);

  useEffect(() => {
    if (!shouldRender || !containerRef.current) return;

    // Check if scripts are already injected to prevent duplicates
    if (containerRef.current.firstChild) return;

    const confScript = document.createElement("script");
    confScript.type = "text/javascript";

    const invokeScript = document.createElement("script");
    invokeScript.type = "text/javascript";
    invokeScript.dataset.cfasync = "false";
    invokeScript.src = resolvedSrc;

    if (resolvedFormat === "iframe") {
      // Exact official Adsterra iframe-format banner config (atOptions)
      confScript.innerHTML = `
        window.atOptions = {
          'key' : '${adKey}',
          'format' : 'iframe',
          'height' : ${height},
          'width' : ${width},
          'params' : {}
        };
      `;
    } else {
      // Async multi-banner config for legacy invoke.js display banners
      confScript.innerHTML = `
        if (typeof window.atAsyncOptions !== 'object') window.atAsyncOptions = [];
        window.atAsyncOptions.push({
          'key' : '${adKey}',
          'format' : 'js',
          'async' : true,
          'container' : 'atContainer-${adKey}',
          'height' : ${height},
          'width' : ${width},
          'params' : {}
        });
      `;
      invokeScript.async = true;
    }

    containerRef.current.appendChild(confScript);
    containerRef.current.appendChild(invokeScript);
  }, [shouldRender, adKey, height, width, resolvedSrc, resolvedFormat]);

  return (
    <div
      className={`w-full max-w-full items-center justify-center overflow-hidden ${className}`}
      style={{ minHeight: height }}
      aria-hidden="true"
    >
      {shouldRender ? (
        <div
          id={`atContainer-${adKey}`}
          ref={containerRef}
          style={{ width, maxWidth: "100%", height, overflow: "hidden" }}
        />
      ) : (
        <div style={{ width, maxWidth: "100%", height }} />
      )}
    </div>
  );
}
