"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Eye, Star } from "lucide-react";
import { EpornerVideo } from "../../types/eporner";
import { buildWatchUrl } from "@/lib/video/slug";

interface VideoCardMiniProps {
  video: EpornerVideo;
}

export function VideoCardMini({ video }: VideoCardMiniProps) {

  // Hover Thumbnail Slideshow Logic
  const [isHovered, setIsHovered] = useState(false);
  const [currentThumbIndex, setCurrentThumbIndex] = useState(0);

  useEffect(() => {
    if (!isHovered || !video.thumbs || video.thumbs.length === 0) return;

    const interval = setInterval(() => {
      setCurrentThumbIndex((prev) => (prev + 1) % video.thumbs.length);
    }, 600); // Change frame every 600ms

    return () => clearInterval(interval);
  }, [isHovered, video.thumbs]);

  const currentImageSrc = isHovered && video.thumbs && video.thumbs.length > 0
    ? (video.thumbs[currentThumbIndex]?.src || video.default_thumb?.src)
    : video.default_thumb?.src;

  return (
    <Link 
      href={buildWatchUrl(video.id, video.title)} 
      className="group flex gap-3 w-full text-left p-1.5 -mx-1.5 rounded-xl hover:bg-white/[0.04] active:scale-[0.99] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setCurrentThumbIndex(0);
      }}
    >
      {/* Thumbnail column */}
      <div className="relative w-36 sm:w-40 xl:w-[152px] aspect-video rounded-lg overflow-hidden shrink-0 bg-[#161616] border border-white/[0.07]">
        {currentImageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentImageSrc}
            alt={video.title}
            loading="lazy"
            decoding="async"
            width={160}
            height={90}
            className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">
            No Preview
          </div>
        )}

        {/* Duration badge */}
        <span className="absolute bottom-1 right-1 bg-black/85 px-1.5 py-0.5 text-[10px] leading-none text-[#F1F1F1] rounded font-mono font-semibold tabular-nums border border-white/10">
          {video.length_min || "0:00"}
        </span>
      </div>

      {/* Info column */}
      <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
        <h3 
          className="text-[13px] sm:text-sm font-medium text-[#F1F1F1] leading-snug line-clamp-2 group-hover:text-red-400 transition-colors"
          title={video.title}
        >
          {video.title}
        </h3>
        
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 pt-1 text-[11px] text-[#9A9A9A] font-mono tabular-nums">
          <span className="inline-flex items-center gap-1 shrink-0">
            <Eye className="h-3 w-3 opacity-60" /> {(Number(video.views) || 0).toLocaleString("en-US")}
          </span>
          {video.rate && parseFloat(video.rate) > 0 && (
            <span className="inline-flex items-center gap-0.5 text-amber-400/90 shrink-0">
              <Star className="h-2.5 w-2.5 fill-current" /> {Math.round(parseFloat(video.rate) * 20)}%
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
