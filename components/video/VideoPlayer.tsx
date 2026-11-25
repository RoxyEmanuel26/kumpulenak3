"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface VideoPlayerProps {
  embedUrl: string;
  title: string;
  thumbnailUrl?: string | null;
  isTheater?: boolean;
  onToggleTheater?: () => void;
}

export function VideoPlayer({
  embedUrl,
  title,
  thumbnailUrl,
  isTheater = false,
  onToggleTheater,
}: VideoPlayerProps) {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Reset loaded transition state when embedUrl changes (render-phase state adjustment)
  const [prevEmbedUrl, setPrevEmbedUrl] = useState(embedUrl);
  if (embedUrl !== prevEmbedUrl) {
    setPrevEmbedUrl(embedUrl);
    setIframeLoaded(false);
  }

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error("Fullscreen error:", err.message);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Keyboard shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      switch (e.key.toLowerCase()) {
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "t":
          if (onToggleTheater && window.innerWidth >= 768) {
            e.preventDefault();
            onToggleTheater();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onToggleTheater, toggleFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  return (
    <div className="w-full flex flex-col items-center select-none">
      {/* Outer wrapper with theater mode toggle */}
      <div
        ref={containerRef}
        className={`relative w-full overflow-hidden bg-black transition-all duration-300 shadow-2xl ${
          isTheater && !isFullscreen
            ? "max-w-full aspect-[21/9] xl:max-h-[70vh] rounded-none border-y border-white/5"
            : "max-w-5xl aspect-video rounded-none md:rounded-xl border-x-0 md:border border-white/5"
        } ${isFullscreen ? "h-screen w-screen rounded-none border-0 aspect-auto" : ""}`}
      >
        {/* Ambient Ambilight Glow */}
        {thumbnailUrl && !isFullscreen && (
          <div
            className="absolute inset-0 -z-10 blur-[90px] opacity-40 scale-[1.08] pointer-events-none transition-all duration-1000"
            style={{
              backgroundImage: `url(${thumbnailUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        )}

        {/* Lightweight poster backdrop behind iframe only while initializing (never occludes iframe) */}
        {thumbnailUrl && !iframeLoaded && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt={title}
            fetchPriority="high"
            decoding="async"
            width={640}
            height={360}
            className="absolute inset-0 z-0 w-full h-full object-cover opacity-50 pointer-events-none"
          />
        )}

        {/* Primary Video Iframe: 100% visible & unoccluded above the fold for Google Watch Page indexing */}
        <iframe
          src={embedUrl}
          title={title}
          className="relative z-10 w-full h-full border-0"
          allowFullScreen
          allow="autoplay; encrypted-media; picture-in-picture"
          referrerPolicy="no-referrer-when-downgrade"
          onLoad={() => setIframeLoaded(true)}
        />
      </div>

      {/* Theater/Fullscreen keyboard tip */}
      {!isFullscreen && (
        <div className="mt-3 text-[10px] text-muted-foreground/50 font-mono hidden md:flex gap-4 uppercase tracking-wider select-none">
          <span>[F] Fullscreen</span>
          {onToggleTheater && <span>[T] Theater Mode</span>}
        </div>
      )}
    </div>
  );
}
