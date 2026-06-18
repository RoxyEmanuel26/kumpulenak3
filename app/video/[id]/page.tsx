import { prisma } from "../../../lib/db/prisma";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const video = await prisma.video.findUnique({ where: { id: resolvedParams.id } });
  if (!video) return { title: "Not Found" };
  return {
    title: `${video.title} - Eporner Aggregator`,
    description: `Watch ${video.title}`,
  };
}

export default async function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const video = await prisma.video.findUnique({
    where: { id: resolvedParams.id },
    include: { tags: { include: { tag: true } }, categories: { include: { category: true } } },
  });


  if (!video || video.status !== "ACTIVE") {
    return notFound();
  }

  const embedSrc = video.embedUrl || `https://www.eporner.com/embed/${video.id}/`;

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-2xl mb-6 border border-white/10">
          <iframe 
            src={embedSrc} 
            className="w-full h-full" 
            allowFullScreen 
            frameBorder="0"
          ></iframe>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold mb-4 leading-tight">{video.title}</h1>
        
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6 bg-card p-4 rounded-lg border border-white/5">
          <div className="flex items-center gap-1">
            <span>⏱ Duration:</span>
            <span className="text-foreground font-medium">{video.duration || "N/A"}</span>
          </div>
          <div className="flex items-center gap-1">
            <span>⭐ Rating:</span>
            <span className="text-foreground font-medium">{video.rating || "N/A"}</span>
          </div>
          <div className="flex items-center gap-1">
            <span>👁 Views:</span>
            <span className="text-foreground font-medium">{video.views.toLocaleString()}</span>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {video.tags.map((t: any) => (
              <Badge key={t.tag.id} variant="secondary" className="hover:bg-primary/20 cursor-pointer transition-colors">
                {t.tag.name}
              </Badge>
            ))}
            {video.tags.length === 0 && <span className="text-sm text-muted-foreground">No tags available</span>}
          </div>
        </div>

        <div className="pt-6 border-t border-white/10 flex gap-4">
           <Button variant="default">Share Video</Button>
           <Button variant="outline">Save to Bookmark</Button>
        </div>
      </div>
    </main>
  );
}
