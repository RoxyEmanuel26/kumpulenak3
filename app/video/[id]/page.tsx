import { prisma } from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Metadata } from "next";
import Link from "next/link";
import { Play } from "lucide-react";
import { VideoPlayer } from "@/components/video/VideoPlayer";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const video = await prisma.video.findUnique({ 
    where: { id: resolvedParams.id },
    include: { tags: { include: { tag: true } } }
  });
  if (!video) return { title: "Not Found" };
  
  const description = video.aiDescription || `Tonton video ${video.title} secara gratis dengan kualitas tinggi.`;
  const tags = video.tags.map((t) => t.tag.name).join(", ");
  
  return {
    title: `${video.title} - KumpulEnak`,
    description,
    keywords: tags,
    openGraph: {
      title: video.title,
      description,
      images: video.thumbnail ? [{ url: video.thumbnail }] : [],
      type: "video.other",
    },
    twitter: {
      card: "summary_large_image",
      title: video.title,
      description,
      images: video.thumbnail ? [video.thumbnail] : [],
    }
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

  // Get tag & category IDs of this video for related recommendation logic
  const tagIds = video.tags.map((t) => t.tagId);
  const categoryIds = video.categories.map((c) => c.categoryId);

  // Fetch up to 8 active related videos matching categories or tags
  const relatedVideos = await prisma.video.findMany({
    where: {
      status: "ACTIVE",
      id: { not: video.id },
      OR: [
        { categories: { some: { categoryId: { in: categoryIds } } } },
        { tags: { some: { tagId: { in: tagIds } } } },
      ],
    },
    take: 8,
    orderBy: { views: "desc" },
    include: { tags: { include: { tag: true } } },
  });

  return (
    <main className="container mx-auto px-4 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <VideoPlayer 
            embedUrl={embedSrc} 
            title={video.title} 
            thumbnailUrl={video.thumbnail}
          />
        </div>

        <h1 className="text-2xl md:text-3xl font-extrabold mb-4 leading-tight text-white">{video.title}</h1>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm text-muted-foreground mb-8 bg-card/40 backdrop-blur-md p-4 rounded-xl border border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">⏱ Durasi:</span>
            <span className="text-foreground font-semibold">{video.duration || "N/A"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">⭐ Rating:</span>
            <span className="text-yellow-500 font-semibold">★ {video.rating || "N/A"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">👁 Ditonton:</span>
            <span className="text-foreground font-semibold">{video.views.toLocaleString()} kali</span>
          </div>
        </div>

        {video.aiDescription && (
          <div className="mb-8 p-4 bg-primary/5 border border-primary/15 rounded-xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-1.5">Deskripsi AI</h3>
            <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-sans">
              {video.aiDescription}
            </p>
          </div>
        )}

        <div className="mb-8">
          <h3 className="text-xs font-bold mb-3 text-muted-foreground uppercase tracking-wider">Kategori & Tag</h3>
          <div className="flex flex-wrap gap-2">
            {video.categories.map((c) => (
              <Badge key={c.category.id} variant="default" className="bg-primary/20 hover:bg-primary/30 border border-primary/20 text-primary cursor-pointer text-xs font-medium px-2 py-0.5 rounded-lg transition-colors">
                {c.category.name}
              </Badge>
            ))}
            {video.tags.map((t) => (
              <Badge key={t.tag.id} variant="secondary" className="bg-white/5 hover:bg-white/10 border-0 text-muted-foreground cursor-pointer text-xs px-2 py-0.5 rounded-lg transition-colors font-mono">
                #{t.tag.name}
              </Badge>
            ))}
            {video.tags.length === 0 && video.categories.length === 0 && (
              <span className="text-xs text-muted-foreground italic">Tidak ada tag atau kategori tersedia</span>
            )}
          </div>
        </div>

        <div className="pt-6 border-t border-white/5 flex gap-4">
           <Button variant="default" className="text-xs font-semibold px-4 py-2 bg-primary hover:bg-primary/90 rounded-xl cursor-pointer">Bagikan Video</Button>
           <Button variant="outline" className="text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer">Simpan Bookmark</Button>
        </div>

        {/* Related Videos Recommendations */}
        <div className="mt-20 pt-12 border-t border-white/5">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-8 text-white flex items-center gap-2">
            <Play className="h-5 w-5 text-primary fill-current shrink-0" />
            Rekomendasi Video Terkait
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {relatedVideos.map((related) => (
              <Link href={`/video/${related.id}`} key={related.id} className="group">
                <Card className="overflow-hidden bg-card/20 hover:bg-card/45 border-white/5 group-hover:border-primary/10 transition-all duration-300 cursor-pointer h-full flex flex-col justify-between">
                  <div className="relative aspect-video overflow-hidden">
                    {related.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={related.thumbnail} 
                        alt={related.title} 
                        loading="lazy"
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center text-xs">No Image</div>
                    )}
                    <div className="absolute bottom-1.5 right-1.5 bg-black/85 px-1.5 py-0.5 text-[9px] text-white rounded font-semibold font-mono">
                      {related.duration || "N/A"}
                    </div>
                  </div>
                  <CardContent className="p-3.5 flex-1 flex flex-col justify-between">
                    <h4 className="font-semibold line-clamp-2 text-xs text-foreground/90 group-hover:text-primary transition-colors mb-2" title={related.title}>
                      {related.title}
                    </h4>
                    <div className="text-[10px] text-muted-foreground flex justify-between items-center font-mono mt-2 pt-2 border-t border-white/5">
                      <span>👁 {related.views.toLocaleString()}</span>
                      <span className="text-yellow-500">★ {related.rating || "N/A"}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
            
            {relatedVideos.length === 0 && (
              <div className="col-span-full text-center py-12 text-xs text-muted-foreground italic">
                Belum ada rekomendasi video terkait untuk kategori atau tag ini.
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
