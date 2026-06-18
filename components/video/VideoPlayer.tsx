"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Maximize, Minimize, Tv, Volume2, VolumeX, Play, Pause, Share2 } from "lucide-react";

interface VideoPlayerProps {
  embedUrl: string;
  title: string;
  thumbnailUrl?: string | null;
}

export function VideoPlayer({ embedUrl, title, thumbnailUrl }: VideoPlayerProps) {
  const [loading, setLoading] = useState(true);
  const [isTheater, setIsTheater] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      switch (e.key.toLowerCase()) {
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
          e.preventDefault();
          setIsMuted((prev) => !prev);
          break;
        case "t":
          e.preventDefault();
          setIsTheater((prev) => !prev);
          break;
        case " ":
          e.preventDefault();
          setIsPlaying((prev) => !prev);
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggleFullscreen = () => {
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
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: title,
        url: window.location.href
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Tautan video berhasil disalin!");
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Outer wrapper with theater mode toggle */}
      <div 
        ref={containerRef}
        className={`relative w-full overflow-hidden rounded-2xl border border-white/5 bg-black transition-all duration-500 shadow-premium ${
          isTheater && !isFullscreen ? "max-w-full xl:h-[75vh]" : "max-w-5xl aspect-video"
        } ${isFullscreen ? "h-screen w-screen rounded-none border-0" : ""}`}
      >
        {/* Ambient Ambilight Glow (Philips Ambilight Style) */}
        {thumbnailUrl && !isFullscreen && (
          <div 
            className="absolute inset-0 -z-10 blur-[80px] opacity-35 scale-[1.08] pointer-events-none transition-all duration-1000"
            style={{
              backgroundImage: `url(${thumbnailUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
            <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider animate-pulse">Menghubungkan Stream...</span>
          </div>
        )}

        {/* Iframe embed */}
        <iframe
          src={`${embedUrl}${isMuted ? "?muted=1" : ""}`}
          className={`w-full h-full border-0 transition-opacity duration-500 ${loading ? "opacity-0" : "opacity-100"}`}
          allowFullScreen
          allow="autoplay; encrypted-media; picture-in-picture"
          onLoad={() => setLoading(false)}
        />

        {/* Video Overlay Info & controls */}
        {!loading && (
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-10 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3.5 rounded-xl border border-white/5 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="text-white hover:text-primary transition-colors p-1"
                title={isPlaying ? "Pause (Spasi)" : "Play (Spasi)"}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
              </button>
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className="text-white hover:text-primary transition-colors p-1"
                title={isMuted ? "Unmute (M)" : "Mute (M)"}
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <span className="text-[10px] text-muted-foreground font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5">
                STREAMING
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={handleShare}
                className="text-white hover:text-primary transition-colors p-1"
                title="Bagikan Video"
              >
                <Share2 className="h-4 w-4" />
              </button>
              {!isFullscreen && (
                <button 
                  onClick={() => setIsTheater(!isTheater)}
                  className={`text-white hover:text-primary transition-colors p-1 ${isTheater ? "text-primary" : ""}`}
                  title="Mode Bioskop (T)"
                >
                  <Tv className="h-4 w-4" />
                </button>
              )}
              <button 
                onClick={toggleFullscreen}
                className="text-white hover:text-primary transition-colors p-1"
                title="Fullscreen (F)"
              >
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mode Bioskop instruction tip */}
      {!isFullscreen && (
        <div className="mt-3 text-[10px] text-muted-foreground/60 font-mono flex gap-4 uppercase tracking-wider">
          <span>[Spasi] Play/Pause</span>
          <span>[F] Fullscreen</span>
          <span>[M] Mute</span>
          <span>[T] Mode Bioskop</span>
        </div>
      )}
    </div>
  );
}
