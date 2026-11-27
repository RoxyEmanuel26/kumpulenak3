"use client";

import React from "react";
import { VideoCard } from "./VideoCard";
import { EpornerVideo } from "../../types/eporner";
import { AdsterraNativeBanner } from "../ads/AdsterraNativeBanner";

interface VideoGridProps {
  videos: EpornerVideo[];
  showNativeAd?: boolean;
  carouselOnMobile?: boolean;
}

export function VideoGrid({
  videos,
  showNativeAd = true,
  carouselOnMobile = false,
}: VideoGridProps) {
  return (
    <div className="space-y-6">
      <h2 className="sr-only">Videos List</h2>
      {carouselOnMobile ? (
        <div className="flex sm:grid sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0 pb-1">
          {videos.map((video, index) => (
            <div key={video.id} className="w-[66vw] max-w-[240px] sm:w-auto sm:max-w-none shrink-0 snap-start">
              <VideoCard
                video={video}
                priority={index < 4}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-3 gap-y-5 sm:gap-x-4 sm:gap-y-7 animate-in fade-in duration-300">
          {videos.map((video, index) => (
            <React.Fragment key={video.id}>
              {/* Inject Native Banner after first 5 videos (strictly 1 per page via showNativeAd) */}
              {showNativeAd && index === 5 && (
                <div className="flex w-full items-center justify-center overflow-hidden col-span-full my-1" aria-hidden="true">
                  <AdsterraNativeBanner />
                </div>
              )}
              <VideoCard
                video={video}
                priority={index < 4}
              />
            </React.Fragment>
          ))}
        </div>
      )}

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
