/**
 * lib/sitemap.ts
 *
 * Segmented sitemap logic for LustHub.
 * Migrated to a library file to bypass Next.js segmented sitemap Edge runtime bugs.
 */

import { neon } from "@neondatabase/serverless";
import { TIER1_CATEGORIES } from "./category-config";
import { buildWatchUrl } from "./video/slug";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://lusthub.web.id";
const CHUNK_SIZE = 5_000;

export async function generateSitemaps() {
  let videoCount = 0;
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const [row] = await sql`
      SELECT COUNT(*) as count FROM "Video"
      WHERE status = 'ACTIVE' AND "aiSpamFlag" = false AND "aiScoreSpam" < 65
    `;
    videoCount = parseInt(row.count as string, 10) || 0;
  } catch (err) {
    console.error("[Sitemap] Failed to count videos for segment generation:", err);
    return [{ id: 0 }, { id: 1 }];
  }

  const videoChunks = Math.max(1, Math.ceil(videoCount / CHUNK_SIZE));
  const ids = [
    { id: 0 }, // Static routes + categories
    ...Array.from({ length: videoChunks }, (_, i) => ({ id: i + 1 })),
  ];

  return ids;
}

export interface SitemapItem {
  url: string;
  lastModified?: Date | string;
  changeFrequency?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
}

export async function buildSitemapSegment(segmentId: number): Promise<SitemapItem[]> {
  if (segmentId === 0) {
    return buildStaticSegment();
  }
  return buildVideoSegment(segmentId - 1);
}

function buildStaticSegment(): SitemapItem[] {
  const now = new Date();

  return [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/categories`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...TIER1_CATEGORIES.map((cat) => ({
      url: `${BASE_URL}/category/${cat.slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.85,
    })),
    {
      url: `${BASE_URL}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/dmca`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/compliance`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
}

async function buildVideoSegment(chunkIndex: number): Promise<SitemapItem[]> {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const videos = await sql`
      SELECT id, title, "updatedAt" FROM "Video"
      WHERE status = 'ACTIVE' AND "aiSpamFlag" = false AND "aiScoreSpam" < 65
      ORDER BY "addedAt" DESC
      LIMIT ${CHUNK_SIZE} OFFSET ${chunkIndex * CHUNK_SIZE}
    `;

    return videos.map((v) => ({
      url: `${BASE_URL}${buildWatchUrl(v.id as string, v.title as string)}`,
      lastModified: v.updatedAt as Date,
      changeFrequency: "weekly",
      priority: 0.6,
    }));
  } catch (err) {
    console.error(`[Sitemap] Failed to generate video chunk ${chunkIndex}:`, err);
    return [];
  }
}
