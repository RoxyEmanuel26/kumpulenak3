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
import { toProxiedThumbUrl } from "./video/thumb-url";
import { parseJsonObject, isCompetitorFallbackDesc } from "./api/eporner";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.lusthub.web.id";
// Split video sitemaps into ~1,000-URL segments (~750 KB each) so generation
// stays <150ms and never stalls Node event loop or triggers Cloudflare HTTP 522.
const CHUNK_SIZE = 1_000;
const SITEMAP_INDEX_TTL_MS = 15 * 60 * 1000;   // 15 minutes RAM cache for index
const SITEMAP_SEGMENT_TTL_MS = 60 * 60 * 1000; // 1 hour RAM cache for video segment XML
const MAX_CACHED_SEGMENTS = 20;

const globalForSitemap = globalThis as unknown as {
  sitemapIndexCache?: { sitemaps: SitemapSegmentRef[]; expiresAt: number } | null;
  sitemapLastKnownVideoCount?: number;
  sitemapLastKnownLatestMod?: string;
  sitemapSegmentFresh?: Map<number, { xml: string; expiresAt: number }>;
  sitemapLastGoodSegmentXml?: Map<number, string>;
  sitemapIndexInFlight?: Promise<{ sitemaps: SitemapSegmentRef[]; degraded: boolean }> | null;
};

const segmentFreshCache =
  globalForSitemap.sitemapSegmentFresh ?? new Map<number, { xml: string; expiresAt: number }>();
globalForSitemap.sitemapSegmentFresh = segmentFreshCache;

const lastGoodSegmentXml =
  globalForSitemap.sitemapLastGoodSegmentXml ?? new Map<number, string>();
globalForSitemap.sitemapLastGoodSegmentXml = lastGoodSegmentXml;

/** Invalidates fresh sitemap RAM caches when videos are added or marked REMOVED */
export function invalidateSitemapCache(): void {
  globalForSitemap.sitemapIndexCache = null;
  segmentFreshCache.clear();
}

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
  const now = Date.now();
  const cachedIndex = globalForSitemap.sitemapIndexCache;
  if (cachedIndex && now < cachedIndex.expiresAt) {
    return { sitemaps: cachedIndex.sitemaps, degraded: false };
  }

  if (globalForSitemap.sitemapIndexInFlight) {
    return globalForSitemap.sitemapIndexInFlight;
  }

  const work = (async (): Promise<{ sitemaps: SitemapSegmentRef[]; degraded: boolean }> => {
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
          WHERE status = 'ACTIVE'
            AND "aiSpamFlag" = false
            AND "aiScoreSpam" < 65
            AND LENGTH(TRIM(title)) >= 12
            AND title !~* '(https?://|www\\.|\\.(com|net|org|xyz|tv|cc|io|ru|me|site|online))'
            AND LOWER(TRIM(title)) NOT IN ('3xxx', 'p4wgp0v', 'xxxraw', 'chatu video', 'webcam show', 'hd video')
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
        globalForSitemap.sitemapLastKnownVideoCount = videoCount;
        globalForSitemap.sitemapLastKnownLatestMod = latestModIso ?? nowIso;
      }
    } catch (err) {
      console.error("[Sitemap] Failed to count videos for segment generation:", err);
      degraded = true;
      // Preserve last verified video count in memory so /sitemap/1.xml never vanishes during a DB blip.
      if ((globalForSitemap.sitemapLastKnownVideoCount ?? 0) > 0) {
        videoCount = globalForSitemap.sitemapLastKnownVideoCount!;
        latestModIso = globalForSitemap.sitemapLastKnownLatestMod ?? nowIso;
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

    if (!degraded) {
      globalForSitemap.sitemapIndexCache = {
        sitemaps,
        expiresAt: Date.now() + SITEMAP_INDEX_TTL_MS,
      };
    }

    return { sitemaps, degraded };
  })().finally(() => {
    globalForSitemap.sitemapIndexInFlight = null;
  });

  globalForSitemap.sitemapIndexInFlight = work;
  return work;
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

function resolveThumbUrl(defaultThumb?: unknown, thumbs?: unknown): string {
  const dt = parseJsonObject<{ src?: string } | null>(defaultThumb, null);
  if (dt && typeof dt.src === "string" && dt.src.startsWith("http")) {
    return toProxiedThumbUrl(dt.src, BASE_URL) || `${BASE_URL}/logo.webp`;
  }
  const th = parseJsonObject<Array<{ src?: string }> | null>(thumbs, null);
  if (Array.isArray(th) && typeof th[0]?.src === "string" && th[0].src.startsWith("http")) {
    return toProxiedThumbUrl(th[0].src, BASE_URL) || `${BASE_URL}/logo.webp`;
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
          v."embedUrl",
          COALESCE(
            v."defaultThumb",
            CASE WHEN jsonb_typeof(v.thumbs) = 'array' THEN v.thumbs->0 ELSE NULL END
          ) AS "defaultThumb",
          COALESCE(
            se."metaDescription",
            se.summary,
            CASE
              WHEN v."aiDescription" IS NOT NULL
                AND v."aiDescription" NOT ILIKE '%Find more of the best Eporner videos catalog%'
              THEN v."aiDescription"
              ELSE NULL
            END
          ) AS "aiDescription",
          v.keywords
        FROM "Video" v
        LEFT JOIN "SeoEnrichment" se
          ON se."videoId" = v.id AND se.status = 'enriched'
        WHERE v.status = 'ACTIVE'
          AND v."aiSpamFlag" = false
          AND v."aiScoreSpam" < 65
          AND LENGTH(TRIM(v.title)) >= 12
          AND v.title !~* '(https?://|www\\.|\\.(com|net|org|xyz|tv|cc|io|ru|me|site|online))'
          AND LOWER(TRIM(v.title)) NOT IN ('3xxx', 'p4wgp0v', 'xxxraw', 'chatu video', 'webcam show', 'hd video')
        ORDER BY
          (se."videoId" IS NOT NULL) DESC,
          (v."aiDescription" IS NOT NULL AND v."aiDescription" NOT ILIKE '%Find more of the best Eporner videos catalog%') DESC,
          v.views DESC,
          v."addedAt" DESC NULLS LAST
        LIMIT ${CHUNK_SIZE} OFFSET ${chunkIndex * CHUNK_SIZE}
      `
    );

    const items: VideoSitemapItem[] = videos.map((v) => {
      const id = v.id as string;
      const title = (v.title as string) || "Adult Video";
      const lastMod = (v.updatedAt || v.addedAt || new Date()) as Date;
      const thumbUrl = resolveThumbUrl(v.defaultThumb);
      const cleanAiDesc = isCompetitorFallbackDesc(v.aiDescription as string | null)
        ? null
        : (v.aiDescription as string).trim();
      const rawDesc = cleanAiDesc || buildVideoDescription(title, v.keywords as string);
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

  const cachedFresh = segmentFreshCache.get(segmentId);
  if (cachedFresh && Date.now() < cachedFresh.expiresAt) {
    return { xml: cachedFresh.xml, degraded: false };
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

  if (segmentFreshCache.size >= MAX_CACHED_SEGMENTS && !segmentFreshCache.has(segmentId)) {
    const firstKey = segmentFreshCache.keys().next().value;
    if (firstKey !== undefined) segmentFreshCache.delete(firstKey);
  }
  segmentFreshCache.set(segmentId, {
    xml,
    expiresAt: Date.now() + SITEMAP_SEGMENT_TTL_MS,
  });

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
