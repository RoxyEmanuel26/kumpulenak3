"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { VideoPlayer } from "./VideoPlayer";
import { VideoCardMini } from "./VideoCardMini";
import { useUI } from "../layout/UIContext";
import {
  ThumbsUp, 
  ThumbsDown
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EpornerVideo } from "@/types/eporner";

interface WatchPageClientProps {
  video: EpornerVideo;
  relatedVideos: EpornerVideo[];
}

export function WatchPageClient({ video, relatedVideos }: WatchPageClientProps) {
  const { likedVideos, toggleLikeVideo, addToHistory } = useUI();
  const [isTheater, setIsTheater] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  // Calculate rating percentage and total estimated votes
  const rateVal = video.rate ? parseFloat(video.rate) : 0;
  const ratingPercent = rateVal > 0 ? Math.round(rateVal * 20) : 90;
  const totalVotes = Math.max(5, Math.round(video.views * 0.015));
  
  const baseLikes = Math.round(totalVotes * (ratingPercent / 100));
  const baseDislikes = totalVotes - baseLikes;

  // Track vote states
  const isLikedGlobal = likedVideos.includes(video.id);
  const [localVote, setLocalVote] = useState<"like" | "dislike" | null>(null);

  // Determine actual display likes/dislikes
  let displayLikes = baseLikes;
  let displayDislikes = baseDislikes;

  // Adjust display values based on user global/local vote states
  if (isLikedGlobal) {
    displayLikes += 1;
  } else if (localVote === "dislike") {
    displayDislikes += 1;
  }

  const currentPercent = Math.round((displayLikes / (displayLikes + displayDislikes)) * 100);

  // Record video in local watch history
  useEffect(() => {
    addToHistory(video.id);
  }, [video.id, addToHistory]);

  // Reset local vote state when video changes to prevent cross-video state leakage (render-phase state adjustment)
  const [prevVideoId, setPrevVideoId] = useState(video.id);
  if (video.id !== prevVideoId) {
    setPrevVideoId(video.id);
    setLocalVote(null);
  }

  const handleLike = () => {
    toggleLikeVideo(video.id);
    if (localVote === "dislike") {
      setLocalVote(null);
    }
  };

  const handleDislike = () => {
    if (isLikedGlobal) {
      toggleLikeVideo(video.id);
      setLocalVote("dislike");
    } else {
      setLocalVote(localVote === "dislike" ? null : "dislike");
    }
  };

  const keywordsList = video.keywords ? video.keywords.split(",").map(k => k.trim()).filter(Boolean) : [];

  return (
    <div className="flex flex-col w-full bg-[#0F0F0F] text-white">
      {/* 1. Large player layout - full width on mobile, responsive padding on desktop */}
      <div className={`w-full bg-black flex justify-center ${
        isTheater ? "border-b border-white/5 py-0" : "py-0 md:py-6 px-0 md:px-4"
      }`}>
        <VideoPlayer
          embedUrl={video.embed || `https://www.eporner.com/embed/${video.id}/`}
          title={video.title}
          thumbnailUrl={video.default_thumb?.src || null}
          isTheater={isTheater}
          onToggleTheater={() => setIsTheater(!isTheater)}
        />
      </div>

      {/* 2. Main content area below player */}
      <div className={`container mx-auto px-4 md:px-6 py-4 md:py-6 flex flex-col lg:flex-row gap-5 md:gap-6 ${
        isTheater ? "max-w-7xl" : "max-w-6xl"
      }`}>
        
        {/* Left Column: Video Info */}
        <div className="flex-1 min-w-0 space-y-4">
          <h1 className="text-lg md:text-2xl font-bold leading-tight break-words text-[#F1F1F1] text-left">
            {video.title}
          </h1>

          {/* Action Bar */}
          <div className="flex items-center justify-between gap-2 sm:gap-3 py-2.5 border-b border-white/5 w-full">
            <div className="flex items-center bg-[#272727] hover:bg-[#3F3F3F] transition-colors rounded-full overflow-hidden border border-white/5 shrink-0">
              <button 
                onClick={handleLike}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-2 border-r border-white/10 cursor-pointer transition-colors ${isLikedGlobal ? 'text-white bg-white/5' : 'text-[#AAAAAA] hover:text-white'}`}
              >
                <ThumbsUp className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLikedGlobal ? "fill-current text-green-500" : ""}`} />
                <span className="text-xs sm:text-sm font-semibold font-mono">
                  {displayLikes.toLocaleString("en-US")}
                </span>
              </button>
              <button 
                onClick={handleDislike}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-2 cursor-pointer transition-colors ${localVote === "dislike" ? 'text-white bg-white/5' : 'text-[#AAAAAA] hover:text-white'}`}
              >
                <ThumbsDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${localVote === "dislike" ? "fill-current text-red-500" : ""}`} />
                <span className="text-xs sm:text-sm font-semibold font-mono">
                  {displayDislikes.toLocaleString("en-US")}
                </span>
              </button>
            </div>

            <span className="text-[10px] sm:text-xs text-muted-foreground font-mono bg-[#161616]/40 border border-white/5 px-2.5 sm:px-3 py-1.5 rounded-full backdrop-blur-md shrink-0">
              {currentPercent}% approval
            </span>
          </div>

          {/* Description Box */}
          <div className="bg-[#272727] rounded-xl p-4 hover:bg-[#3F3F3F] transition-colors mt-4">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold mb-2 text-muted-foreground">
              <span className="text-white">{video.views.toLocaleString("en-US")} views</span>
              <span>•</span>
              <span className="text-white">{video.added}</span>
            </div>
            
            <div className={`text-xs sm:text-sm text-[#F1F1F1] leading-relaxed whitespace-pre-wrap ${!descExpanded ? "line-clamp-3" : ""}`}>
               {(descExpanded ? keywordsList : keywordsList.slice(0, 10)).map((tag, idx) => (
                  <Link 
                    key={idx} 
                    href={`/results?search_query=${encodeURIComponent(tag)}`}
                    className="text-blue-400 hover:underline mr-2 inline-block"
                  >
                    #{tag.replace(/\s+/g, '')}
                  </Link>
               ))}
            </div>

            <button 
              onClick={() => setDescExpanded(!descExpanded)}
              className="text-xs sm:text-sm font-semibold mt-2 hover:underline cursor-pointer text-[#AAAAAA] hover:text-white"
            >
              {descExpanded ? "Show less" : "Show more"}
            </button>
            
            {/* Tags / Categories badges inside desc */}
            {descExpanded && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/10">
                {keywordsList.map((tag, index) => (
                  <Link key={index} href={`/results?search_query=${encodeURIComponent(tag)}`}>
                    <Badge variant="secondary" className="bg-white/10 text-xs text-[#F1F1F1] hover:bg-white/20 border-0 cursor-pointer py-1 px-2.5 rounded-lg">
                      {tag}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Related Videos */}
        <div className="w-full lg:w-[400px] shrink-0 space-y-4">
          <div className="flex items-center justify-between pb-2">
            <h3 className="font-bold text-lg">Recommended</h3>
          </div>
          
          <div className="flex flex-col gap-3">
            {relatedVideos.map((relVideo) => (
              <VideoCardMini key={relVideo.id} video={relVideo} />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
