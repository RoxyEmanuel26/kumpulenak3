"use client";

/**
 * components/video/ContinueWatching.tsx
 *
 * A "Continue Watching" row for the homepage that shows the user's last 3
 * watched videos, pulled from UIContext watchHistory (backed by localStorage).
 *
 * This component gives the site a personalized feel for returning visitors
 * without requiring user accounts or any server-side state.
 *
 * Behavior:
 *  - Reads watchHistory from UIContext (localStorage-backed, up to 50 videos).
 *  - Looks up video thumbnails/titles from Eporner thumbnail URLs.
 *  - Shows the last 3 unique watched videos (most recent first).
 *  - Renders nothing if: (a) no history exists, (b) not mounted yet (SSR guard).
 *
 * Analytics:
 *  - Analytics.continueWatchingClick(position) → fires when a video is clicked
 *    position is 0-indexed (0 = most recently watched)
 *
 * Performance:
 *  - Client component — renders after hydration, no blocking of SSR
 *  - No API calls — only uses locally-stored video IDs and Eporner CDN thumbnails
 *  - Thumbnails use standard Eporner CDN URL pattern (no custom API call needed)
 *
 * Note:
 *  We only store video IDs in history, not full video objects. Eporner's CDN
 *  provides thumbnails at predictable URLs: //www.eporner.com/hd-thumbs/{id}/{n}.jpg
 *  We use thumb slot 1 (medium quality, always available).
 *
 * Usage (in app/(user)/page.tsx):
 *   import { ContinueWatching } from "@/components/video/ContinueWatching";
 *   // Inside the return, before the video grid:
 *   {page === 1 && <ContinueWatching />}
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, Play } from "lucide-react";
import { useUI } from "@/components/layout/UIContext";
import { Analytics } from "@/lib/analytics";
import { buildWatchUrl } from "@/lib/video/slug";

const MAX_DISPLAY = 4;

interface VideoDetail {
  title: string;
  thumbnail: string;
}

export function ContinueWatching() {
  const { watchHistory } = useUI();
  const [isMounted, setIsMounted] = useState(false);
  const [videoDetails, setVideoDetails] = useState<Record<string, VideoDetail>>({});
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(true);

  // Take the last MAX_DISPLAY watched videos (most recent first)
  const recentVideos = watchHistory.slice(0, MAX_DISPLAY);

  useEffect(() => {
    setIsMounted(true);

    if (recentVideos.length === 0) {
      setLoading(false);
      return;
    }

    const fetchDetails = async () => {
      const details: Record<string, VideoDetail> = {};
      try {
        await Promise.all(
          recentVideos.map(async (id) => {
            const res = await fetch(`/api/videos/${id}`);
            if (res.ok) {
              const data = await res.json();
              
              let thumbObj = data.defaultThumb || data.default_thumb || data.thumbs?.[0];
              let thumbnail = "";

              if (typeof thumbObj === "string") {
                if (thumbObj.startsWith("http") || thumbObj.startsWith("//")) {
                  thumbnail = thumbObj;
                } else {
                  try {
                    const parsed = JSON.parse(thumbObj);
                    thumbnail = parsed?.src || "";
                  } catch (e) {
                    // ignore
                  }
                }
              } else if (thumbObj && typeof thumbObj === "object") {
                thumbnail = thumbObj.src || "";
              }
              
              details[id] = {
                title: data.title || "",
                thumbnail,
              };
            }
          })
        );
      } catch (err) {
        console.error("Error fetching continue watching video details:", err);
      } finally {
        setVideoDetails(details);
        setLoading(false);
      }
    };

    fetchDetails();
  }, [watchHistory]);

  // Don't render until mounted (prevents SSR/hydration mismatch)
  if (!isMounted) return null;

  // Don't render if no history
  if (recentVideos.length === 0) return null;

  return (
    <nav
      aria-label="Continue watching"
      className="space-y-2.5"
    >
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-sm sm:text-base font-bold tracking-tight text-[#F5F5F5] flex items-center gap-2">
          <Clock className="h-4 w-4 text-[#f6396c]" />
          <span>Continue Watching</span>
        </h2>
        <Link
          href="/library"
          rel="nofollow"
          className="text-xs font-medium text-[#9A9A9A] hover:text-white transition-colors"
        >
          History →
        </Link>
      </div>

      {/* Horizontal swipeable compact resume cards */}
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0 pb-0.5">
        {recentVideos.map((videoId, index) => {
          const detail = videoDetails[videoId];
          const title = detail?.title || "Resume watched video";
          return (
            <Link
              key={videoId}
              href={detail?.title ? buildWatchUrl(videoId, detail.title) : `/watch/${videoId}`}
              onClick={() => Analytics.continueWatchingClick(index)}
              className="group flex items-center gap-2.5 w-[230px] sm:w-[260px] shrink-0 bg-[#161616] hover:bg-[#1F1F1F] active:scale-[0.98] border border-white/[0.07] hover:border-white/[0.15] rounded-xl p-2 transition-all duration-200"
              title={title}
            >
              {/* Thumbnail */}
              <div className="w-20 aspect-video rounded-lg overflow-hidden bg-[#101010] shrink-0 relative">
                {detail?.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={detail.thumbnail}
                    alt={title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-[#f6396c]/10 flex items-center justify-center">
                    <Play className="h-3.5 w-3.5 text-[#f6396c] fill-current" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                  <span className="w-6 h-6 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-white">
                    <Play className="h-2.5 w-2.5 fill-current ml-0.5" />
                  </span>
                </div>
                <div className="absolute bottom-0 inset-x-0 h-0.5 bg-white/15">
                  <div className="h-full w-2/3 bg-[#f6396c]" />
                </div>
              </div>

              {/* Video title & resume cue */}
              <div className="min-w-0 flex-1 space-y-1 text-left">
                <p className="text-xs font-medium text-[#F1F1F1] group-hover:text-white line-clamp-2 leading-snug">
                  {title}
                </p>
                <span className="inline-block text-[10px] font-medium text-[#f6396c]">
                  Resume
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
