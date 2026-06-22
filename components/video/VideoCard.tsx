"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Eye, Star } from "lucide-react";
import { EpornerVideo } from "../../types/eporner";
import { formatVideoDate } from "@/lib/utils";


interface VideoCardProps {
  video: EpornerVideo;
}

export function VideoCard({ video }: VideoCardProps) {

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
    ? video.thumbs[currentThumbIndex].src
    : video.default_thumb?.src;

  return (
    <Link 
      href={`/watch/${video.id}`} 
      className="group block w-full space-y-2.5"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setCurrentThumbIndex(0);
      }}
    >
      {/* Thumbnail Aspect 16:9 */}
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-[#161616] border border-white/5 transition-all duration-300">
        {currentImageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentImageSrc}
            alt={video.title}
            loading="lazy"
            className="object-cover w-full h-full transition-transform duration-500 ease-out group-hover:scale-103"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
            No Image
          </div>
        )}



        {/* Video tags / quality badge (left) */}
        {video.rate && parseFloat(video.rate) > 0 && (
          <span className="absolute top-2 left-2 bg-black/80 text-yellow-500 border border-white/5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-0.5">
            <Star className="h-2.5 w-2.5 fill-current" /> {Math.round(parseFloat(video.rate) * 20)}%
          </span>
        )}

        {/* Duration badge (bottom right) */}
        <span className="absolute bottom-2 right-2 bg-black/85 px-1.5 py-0.5 text-[9px] text-[#F1F1F1] rounded font-mono font-bold tracking-wide border border-white/5">
          {video.length_min || "0:00"}
        </span>
      </div>

      {/* Title and stats */}
      <div className="px-1 text-left">

        <div className="space-y-1">
          <h3 
            className="font-medium text-[13px] md:text-sm text-[#F1F1F1] leading-snug line-clamp-2 group-hover:text-red-500 transition-colors" 
            title={video.title}
          >
            {video.title}
          </h3>

          <div className="flex items-center gap-1.5 text-[11px] text-[#AAAAAA] font-mono">
            <span className="flex items-center gap-0.5">
              <Eye className="h-3 w-3 opacity-60" /> {video.views.toLocaleString("en-US")}
            </span>
            {video.added && (
              <>
                <span>•</span>
                <span>{formatVideoDate(video.added)}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
