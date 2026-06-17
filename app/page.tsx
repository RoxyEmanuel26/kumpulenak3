import { prisma } from "../lib/db/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function Home({ searchParams }: { searchParams: { q?: string, page?: string } }) {
  const query = searchParams.q || "";
  const page = parseInt(searchParams.page || "1");
  const limit = 24;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    status: "ACTIVE",
    ...(query ? { title: { contains: query, mode: "insensitive" } } : {}),
  };

  const videos = await prisma.video.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: (page - 1) * limit,
    include: { tags: { include: { tag: true } } },
  });

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Latest Videos</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {videos.map((video) => (
          <Link href={`/video/${video.id}`} key={video.id}>
            <Card className="overflow-hidden hover:shadow-lg transition-shadow bg-card/50 backdrop-blur-sm border-white/10 group cursor-pointer">
              <div className="relative aspect-video">
                {video.thumbnail ? (
                  // Using standard img for external arbitrary domains to prevent Next.js image config hassle,
                  // or if we use next/image we must configure next.config.ts
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={video.thumbnail} alt={video.title} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">No Image</div>
                )}
                <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 text-xs text-white rounded font-medium">
                  {video.duration || "N/A"}
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold line-clamp-2 text-sm mb-2" title={video.title}>{video.title}</h3>
                <div className="flex flex-wrap gap-1 mt-2">
                  {video.tags.slice(0, 3).map((t) => (
                    <Badge variant="secondary" key={t.tag.id} className="text-[10px] px-1 py-0 h-4">
                      {t.tag.name}
                    </Badge>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground mt-4 flex justify-between items-center">
                  <span className="flex items-center gap-1">👁 {video.views.toLocaleString()}</span>
                  <span className="flex items-center gap-1">⭐ {video.rating || "N/A"}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      
      {videos.length === 0 && (
        <div className="text-center text-muted-foreground py-12">
          No videos found. Sync might be running.
        </div>
      )}
    </main>
  );
}
