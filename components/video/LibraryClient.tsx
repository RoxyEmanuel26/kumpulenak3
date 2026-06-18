"use client";

import { useUI } from "../layout/UIContext";
import { VideoCard } from "./VideoCard";
import { Clock, ThumbsUp, Trash2, Library } from "lucide-react";

import { EpornerVideo } from "../../types/eporner";

interface LibraryClientProps {
  allVideos: EpornerVideo[];
}

export function LibraryClient({ allVideos }: LibraryClientProps) {
  const { watchHistory, likedVideos, clearHistory } = useUI();

  // Filter videos that are in the user's local history / likes
  const historyList = watchHistory
    .map((id) => allVideos.find((v) => v.id === id))
    .filter((v): v is EpornerVideo => !!v);

  const likesList = likedVideos
    .map((id) => allVideos.find((v) => v.id === id))
    .filter((v): v is EpornerVideo => !!v);

  return (
    <div className="container mx-auto px-4 py-6 text-left space-y-12">
      {/* Page Header */}
      <div className="border-b border-white/5 pb-4 flex items-center gap-3">
        <div className="p-3 bg-red-600/10 rounded-full border border-red-600/20 text-red-500">
          <Library className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white">My Library</h2>
          <p className="text-xs text-muted-foreground mt-0.5 font-mono">Local watch history and liked videos</p>
        </div>
      </div>

      {/* 1. Watch History Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <h3 className="text-sm sm:text-base font-bold uppercase tracking-wider flex items-center gap-2">
            <Clock className="h-4 w-4 text-red-500" />
            Watch History ({historyList.length})
          </h3>
          {historyList.length > 0 && (
            <button
              onClick={clearHistory}
              className="text-xs font-semibold text-red-500 hover:text-red-400 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear All</span>
            </button>
          )}
        </div>

        {historyList.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {historyList.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        ) : (
          <p className="text-xs sm:text-sm text-muted-foreground italic py-6">
            No watch history yet. Start playing videos to add them here.
          </p>
        )}
      </div>

      {/* 2. Liked Videos Section */}
      <div className="space-y-4 pt-4">
        <div className="border-b border-white/5 pb-2">
          <h3 className="text-sm sm:text-base font-bold uppercase tracking-wider flex items-center gap-2">
            <ThumbsUp className="h-4 w-4 text-red-500" />
            Liked Videos ({likesList.length})
          </h3>
        </div>

        {likesList.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {likesList.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        ) : (
          <p className="text-xs sm:text-sm text-muted-foreground italic py-6">
            No liked videos yet. Click the Like 👍 button on a video to save it here.
          </p>
        )}
      </div>
    </div>
  );
}
