"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Loader2, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VideoPlayer } from "./VideoPlayer";
import Link from "next/link";

interface TagItem {
  tag: {
    id: string;
    name: string;
  };
}

interface CategoryItem {
  category: {
    id: string;
    name: string;
  };
}

interface VideoDetail {
  id: string;
  title: string;
  duration: string | null;
  rating: string | null;
  views: number;
  thumbnail: string | null;
  embedUrl: string | null;
  aiDescription: string | null;
  tags: TagItem[];
  categories: CategoryItem[];
}

interface RelatedVideo {
  id: string;
  title: string;
  duration: string | null;
  rating: string | null;
  views: number;
  thumbnail: string | null;
}

interface VideoModalProps {
  videoId: string | null;
  onClose: () => void;
}

export function VideoModal({ videoId, onClose }: VideoModalProps) {
  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [related, setRelated] = useState<RelatedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const [videoRes, relatedRes] = await Promise.all([
        fetch(`/api/videos/${id}`),
        fetch(`/api/videos/${id}/related`),
      ]);

      if (!videoRes.ok) throw new Error("Failed to load video details.");
      
      const videoJson = await videoRes.json();
      const relatedJson = await relatedRes.json();

      setVideo(videoJson);
      setRelated(Array.isArray(relatedJson) ? relatedJson : []);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!videoId) {
      setVideo(null);
      setRelated([]);
      return;
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    loadData(videoId);
  }, [videoId, loadData]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (videoId) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [videoId]);

  if (!videoId) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      {/* Click outside to close */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />

      <div className="relative w-full max-w-6xl bg-[#111] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[90vh] md:h-[80vh] max-h-[850px] animate-in zoom-in-95 duration-300 z-10">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-30 p-2 bg-black/60 border border-white/10 rounded-full text-white hover:text-primary transition-all hover:bg-black/80 cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-mono animate-pulse">Loading Content...</span>
          </div>
        ) : error || !video ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="text-red-500 text-3xl mb-2">⚠️</div>
            <p className="font-semibold text-white">Failed to Load Video</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">{error || "An internal error occurred."}</p>
            <Button onClick={onClose} className="mt-4 text-xs font-semibold rounded-xl">Close</Button>
          </div>
        ) : (
          <>
            {/* Left Column: Custom Player */}
            <div className="w-full md:w-[65%] bg-black flex items-center justify-center relative border-b md:border-b-0 md:border-r border-white/5 h-[40%] md:h-full">
              <div className="w-full p-4 md:p-8 flex justify-center">
                <VideoPlayer 
                  embedUrl={video.embedUrl || `https://www.eporner.com/embed/${video.id}/`} 
                  title={video.title} 
                  thumbnailUrl={video.thumbnail}
                />
              </div>
            </div>

            {/* Right Column: Metadata & Details & Related */}
            <div className="w-full md:w-[35%] flex flex-col h-[60%] md:h-full overflow-y-auto bg-card">
              <div className="p-6 space-y-6">
                
                {/* Title */}
                <div>
                  <h2 className="text-lg md:text-xl font-extrabold text-white leading-tight tracking-tight mb-2 pr-8" title={video.title}>
                    {video.title}
                  </h2>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground font-mono mt-3">
                    <span className="flex items-center gap-1">⏱ {video.duration || "N/A"}</span>
                    <span className="flex items-center gap-1 text-yellow-500">★ {video.rating || "N/A"}</span>
                    <span className="flex items-center gap-1">👁 {video.views.toLocaleString("en-US")}</span>
                  </div>
                </div>

                {/* AI Description */}
                {video.aiDescription && (
                  <div className="p-3.5 bg-primary/5 border border-primary/10 rounded-xl">
                    <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">AI Summary</h4>
                    <p className="text-xs text-foreground/90 leading-relaxed">
                      {video.aiDescription}
                    </p>
                  </div>
                )}

                {/* Badges */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Categories & Tags</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {video.categories.map((c) => (
                      <Badge key={c.category.id} className="bg-primary/20 hover:bg-primary/30 border border-primary/20 text-primary text-[10px] px-1.5 py-0.5 rounded">
                        {c.category.name}
                      </Badge>
                    ))}
                    {video.tags.map((t) => (
                      <Badge key={t.tag.id} variant="secondary" className="bg-white/5 border-0 text-muted-foreground text-[10px] px-1.5 py-0.5 rounded font-mono">
                        #{t.tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-3 border-t border-white/5">
                  <Link href={`/watch/${video.id}`} className="block">
                    <Button variant="ghost" className="text-xs font-semibold rounded-xl border border-white/5 hover:bg-white/5 cursor-pointer">
                      Details
                    </Button>
                  </Link>
                </div>

                {/* Related Videos Mini Section */}
                <div className="pt-6 border-t border-white/5 space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Play className="h-3 w-3 text-primary fill-current shrink-0" />
                    Related Videos
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {related.map((item) => (
                      <div 
                        key={item.id}
                        onClick={() => loadData(item.id)}
                        className="group cursor-pointer space-y-1.5 text-left"
                      >
                        <div className="relative aspect-video rounded-lg overflow-hidden border border-white/5 bg-black">
                          {item.thumbnail ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                              src={item.thumbnail} 
                              alt={item.title} 
                              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[9px] text-muted-foreground">No Image</div>
                          )}
                          <span className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.2 text-[8px] text-white rounded font-semibold font-mono">
                            {item.duration || "N/A"}
                          </span>
                        </div>
                        <h5 className="text-[10px] font-medium line-clamp-2 text-foreground/80 group-hover:text-primary transition-colors leading-tight" title={item.title}>
                          {item.title}
                        </h5>
                      </div>
                    ))}

                    {related.length === 0 && (
                      <p className="col-span-2 text-[10px] text-muted-foreground italic text-center py-4">
                        No recommended videos.
                      </p>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
