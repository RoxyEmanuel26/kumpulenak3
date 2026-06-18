"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Star, Eye } from "lucide-react";

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

interface VideoCardProps {
  video: Video;
  onClick: () => void;
}

export function VideoCard({ video, onClick }: VideoCardProps) {
  return (
    <div 
      onClick={onClick}
      className="group cursor-pointer relative h-full flex flex-col justify-between transition-all duration-300 transform hover:scale-[1.03] z-10 hover:z-20"
    >
      <Card className="overflow-hidden bg-card/30 hover:bg-card/50 backdrop-blur-sm border-white/5 group-hover:border-primary/20 transition-all duration-300 h-full flex flex-col justify-between shadow-lg hover:shadow-premium">
        
        {/* Thumbnail Section */}
        <div className="relative aspect-video overflow-hidden bg-black">
          {video.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={video.thumbnail} 
              alt={video.title} 
              loading="lazy"
              className="object-cover w-full h-full transition-transform duration-500 ease-out group-hover:scale-105" 
            />
          ) : (
            <div className="w-full h-full bg-muted/20 flex items-center justify-center text-xs text-muted-foreground">No Image</div>
          )}

          {/* Duration Badge */}
          <div className="absolute bottom-2 right-2 bg-black/85 px-1.5 py-0.5 text-[9px] text-white rounded font-mono font-semibold tracking-wider border border-white/5">
            {video.duration || "N/A"}
          </div>

          {/* Hover Play Button Overlay */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
            <div className="bg-primary text-white p-3 rounded-full shadow-lg scale-90 group-hover:scale-100 transition-all duration-300 hover:scale-110">
              <Play className="h-5 w-5 fill-current ml-0.5" />
            </div>
          </div>
        </div>

        {/* Info Content Section */}
        <CardContent className="p-4 flex-1 flex flex-col justify-between">
          <div>
            <h3 className="font-heading font-bold line-clamp-2 text-sm text-foreground/95 group-hover:text-primary transition-colors leading-snug mb-2" title={video.title}>
              {video.title}
            </h3>
            
            {/* Tag Badges */}
            <div className="flex flex-wrap gap-1 mt-2.5">
              {video.tags.slice(0, 3).map((t) => (
                <Badge 
                  variant="secondary" 
                  key={t.tag.id} 
                  className="text-[9px] px-1.5 py-0 h-4 bg-white/5 border-0 text-muted-foreground font-mono"
                >
                  {t.tag.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Bottom Metadata stats */}
          <div className="text-[10px] text-muted-foreground mt-4 pt-3 border-t border-white/5 flex justify-between items-center font-mono">
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5 opacity-60" /> 
              {video.views.toLocaleString()}
            </span>
            <span className="flex items-center gap-0.5 text-yellow-500">
              <Star className="h-3.5 w-3.5 fill-current" /> 
              {video.rating || "N/A"}
            </span>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
