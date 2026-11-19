import { sql } from "@/lib/db";
import { LibraryClient } from "@/components/video/LibraryClient";
import { Metadata } from "next";
import { EpornerVideo } from "@/types/eporner";
import { mapDbVideoToEporner } from "@/lib/api/eporner";

export const metadata: Metadata = {
  title: "Library",
  description: "Your personal video library on LustHub — browse your watch history and liked videos.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function LibraryPage() {
  let mappedVideos: EpornerVideo[] = [];

  try {
    const videos = await sql`
      SELECT id, title, keywords, views, rate, "addedAt", "lengthSec", "lengthMin",
             "embedUrl", "defaultThumb", thumbs
      FROM "Video"
      WHERE status = 'ACTIVE'
      ORDER BY "addedAt" DESC
    `;

    mappedVideos = videos.map((v) => mapDbVideoToEporner(v as Record<string, unknown>));
  } catch (err: any) {
    if (err?.code !== "42P01") {
      console.error("[LibraryPage] Failed to fetch videos:", err);
    }
  }

  return <LibraryClient allVideos={mappedVideos} />;
}
