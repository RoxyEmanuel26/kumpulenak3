import { notFound } from "next/navigation";
import { WatchPageClient } from "@/components/video/WatchPageClient";
import { Metadata } from "next";
import { EpornerAPI } from "@/lib/api/eporner";
import { syncVideoToDatabase } from "@/lib/video/sync";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ v?: string }>;
}): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const videoId = resolvedSearchParams.v;
  if (!videoId) return { title: "Watch Video - KumpulEnak" };

  const video = await EpornerAPI.getById(videoId);
  if (!video) return { title: "Video Not Found - KumpulEnak" };

  return {
    title: `${video.title} - KumpulEnak`,
    description: `Watch premium video ${video.title} in high quality for free.`,
  };
}

export default async function WatchPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const videoId = resolvedSearchParams.v;
  if (!videoId) return notFound();

  const video = await EpornerAPI.getById(videoId);
  if (!video) return notFound();

  // HYBRID SYNC: trigger background sync without blocking the UI
  syncVideoToDatabase(video.id).catch((err) => {
    console.error(`[WatchPage] Error in background sync:`, err.message);
  });

  // Fetch related videos directly from API using the first keyword
  const keywords = video.keywords ? video.keywords.split(",") : [];
  const query = keywords.length > 0 ? keywords[0].trim() : "hd";
  const relatedRes = await EpornerAPI.search({ query, per_page: 12 });
  const related = relatedRes?.videos?.filter(v => v.id !== video.id) || [];

  return <WatchPageClient video={video} relatedVideos={related} />;
}
