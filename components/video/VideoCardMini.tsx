"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Eye, Star } from "lucide-react";
import { EpornerVideo } from "../../types/eporner";

interface VideoCardMiniProps {
  video: EpornerVideo;
}

export function VideoCardMini({ video }: VideoCardMiniProps) {

  // Hover Thumbnail Slideshow Logic
  const [isHovered, setIsHovered] = useState(false);
  const [currentThumbIndex, setCurrentThumbIndex] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isHovered && video.thumbs && video.thumbs.length > 0) {
      interval = setInterval(() => {
        setCurrentThumbIndex((prev) => (prev + 1) % video.thumbs.length);
      }, 600); // Change frame every 600ms
    } else {
      setCurrentThumbIndex(0);
    }
    return () => clearInterval(interval);
  }, [isHovered, video.thumbs]);

  const currentImageSrc = isHovered && video.thumbs && video.thumbs.length > 0
    ? video.thumbs[currentThumbIndex].src
    : video.default_thumb?.src;

  return (
    <Link 
      href={`/watch?v=${video.id}`} 
      className="group flex gap-2.5 w-full text-left"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Thumbnail column */}
      <div className="relative w-32 sm:w-40 aspect-video rounded-lg overflow-hidden shrink-0 bg-[#161616] border border-white/5">
        {currentImageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentImageSrc}
            alt={video.title}
            loading="lazy"
            className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-103"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[9px] text-muted-foreground">
            No Image
          </div>
        )}

        {/* Duration badge */}
        <span className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.2 text-[8px] text-[#F1F1F1] rounded font-mono font-bold border border-white/5">
          {video.length_min || "0:00"}
        </span>
      </div>

      {/* Info column */}
      <div className="flex-1 space-y-1 min-w-0">
        <h4 
          className="text-xs sm:text-sm font-semibold text-[#F1F1F1] leading-tight line-clamp-2 group-hover:text-red-500 transition-colors"
          title={video.title}
        >
          {video.title}
        </h4>
        
        <div className="space-y-0.5">

          {/* Views & Rating */}
          <div className="flex items-center gap-1 text-[9px] sm:text-xs text-[#AAAAAA] font-mono">
            <span className="flex items-center gap-0.5 shrink-0">
              <Eye className="h-3 w-3 opacity-60" /> {video.views.toLocaleString("en-US")}
            </span>
            {video.rate && parseFloat(video.rate) > 0 && (
              <>
                <span>•</span>
                <span className="flex items-center gap-0.5 text-yellow-500 shrink-0">
                  <Star className="h-3 w-3 fill-current" /> {Math.round(parseFloat(video.rate) * 20)}%
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
