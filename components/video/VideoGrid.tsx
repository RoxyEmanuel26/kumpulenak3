"use client";

import { VideoCard } from "./VideoCard";
import { EpornerVideo } from "../../types/eporner";

interface VideoGridProps {
  videos: EpornerVideo[];
}

export function VideoGrid({ videos }: VideoGridProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-y-8 gap-x-4 animate-in fade-in duration-300">
        {videos.map((video) => (
          <VideoCard 
            key={video.id} 
            video={video} 
          />
        ))}
      </div>

      {/* Empty State */}
      {videos.length === 0 && (
        <div className="text-center text-muted-foreground py-24 bg-[#161616] rounded-xl border border-white/5 max-w-md mx-auto">
          <div className="text-4xl mb-3">🎬</div>
          <p className="text-sm font-semibold text-white">No videos found</p>
          <p className="text-xs text-[#AAAAAA] mt-1 px-4">
            There are no videos registered for this category in our feed.
          </p>
        </div>
      )}
    </div>
  );
}
