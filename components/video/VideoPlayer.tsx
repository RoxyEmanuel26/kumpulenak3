"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Maximize2, Minimize2, RectangleHorizontal } from "lucide-react";

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
      {/* Outer player stage — edge-to-edge on phone, framed cinema container on tablet/PC */}
      <div
        ref={containerRef}
        className={`relative w-full overflow-hidden bg-[#080808] transition-all duration-300 ${
          isFullscreen
            ? "h-screen w-screen rounded-none border-0 aspect-auto"
            : isTheater
              ? "max-w-[1440px] aspect-video max-h-[82dvh] rounded-none md:rounded-xl border-y md:border border-white/[0.08] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)]"
              : "w-full aspect-video max-h-[76dvh] rounded-none sm:rounded-xl border-y sm:border border-white/[0.08] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.85)]"
        }`}
      >
        {/* Ambient Ambilight Glow */}
        {thumbnailUrl && !isFullscreen && (
          <div
            className="absolute inset-0 -z-10 blur-[90px] opacity-35 scale-[1.08] pointer-events-none transition-all duration-1000"
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

      {/* Clickable Theater & Fullscreen controls on tablet/PC (never overlays iframe) */}
      {!isFullscreen && (
        <div className="hidden md:flex w-full items-center justify-between gap-3 pt-2.5 px-1 text-[11px] text-[#8E8E8E]">
          <div className="flex items-center gap-2 font-mono text-[10px] tracking-wide text-[#777777]">
            <span>Shortcuts:</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-[#B0B0B0]">F</kbd>
            <span>Fullscreen</span>
            {onToggleTheater && (
              <>
                <span className="text-white/20">•</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-[#B0B0B0]">T</kbd>
                <span>Theater</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {onToggleTheater && (
              <button
                type="button"
                onClick={onToggleTheater}
                aria-pressed={isTheater}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all duration-200 cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60 ${
                  isTheater
                    ? "bg-white/10 border-white/20 text-white"
                    : "bg-white/[0.03] border-white/[0.08] text-[#B5B5B5] hover:text-white hover:bg-white/[0.08]"
                }`}
              >
                <RectangleHorizontal className="w-3.5 h-3.5" />
                <span>{isTheater ? "Default View" : "Theater Mode"}</span>
              </button>
            )}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.08] text-[#B5B5B5] hover:text-white hover:bg-white/[0.08] text-[11px] font-medium transition-all duration-200 cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span>Fullscreen</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
