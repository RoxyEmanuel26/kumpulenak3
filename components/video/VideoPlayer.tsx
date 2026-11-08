"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, Play } from "lucide-react";

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
  onToggleTheater 
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset states when the embedUrl changes (render-phase state adjustment)
  const [prevEmbedUrl, setPrevEmbedUrl] = useState(embedUrl);
  if (embedUrl !== prevEmbedUrl) {
    setPrevEmbedUrl(embedUrl);
    setIsPlaying(false);
    setLoading(false);
  }

  // Preconnect helper to warm up Eporner CDN when user hovers over facade
  const preconnectOrigin = useCallback(() => {
    if (typeof document === "undefined") return;
    const origins = ["https://www.eporner.com", "https://pi.eporner.com"];
    origins.forEach((origin) => {
      if (!document.querySelector(`link[rel="preconnect"][href="${origin}"]`)) {
        const link = document.createElement("link");
        link.rel = "preconnect";
        link.href = origin;
        link.crossOrigin = "anonymous";
        document.head.appendChild(link);
      }
    });
  }, []);

  const handleStartPlay = useCallback(() => {
    setIsPlaying(true);
    setLoading(true);
  }, []);

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
        case " ":
        case "k":
          if (!isPlaying) {
            e.preventDefault();
            handleStartPlay();
          }
          break;
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
  }, [isPlaying, handleStartPlay, onToggleTheater, toggleFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Autoplay URL configuration
  const activeEmbedUrl = embedUrl.includes("?") 
    ? `${embedUrl}&autoplay=1` 
    : `${embedUrl}?autoplay=1`;

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

        {/* ── Facade Layer: Thumbnail + Play Button (LCP Optimization) ── */}
        {!isPlaying ? (
          <div
            role="button"
            tabIndex={0}
            aria-label={`Play video: ${title}`}
            onClick={handleStartPlay}
            onMouseEnter={preconnectOrigin}
            onTouchStart={preconnectOrigin}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleStartPlay();
              }
            }}
            className="group relative w-full h-full cursor-pointer overflow-hidden focus:outline-none focus:ring-2 focus:ring-red-600"
          >
            {/* Native high-priority thumbnail — instant LCP */}
            {thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbnailUrl}
                alt={title}
                fetchPriority="high"
                decoding="async"
                width={1280}
                height={720}
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-103"
              />
            ) : (
              <div className="w-full h-full bg-[#161616] flex items-center justify-center text-sm text-muted-foreground font-mono">
                Click to load video stream
              </div>
            )}

            {/* Subtle cinematic gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30 group-hover:via-black/10 transition-colors" />

            {/* Glowing Big Play Button */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="relative flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full bg-red-600/90 text-white shadow-2xl backdrop-blur-sm transition-all duration-300 group-hover:scale-110 group-hover:bg-red-600 group-hover:shadow-[0_0_50px_rgba(220,38,38,0.7)]">
                <Play className="w-9 h-9 md:w-11 md:h-11 fill-current ml-1" />
              </div>
              <span className="text-xs md:text-sm font-semibold tracking-wide text-white/90 drop-shadow-md bg-black/40 px-3 py-1 rounded-full border border-white/10 group-hover:text-white transition-colors">
                Watch in HD
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* Loading Spinner during iframe handoff */}
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-10">
                <Loader2 className="h-10 w-10 animate-spin text-red-600 mb-3" />
                <span className="text-xs text-muted-foreground font-mono uppercase tracking-widest animate-pulse">
                  Connecting Stream...
                </span>
              </div>
            )}

            {/* Active Iframe Embed */}
            <iframe
              src={activeEmbedUrl}
              title={title}
              className="absolute inset-0 w-full h-full border-0"
              allowFullScreen
              allow="autoplay; encrypted-media; picture-in-picture"
              referrerPolicy="no-referrer-when-downgrade"
              onLoad={() => setLoading(false)}
            />
          </>
        )}

        {/* Fallback for non-JS / search engines */}
        <noscript>
          <iframe
            src={embedUrl}
            title={title}
            className="absolute inset-0 w-full h-full border-0"
            allowFullScreen
            loading="lazy"
          />
        </noscript>
      </div>

      {/* Mode Bioskop instruction tip */}
      {!isFullscreen && (
        <div className="mt-3 text-[10px] text-muted-foreground/50 font-mono hidden md:flex gap-4 uppercase tracking-wider select-none">
          <span>[Space / K] Play</span>
          <span>[F] Fullscreen</span>
          {onToggleTheater && <span>[T] Theater Mode</span>}
        </div>
      )}
    </div>
  );
}
