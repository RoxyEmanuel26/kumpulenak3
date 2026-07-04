import { neon } from "@neondatabase/serverless";
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
  let mappedVideos: EpornerVideo[] = [];

  try {
    const sql = neon(process.env.DATABASE_URL!);
    const videos = await sql`
      SELECT id, title, keywords, views, rate, "addedAt", "lengthSec", "lengthMin",
             "embedUrl", "defaultThumb", thumbs
      FROM "Video"
      WHERE status = 'ACTIVE'
      ORDER BY "addedAt" DESC
    `;

    mappedVideos = videos.map((v) => ({
      id: v.id as string,
      title: cleanEpornerText(v.title as string),
      keywords: cleanEpornerText((v.keywords as string) || ""),
      views: v.views as number,
      rate: (v.rate as string) || "",
      url: "",
      added: (v.addedAt as Date)?.toISOString() || "",
      length_sec: (v.lengthSec as number) || 0,
      length_min: (v.lengthMin as string) || "",
      embed: (v.embedUrl as string) || "",
      default_thumb: v.defaultThumb as unknown as EpornerVideo["default_thumb"],
      thumbs: v.thumbs as unknown as EpornerVideo["thumbs"],
    }));
  } catch (err) {
    console.error("[LibraryPage] Failed to fetch videos:", err);
  }

  return <LibraryClient allVideos={mappedVideos} />;
}
