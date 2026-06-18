import { MetadataRoute } from "next";
import { prisma } from "../lib/db/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    // Fetch all active videos
    const videos = await prisma.video.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, updatedAt: true },
    });

    const videoEntries = videos.map((v) => ({
      url: `${baseUrl}/video/${v.id}`,
      lastModified: v.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

    return [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: 1.0,
      },
      ...videoEntries,
    ];
  } catch (error) {
    console.error("[Sitemap] Failed to generate dynamic sitemap:", error);
    return [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: 1.0,
      },
    ];
  }
}
