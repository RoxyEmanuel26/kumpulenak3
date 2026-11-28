"use client";

import { useEffect, useRef } from "react";

interface AdsterraNativeBannerProps {
  className?: string;
}

export function AdsterraNativeBanner({ className = "" }: AdsterraNativeBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // If the script already exists in this container, skip.
    if (container.querySelector("script")) return;

    const script = document.createElement("script");
    script.async = true;
    script.setAttribute("fetchpriority", "high");
    script.dataset.cfasync = "false";
    script.src = "https://biomanos.org/21/d000ca127179faba8842df003480a3a1";

    // Insert script before the target container div (matches official Adsterra snippet order)
    container.insertBefore(script, container.firstChild);

    return () => {
      // Cleanup on unmount
      container.innerHTML = "";
      const targetDiv = document.createElement("div");
      targetDiv.id = "container-d000ca127179faba8842df003480a3a1";
      container.appendChild(targetDiv);
    };
  }, []);

  return (
    <div className={`w-full overflow-hidden ${className}`} ref={containerRef}>
      <div id="container-d000ca127179faba8842df003480a3a1"></div>
    </div>
  );
}
