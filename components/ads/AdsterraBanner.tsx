"use client";

import { useEffect, useState } from "react";

interface AdsterraBannerProps {
  adKey: string;
  width: number;
  height: number;
  className?: string;
}

export function AdsterraBanner({ adKey, width, height, className = "" }: AdsterraBannerProps) {
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

  return (
    <div
      className={`flex items-center justify-center overflow-hidden ${className}`}
      style={{ minHeight: height, minWidth: width, maxWidth: "100%" }}
      aria-hidden="true"
    >
      {shouldRender ? (
        <iframe
          srcDoc={`
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <style>
                  html, body {
                    margin: 0;
                    padding: 0;
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                    background: transparent;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                  }
                </style>
              </head>
              <body>
                <script type="text/javascript">
                  var atOptions = {
                    'key' : '${adKey}',
                    'format' : 'iframe',
                    'height' : ${height},
                    'width' : ${width},
                    'params' : {}
                  };
                </script>
                <script type="text/javascript" src="https://glamournakedemployee.com/${adKey}/invoke.js"></script>
              </body>
            </html>
          `}
          width={width}
          height={height}
          style={{ border: "none", overflow: "hidden", maxWidth: "100%" }}
          scrolling="no"
          title={`Ad Banner ${adKey}`}
        />
      ) : (
        <div />
      )}
    </div>
  );
}
