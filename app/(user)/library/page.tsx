import { prisma } from "@/lib/db/prisma";
import { LibraryClient } from "@/components/video/LibraryClient";
import { Metadata } from "next";
import { EpornerVideo } from "@/types/eporner";
import { cleanEpornerText } from "@/lib/api/eporner";


export const metadata: Metadata = {
  title: "Library - KumpulEnak",
  description: "Manage your watch history and liked videos.",
};

export default async function LibraryPage() {
  const videos = await prisma.video.findMany({
    where: { status: "ACTIVE" },
  });

  // Map to EpornerVideo shape
  const mappedVideos: EpornerVideo[] = videos.map((v) => ({
    id: v.id,
    title: cleanEpornerText(v.title),
    keywords: cleanEpornerText(v.keywords || ""),
    views: v.views,
    rate: v.rate || "",
    url: "",
    added: v.addedAt?.toISOString() || "",
    length_sec: v.lengthSec || 0,
    length_min: v.lengthMin || "",
    embed: v.embedUrl || "",
    default_thumb: v.defaultThumb as any,
    thumbs: v.thumbs as any,
  }));

  return <LibraryClient allVideos={mappedVideos} />;
}
