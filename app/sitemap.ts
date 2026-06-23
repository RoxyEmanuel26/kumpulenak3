/**
 * app/sitemap.ts
 *
 * Segmented sitemap architecture for LustHub.
 *
 * WHY SEGMENTED:
 * Google hard limit = 50,000 URLs per sitemap file.
 * A flat sitemap grows unboundedly with the video library.
 * generateSitemaps() chunks the output so no single file ever
 * approaches the 50K limit — scalable to 200K+ videos.
 *
 * SEGMENT LAYOUT:
 *   id=0  → static pages + all 15 Tier-1 category pages
 *   id=1+ → video chunks of CHUNK_SIZE videos each
 *
 * REVALIDATION:
 * ISR revalidation every hour ensures new videos synced overnight
 * appear in the sitemap without a redeploy.
 *
 * QUALITY FILTER:
 * Only quality-passing videos are submitted to Google.
 * Excludes AI-detected spam and high-spam-score videos.
 * This improves the crawl-quality signal sent to Google.
 */

import { MetadataRoute } from "next";
import { prisma } from "../lib/db/prisma";
import { TIER1_CATEGORIES } from "../lib/category-config";
import { buildWatchUrl } from "../lib/video/slug";

// Regenerate sitemap every hour so new synced videos appear quickly.
// ISR-safe: works on Vercel and self-hosted Next.js.
export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://lusthub.web.id";

// Number of video URLs per sitemap chunk.
// 5,000 is well below Google's 50,000 limit, giving a 10× safety margin.
const CHUNK_SIZE = 5_000;

// Minimum quality gate for sitemap inclusion.
// Videos that fail this filter are excluded from sitemaps —
// they can still be indexed if crawled directly (via internal links),
// but we don't actively submit them.
const QUALITY_FILTER = {
  status: "ACTIVE" as const,
  aiSpamFlag: false,
  // Exclude videos with very high spam probability (>60 out of 100)
  aiScoreSpam: { lt: 60 },
} as const;

// ─── Sitemap Index ──────────────────────────────────────────────────────────
// Next.js calls generateSitemaps() to discover how many segments to create.
// It then calls the default export once per id, serving each at /sitemap/{id}.
// /sitemap.xml becomes an index referencing all segments automatically.

export async function generateSitemaps() {
  let videoCount = 0;
  try {
    videoCount = await prisma.video.count({ where: QUALITY_FILTER });
  } catch (err) {
    console.error("[Sitemap] Failed to count videos for segment generation:", err);
    // Fall back to 1 video segment (id=1) + the static segment (id=0)
    return [{ id: 0 }, { id: 1 }];
  }

  const videoChunks = Math.max(1, Math.ceil(videoCount / CHUNK_SIZE));
  const ids = [
    { id: 0 }, // Static routes + categories
    ...Array.from({ length: videoChunks }, (_, i) => ({ id: i + 1 })),
  ];

  console.log(
    `[Sitemap] Generating ${ids.length} segments for ${videoCount} quality videos ` +
    `(${videoChunks} video chunk(s) × ${CHUNK_SIZE} max each)`
  );

  return ids;
}

// ─── Segment Generator ───────────────────────────────────────────────────────

export default async function sitemap({
  id,
}: {
  id?: number | string;
}): Promise<MetadataRoute.Sitemap> {
  const segmentId = Number(id) || 0;
  
  // segmentId=0: static pages + all Tier-1 category pages
  if (segmentId === 0) {
    return buildStaticSegment();
  }

  // segmentId=1+: video chunks (segmentId=1 → chunk index 0, etc.)
  return buildVideoSegment(segmentId - 1);
}

// ─── Segment: Static + Categories ───────────────────────────────────────────

function buildStaticSegment(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
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
    // All 15 Tier-1 category landing pages — high priority, change daily
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

  return staticRoutes;
}

// ─── Segment: Video Chunk ────────────────────────────────────────────────────

async function buildVideoSegment(chunkIndex: number): Promise<MetadataRoute.Sitemap> {
  try {
    const videos = await prisma.video.findMany({
      where: QUALITY_FILTER,
      select: {
        id: true,
        title: true,
        updatedAt: true,
      },
      orderBy: { addedAt: "desc" },
      skip: chunkIndex * CHUNK_SIZE,
      take: CHUNK_SIZE,
    });

    if (videos.length === 0) {
      console.warn(`[Sitemap] Chunk ${chunkIndex} returned 0 videos — may be out of range.`);
      return [];
    }

    return videos.map((v) => ({
      // Use SEO-friendly slug URL: /watch/{title-slug}-{id}
      url: `${BASE_URL}${buildWatchUrl(v.id, v.title)}`,
      // Use the DB updatedAt for accurate lastModified — not new Date()
      lastModified: v.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch (err) {
    console.error(`[Sitemap] Failed to generate video chunk ${chunkIndex}:`, err);
    return [];
  }
}
