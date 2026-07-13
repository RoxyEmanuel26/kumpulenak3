"use client";

import { useEffect, useRef } from "react";

interface AdsterraNativeBannerProps {
  className?: string;
}

export function AdsterraNativeBanner({ className = "" }: AdsterraNativeBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    // To support multiple native banners on the same page, we need to append the script directly to the container
    // rather than the body. Native banners usually look for the nearest container.
    // If the script already exists in this container, skip.
    if (containerRef.current.querySelector("script")) return;

    const script = document.createElement("script");
    script.async = true;
    script.dataset.cfasync = "false";
    script.src = "https://glamournakedemployee.com/d000ca127179faba8842df003480a3a1/invoke.js";
    
    containerRef.current.appendChild(script);

    return () => {
      // Cleanup on unmount
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
        
        // Re-add the target div
        const targetDiv = document.createElement("div");
        targetDiv.id = "container-d000ca127179faba8842df003480a3a1";
        containerRef.current.appendChild(targetDiv);
      }
    };
  }, []);

  return (
    <div className={`w-full overflow-hidden ${className}`} ref={containerRef}>
      <div id="container-d000ca127179faba8842df003480a3a1"></div>
    </div>
  );
}
