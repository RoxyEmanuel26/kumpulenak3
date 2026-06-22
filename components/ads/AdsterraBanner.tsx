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
    if (!shouldRender || !containerRef.current || containerRef.current.hasChildNodes()) return;

    // Define atOptions globally for the Adsterra script to read
    if (typeof window !== "undefined") {
      (window as any).atOptions = {
        key: adKey,
        format: "iframe",
        height: height,
        width: width,
        params: {}
      };
    }

    // Create configuration script (for redundancy or older Adsterra scripts)
    const confScript = document.createElement("script");
    confScript.type = "text/javascript";
    confScript.innerHTML = `
      atOptions = {
        'key' : '${adKey}',
        'format' : 'iframe',
        'height' : ${height},
        'width' : ${width},
        'params' : {}
      };
    `;

    // Create invoke script
    const invokeScript = document.createElement("script");
    invokeScript.type = "text/javascript";
    invokeScript.src = `https://glamournakedemployee.com/${adKey}/invoke.js`;
    invokeScript.async = true;

    // Append both to the container
    containerRef.current.appendChild(confScript);
    containerRef.current.appendChild(invokeScript);

    return () => {
      // Clean up when unmounting to avoid duplicate ads if component remounts
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [shouldRender, adKey, height, width]);

  return (
    <div
      className={`flex items-center justify-center overflow-hidden ${className}`}
      style={{ minHeight: height, minWidth: width, maxWidth: "100%" }}
      aria-hidden="true"
    >
      {shouldRender ? (
        <div ref={containerRef} className="w-full h-full flex justify-center items-center" />
      ) : (
        <div />
      )}
    </div>
  );
}
