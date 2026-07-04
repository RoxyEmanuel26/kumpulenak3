import { prisma } from "@/lib/db/prisma";
import { LibraryClient } from "@/components/video/LibraryClient";
import { Metadata } from "next";
import { EpornerVideo } from "@/types/eporner";
import { cleanEpornerText } from "@/lib/api/eporner";

export const runtime = "edge";


export const metadata: Metadata = {
  title: "Library",
  description: "Your personal video library on LustHub — browse your watch history and liked videos.",
  // Belt-and-suspenders: robots.txt already disallows /library.
  // noindex ensures this user-specific page is excluded from indexing
  // even if a bot ignores robots.txt or if the disallow rule ever changes.
  robots: {
    index: false,
    follow: false,
  },
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
    default_thumb: v.defaultThumb as unknown as EpornerVideo["default_thumb"],
    thumbs: v.thumbs as unknown as EpornerVideo["thumbs"],
  }));

  return <LibraryClient allVideos={mappedVideos} />;
}
