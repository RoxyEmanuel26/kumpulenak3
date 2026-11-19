/**
 * lib/sitemap.ts
 *
 * Segmented sitemap logic for LustHub.
 * Features:
 *   - Segment 0: Static routes, legal pages, and Tier-1 category pages
 *   - Segments 1..N: Full Google Video Sitemap specification with <video:video> tags
 *     including thumbnail, title, description, player_loc, duration, publication_date,
 *     and family_friendly=no.
 */

import { sql } from "./db";
import { TIER1_CATEGORIES } from "./category-config";
import { buildWatchUrl } from "./video/slug";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.lusthub.web.id";
const CHUNK_SIZE = 5_000;

// In-memory resilience cache to protect /sitemap.xml and /sitemap/[id].xml from
// transient Neon Serverless scale-to-zero cold-start hiccups.
let lastKnownVideoCount = 0;
let lastKnownLatestMod: string | undefined;
const lastGoodSegmentXml = new Map<number, string>();
const MAX_CACHED_SEGMENTS = 5;

async function queryWithRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  delayMs = 600
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

export interface SitemapSegmentRef {
  id: number;
  lastModified?: string;
}

export async function generateSitemapsWithMeta(): Promise<{
  sitemaps: SitemapSegmentRef[];
  degraded: boolean;
}> {
  const nowIso = new Date().toISOString();
  let videoCount = 0;
  let latestModIso: string | undefined;
  let degraded = false;

  try {
    // Include all active non-spam videos so /sitemap/1.xml never 404s when
    // enriched and synced Video IDs have limited overlap; enriched videos are
    // ordered first inside buildVideoSegment().
    const [row] = await queryWithRetry(
      () => sql`
        SELECT
          COUNT(*) as count,
          MAX(COALESCE("updatedAt", "addedAt")) as "latestMod"
        FROM "Video"
        WHERE status = 'ACTIVE' AND "aiSpamFlag" = false AND "aiScoreSpam" < 65
      `
    );
    videoCount = parseInt(row.count as string, 10) || 0;
    if (row.latestMod) {
      const parsed = new Date(row.latestMod as string | Date);
      if (!isNaN(parsed.getTime())) {
        latestModIso = parsed.toISOString();
      }
    }
    if (videoCount > 0) {
      lastKnownVideoCount = videoCount;
      lastKnownLatestMod = latestModIso ?? nowIso;
    }
  } catch (err) {
    console.error("[Sitemap] Failed to count videos for segment generation:", err);
    degraded = true;
    // If we have a previously verified video count in memory, preserve the video
    // segments so /sitemap/1.xml never vanishes from /sitemap.xml during a DB blip.
    if (lastKnownVideoCount > 0) {
      videoCount = lastKnownVideoCount;
      latestModIso = lastKnownLatestMod ?? nowIso;
    } else {
      return {
        sitemaps: [{ id: 0, lastModified: nowIso }],
        degraded: true,
      };
    }
  }

  // No eligible videos yet (e.g. fresh DB): only expose the static/category segment,
  // marked degraded so CDN does not cache a 1-segment index for hours.
  if (videoCount === 0) {
    return {
      sitemaps: [{ id: 0, lastModified: nowIso }],
      degraded: true,
    };
  }

  const videoChunks = Math.ceil(videoCount / CHUNK_SIZE);
  const sitemaps: SitemapSegmentRef[] = [
    { id: 0, lastModified: nowIso }, // Static routes + categories
    ...Array.from({ length: videoChunks }, (_, i) => ({
      id: i + 1,
      lastModified: latestModIso ?? nowIso,
    })),
  ];

  return { sitemaps, degraded };
}

export async function generateSitemaps(): Promise<SitemapSegmentRef[]> {
  const { sitemaps } = await generateSitemapsWithMeta();
  return sitemaps;
}

export interface SitemapItem {
  url: string;
  lastModified?: Date | string;
  changeFrequency?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
}

export interface VideoSitemapItem extends SitemapItem {
  video: {
    thumbnailLoc: string;
    title: string;
    description: string;
    playerLoc: string;
    duration?: number;
    publicationDate?: string;
    familyFriendly: "yes" | "no";
  };
}

function escapeXml(unsafe: string | null | undefined): string {
  if (!unsafe) return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildVideoDescription(title: string, keywords: string | null | undefined): string {
  const kws = keywords
    ? keywords.split(",").slice(0, 5).map((k) => k.trim()).filter(Boolean)
    : [];
  if (kws.length > 0) {
    return `Watch "${title}" on LustHub — featuring ${kws.join(", ")}. Free HD streaming, no registration required.`;
  }
  return `Watch "${title}" in HD quality for free on LustHub. No registration required.`;
}

function resolveThumbUrl(id: string, defaultThumb?: unknown, thumbs?: unknown): string {
  const dt = defaultThumb as { src?: string } | null;
  if (dt && typeof dt === "object" && typeof dt.src === "string") {
    return dt.src;
  }
  const th = thumbs as Array<{ src?: string }> | null;
  if (Array.isArray(th) && th[0]?.src) {
    return th[0].src;
  }
  return `${BASE_URL}/logo.webp`;
}

function buildStaticSegment(): SitemapItem[] {
  const now = new Date();
  const staticLastMod = new Date("2026-08-20T00:00:00.000Z"); // Actual policy update date

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
      lastModified: staticLastMod,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: staticLastMod,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: staticLastMod,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/dmca`,
      lastModified: staticLastMod,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/compliance`,
      lastModified: staticLastMod,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: staticLastMod,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];
}

async function buildVideoSegmentWithMeta(chunkIndex: number): Promise<{
  items: VideoSitemapItem[];
  dbFailed: boolean;
}> {
  try {
    const videos = await queryWithRetry(
      () => sql`
        SELECT
          v.id, v.title, v."updatedAt", v."addedAt", v."lengthSec",
          v."embedUrl", v."defaultThumb", v.thumbs,
          COALESCE(se."metaDescription", se.summary, v."aiDescription") AS "aiDescription",
          v.keywords
        FROM "Video" v
        LEFT JOIN "SeoEnrichment" se
          ON se."videoId" = v.id AND se.status = 'enriched'
        WHERE v.status = 'ACTIVE' AND v."aiSpamFlag" = false AND v."aiScoreSpam" < 65
        ORDER BY (se."videoId" IS NOT NULL) DESC, v."addedAt" DESC NULLS LAST
        LIMIT ${CHUNK_SIZE} OFFSET ${chunkIndex * CHUNK_SIZE}
      `
    );

    const items: VideoSitemapItem[] = videos.map((v) => {
      const id = v.id as string;
      const title = (v.title as string) || "Adult Video";
      const lastMod = (v.updatedAt || v.addedAt || new Date()) as Date;
      const thumbUrl = resolveThumbUrl(id, v.defaultThumb, v.thumbs);
      const rawDesc = (v.aiDescription as string) || buildVideoDescription(title, v.keywords as string);
      const playerUrl = (v.embedUrl as string || `https://www.eporner.com/embed/${id}`).replace(/\/+$/, "");
      const duration = v.lengthSec && Number(v.lengthSec) > 0 ? Number(v.lengthSec) : undefined;
      const pubDate = v.addedAt ? new Date(v.addedAt as Date).toISOString() : undefined;

      return {
        url: `${BASE_URL}${buildWatchUrl(id, title)}`,
        lastModified: lastMod,
        changeFrequency: "weekly",
        priority: 0.8,
        video: {
          thumbnailLoc: thumbUrl,
          title: title.slice(0, 100),
          description: rawDesc.slice(0, 2048),
          playerLoc: playerUrl,
          duration,
          publicationDate: pubDate,
          familyFriendly: "no",
        },
      };
    });

    return { items, dbFailed: false };
  } catch (err) {
    console.error(`[Sitemap] Failed to generate video chunk ${chunkIndex}:`, err);
    return { items: [], dbFailed: true };
  }
}

async function buildVideoSegment(chunkIndex: number): Promise<VideoSitemapItem[]> {
  const { items } = await buildVideoSegmentWithMeta(chunkIndex);
  return items;
}

/**
 * Builds the complete, validated XML string for a given sitemap segment,
 * returning whether the response used an in-memory fallback (`degraded: true`).
 */
export async function buildSitemapXmlWithMeta(segmentId: number): Promise<{
  xml: string | null;
  degraded: boolean;
}> {
  if (segmentId === 0) {
    const items = buildStaticSegment();
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items.map((item) => `  <url>
    <loc>${item.url}</loc>
    ${item.lastModified ? `<lastmod>${new Date(item.lastModified).toISOString()}</lastmod>` : ""}
    ${item.changeFrequency ? `<changefreq>${item.changeFrequency}</changefreq>` : ""}
    ${item.priority !== undefined ? `<priority>${item.priority.toFixed(2)}</priority>` : ""}
  </url>`).join("\n")}
</urlset>`.trim();
    return { xml, degraded: false };
  }

  const { items, dbFailed } = await buildVideoSegmentWithMeta(segmentId - 1);
  if (items.length === 0) {
    if (dbFailed && lastGoodSegmentXml.has(segmentId)) {
      return {
        xml: lastGoodSegmentXml.get(segmentId)!,
        degraded: true,
      };
    }
    return { xml: null, degraded: dbFailed };
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${items.map((item) => `  <url>
    <loc>${item.url}</loc>
    ${item.lastModified ? `<lastmod>${new Date(item.lastModified).toISOString()}</lastmod>` : ""}
    ${item.changeFrequency ? `<changefreq>${item.changeFrequency}</changefreq>` : ""}
    ${item.priority !== undefined ? `<priority>${item.priority.toFixed(2)}</priority>` : ""}
    <video:video>
      <video:thumbnail_loc>${escapeXml(item.video.thumbnailLoc)}</video:thumbnail_loc>
      <video:title>${escapeXml(item.video.title)}</video:title>
      <video:description>${escapeXml(item.video.description)}</video:description>
      <video:player_loc allow_embed="yes">${escapeXml(item.video.playerLoc)}</video:player_loc>
      ${item.video.duration ? `<video:duration>${item.video.duration}</video:duration>` : ""}
      ${item.video.publicationDate ? `<video:publication_date>${item.video.publicationDate}</video:publication_date>` : ""}
      <video:family_friendly>${item.video.familyFriendly}</video:family_friendly>
    </video:video>
  </url>`).join("\n")}
</urlset>`.trim();

  if (lastGoodSegmentXml.size >= MAX_CACHED_SEGMENTS && !lastGoodSegmentXml.has(segmentId)) {
    const firstKey = lastGoodSegmentXml.keys().next().value;
    if (firstKey !== undefined) lastGoodSegmentXml.delete(firstKey);
  }
  lastGoodSegmentXml.set(segmentId, xml);

  return { xml, degraded: false };
}

/**
 * Builds the complete, validated XML string for a given sitemap segment.
 * If segmentId === 0: standard urlset for static & category routes.
 * If segmentId > 0: Google Video Sitemap with <video:video> schema tags.
 */
export async function buildSitemapXml(segmentId: number): Promise<string | null> {
  const { xml } = await buildSitemapXmlWithMeta(segmentId);
  return xml;
}

/** Legacy array export kept for backward compatibility */
export async function buildSitemapSegment(segmentId: number): Promise<SitemapItem[]> {
  if (segmentId === 0) {
    return buildStaticSegment();
  }
  const videoItems = await buildVideoSegment(segmentId - 1);
  return videoItems.map(({ url, lastModified, changeFrequency, priority }) => ({
    url,
    lastModified,
    changeFrequency,
    priority,
  }));
}
