"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Eye, Star } from "lucide-react";
import { EpornerVideo } from "../../types/eporner";
import { formatVideoDate } from "@/lib/utils";
import { buildWatchUrl } from "@/lib/video/slug";

interface VideoCardProps {
  video: EpornerVideo;
  priority?: boolean;
}

// 7 days in milliseconds — videos newer than this get a "NEW" badge.
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/** Formats view counts compactly so metadata always fits cleanly on one line on mobile cards. */
function formatCompactViews(rawViews: number): string {
  const n = Number(rawViews) || 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return n.toLocaleString("en-US");
}

/** Returns true if the video was added within the last 7 days. */
function isNewVideo(addedDateStr?: string): boolean {
  if (!addedDateStr) return false;
  try {
    const addedTs = new Date(addedDateStr).getTime();
    return Date.now() - addedTs < SEVEN_DAYS_MS;
  } catch {
    return false;
  }
}

export function VideoCard({ video, priority = false }: VideoCardProps) {
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
      className="group block w-full space-y-2 active:scale-[0.985] transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f6396c]/60 rounded-xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setCurrentThumbIndex(0);
      }}
    >
      {/* Thumbnail Aspect 16:9 */}
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-[#161616] border border-white/[0.07] transition-all duration-300 group-hover:border-white/[0.16]">
        {currentImageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentImageSrc}
            alt={video.title}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            width={320}
            height={180}
            className="object-cover w-full h-full transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
            No Image
          </div>
        )}

        {/* Subtle bottom scrim so duration pill stays crisp on bright frames */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

        {/* Rating badge (top left) */}
        {video.rate && parseFloat(video.rate) > 0 && (
          <span className="absolute top-1.5 left-1.5 bg-black/75 backdrop-blur-sm text-amber-400 border border-white/10 px-1.5 py-0.5 rounded-md text-[10px] leading-none font-mono font-semibold tabular-nums flex items-center gap-0.5">
            <Star className="h-2.5 w-2.5 fill-current" /> {Math.round(parseFloat(video.rate) * 20)}%
          </span>
        )}

        {/* Duration badge (bottom right) */}
        <span className="absolute bottom-1.5 right-1.5 bg-black/85 px-1.5 py-0.5 text-[10px] leading-none text-[#F5F5F5] rounded-md font-mono font-semibold tabular-nums tracking-wide border border-white/10">
          {video.length_min || "0:00"}
        </span>

        {/* NEW badge — shown for videos added within last 7 days (top right) */}
        {isNewVideo(video.added) && (
          <span className="absolute top-1.5 right-1.5 bg-[#f6396c] text-white px-1.5 py-0.5 rounded-md text-[9px] font-bold tracking-wide font-mono leading-none">
            NEW
          </span>
        )}
      </div>

      {/* Title and single-line compact stats */}
      <div className="px-0.5 text-left space-y-1">
        <h3 
          className="font-semibold text-[13px] sm:text-sm text-[#F3F3F3] leading-[1.35] line-clamp-2 group-hover:text-[#f6396c] transition-colors" 
          title={video.title}
        >
          {video.title}
        </h3>

        <div className="flex items-center gap-1.5 text-[11px] text-[#9A9A9A] font-mono tabular-nums whitespace-nowrap overflow-hidden">
          <span className="inline-flex items-center gap-1 shrink-0">
            <Eye className="h-3 w-3 opacity-60" /> {formatCompactViews(video.views)}
          </span>
          {video.added && (
            <>
              <span className="opacity-40 shrink-0">•</span>
              <span className="truncate">{formatVideoDate(video.added)}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
