"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2 } from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

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
          if (onToggleTheater) {
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

        {/* Loading Spinner */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-20">
            <Loader2 className="h-10 w-10 animate-spin text-red-600 mb-3" />
            <span className="text-xs text-muted-foreground font-mono uppercase tracking-widest animate-pulse">Connecting Stream...</span>
          </div>
        )}

        {/* Iframe embed */}
        <iframe
          src={embedUrl}
          title={title}
          className={`absolute inset-0 w-full h-full border-0 transition-opacity duration-500 ${loading ? "opacity-0" : "opacity-100"}`}
          allowFullScreen
          allow="encrypted-media; picture-in-picture"
          onLoad={() => setLoading(false)}
        />


      </div>

      {/* Mode Bioskop instruction tip */}
      {!isFullscreen && (
        <div className="mt-3 text-[10px] text-muted-foreground/50 font-mono hidden md:flex gap-4 uppercase tracking-wider select-none">
          <span>[F] Fullscreen</span>
          {onToggleTheater && <span>[T] Theater Mode</span>}
        </div>
      )}
    </div>
  );
}
