"use client";

import React from "react";
import { VideoCard } from "./VideoCard";
import { EpornerVideo } from "../../types/eporner";
import { AdsterraNativeBanner } from "../ads/AdsterraNativeBanner";

interface VideoGridProps {
  videos: EpornerVideo[];
}

export function VideoGrid({ videos }: VideoGridProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-y-8 gap-x-4 animate-in fade-in duration-300">
        {videos.map((video, index) => (
          <React.Fragment key={video.id}>
            {/* Inject Native Banner at index 5 (after first 5 videos) */}
            {index === 5 && (
              <div className="flex w-full items-center justify-center overflow-hidden col-span-full my-2">
                <AdsterraNativeBanner />
              </div>
            )}
            <VideoCard video={video} />
          </React.Fragment>
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
