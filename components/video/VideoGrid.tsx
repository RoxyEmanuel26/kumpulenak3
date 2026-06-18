"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { VideoCard } from "./VideoCard";
import { LayoutGrid, StretchHorizontal } from "lucide-react";

interface TagItem {
  tag: {
    id: string;
    name: string;
  };
}

interface Video {
  id: string;
  title: string;
  duration: string | null;
  rating: string | null;
  views: number;
  thumbnail: string | null;
  tags: TagItem[];
}

interface VideoGridProps {
  videos: Video[];
  categories: string[];
  activeCategory: string;
  onSelectVideo: (videoId: string) => void;
}

export function VideoGrid({ 
  videos, 
  categories, 
  activeCategory, 
  onSelectVideo 
}: VideoGridProps) {
  const [layoutMode, setLayoutMode] = useState<"grid" | "row">("grid");
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleCategoryChange = (category: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (category === "all") {
      params.delete("category");
    } else {
      params.set("category", category);
    }
    params.set("page", "1"); // Reset pagination to page 1 when changing category
    router.push(`/?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-8">
      {/* Filters, Tabs & Layout Toggles */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center border-b border-white/5 pb-4">
        {/* Category Pill Tabs */}
        <div className="flex flex-wrap gap-2 max-w-full overflow-x-auto no-scrollbar scroll-smooth">
          <button
            onClick={() => handleCategoryChange("all")}
            className={`text-xs font-semibold px-4 py-2 rounded-full border transition-all cursor-pointer ${
              activeCategory === "all"
                ? "bg-primary border-primary text-white shadow-premium"
                : "bg-white/5 border-white/5 text-muted-foreground hover:text-white hover:border-white/10"
            }`}
          >
            Semua
          </button>
          
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`text-xs font-semibold px-4 py-2 rounded-full border transition-all cursor-pointer whitespace-nowrap ${
                activeCategory.toLowerCase() === cat.toLowerCase()
                  ? "bg-primary border-primary text-white shadow-premium"
                  : "bg-white/5 border-white/5 text-muted-foreground hover:text-white hover:border-white/10"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Layout Toggle Buttons */}
        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/5 self-end sm:self-auto">
          <button
            onClick={() => setLayoutMode("grid")}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              layoutMode === "grid" 
                ? "bg-primary text-white" 
                : "text-muted-foreground hover:text-white"
            }`}
            title="Grid View"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setLayoutMode("row")}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              layoutMode === "row" 
                ? "bg-primary text-white" 
                : "text-muted-foreground hover:text-white"
            }`}
            title="Row View (Horizontal)"
          >
            <StretchHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main content display based on selected layout mode */}
      {layoutMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-in fade-in duration-500">
          {videos.map((video) => (
            <VideoCard 
              key={video.id} 
              video={video} 
              onClick={() => onSelectVideo(video.id)} 
            />
          ))}
        </div>
      ) : (
        /* Netflix style horizontal scroll row */
        <div className="w-full overflow-x-auto pb-4 no-scrollbar scroll-smooth flex gap-6 px-1 animate-in fade-in duration-500">
          {videos.map((video) => (
            <div key={video.id} className="min-w-[280px] w-[280px] sm:min-w-[320px] sm:w-[320px] shrink-0">
              <VideoCard 
                video={video} 
                onClick={() => onSelectVideo(video.id)} 
              />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {videos.length === 0 && (
        <div className="text-center text-muted-foreground py-20 bg-white/2 rounded-2xl border border-white/5 max-w-md mx-auto">
          <div className="text-3xl mb-2">🎬</div>
          <p className="text-sm font-semibold">Koleksi video kosong</p>
          <p className="text-xs text-muted-foreground mt-1 px-4">
            Tidak ada video yang terdaftar untuk kategori ini saat ini.
          </p>
        </div>
      )}
    </div>
  );
}
