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
import { Clock } from "lucide-react";
import { useUI } from "@/components/layout/UIContext";
import { Analytics } from "@/lib/analytics";
import { buildWatchUrl } from "@/lib/video/slug";

const MAX_DISPLAY = 3;

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
      className="pb-3 border-b border-white/5"
    >
      {/* Section header */}
      <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest font-mono mb-3 flex items-center gap-1.5">
        <Clock className="h-3 w-3" />
        Continue Watching
      </h2>

      {/* Video chips */}
      <div className="flex flex-wrap gap-2">
        {recentVideos.map((videoId, index) => (
          <Link
            key={videoId}
            href={videoDetails[videoId]?.title ? buildWatchUrl(videoId, videoDetails[videoId].title) : `/watch/${videoId}`}
            onClick={() => Analytics.continueWatchingClick(index)}
            className="group flex items-center gap-2 bg-[#1F1F1F] hover:bg-[#2A2A2A] border border-white/10 hover:border-red-600/30 rounded-lg px-2 py-1.5 transition-all"
            title={videoDetails[videoId]?.title || `Continue watching video ${index + 1}`}
          >
            {/* Thumbnail */}
            <div className="w-14 h-9 rounded overflow-hidden bg-[#161616] shrink-0 relative">
              {videoDetails[videoId]?.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={videoDetails[videoId].thumbnail}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full bg-red-600/10 flex items-center justify-center">
                  <span className="text-[10px] text-red-500 font-bold">▶</span>
                </div>
              )}
              {/* Overlay play hint */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                <span className="text-[8px] text-white font-bold">▶</span>
              </div>
            </div>

            {/* Label */}
            <span className="text-[10px] text-[#AAAAAA] group-hover:text-white font-mono transition-colors">
              #{index + 1}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
