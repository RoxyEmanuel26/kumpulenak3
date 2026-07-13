"use client";

import { useEffect, useRef, useState } from "react";

interface AdsterraBannerProps {
  adKey: string;
  width: number;
  height: number;
  className?: string;
}

export function AdsterraBanner({ adKey, width, height, className = "" }: AdsterraBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(false);

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

    // Use DOM append for native injection.
    // We use window.atAsyncOptions to prevent multiple banners on the same page from overwriting the global config.
    const confScript = document.createElement("script");
    confScript.type = "text/javascript";
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

    const invokeScript = document.createElement("script");
    invokeScript.type = "text/javascript";
    invokeScript.async = true;
    invokeScript.src = `//glamournakedemployee.com/${adKey}/invoke.js`;

    containerRef.current.appendChild(confScript);
    containerRef.current.appendChild(invokeScript);
  }, [shouldRender, adKey, height, width]);

  return (
    <div
      className={`flex items-center justify-center overflow-hidden ${className}`}
      style={{ minHeight: height, minWidth: width, maxWidth: "100%" }}
      aria-hidden="true"
    >
      {shouldRender ? (
        <div id={`atContainer-${adKey}`} ref={containerRef} style={{ width, height, overflow: "hidden" }} />
      ) : (
        <div />
      )}
    </div>
  );
}
