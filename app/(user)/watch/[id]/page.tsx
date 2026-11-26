import { notFound, permanentRedirect, redirect } from "next/navigation";
import { WatchPageClient } from "@/components/video/WatchPageClient";
import { Metadata } from "next";
import {
  EpornerAPI,
  mapDbVideoToEporner,
  getDbCache,
  setDbCache,
  coalesceInFlight,
  invalidateVideoCaches,
  getCuratedDbVideos,
  isCompetitorFallbackDesc,
  DB_VIDEO_CACHE_TTL,
  DB_NEGATIVE_CACHE_TTL,
} from "@/lib/api/eporner";
import { invalidateSitemapCache } from "@/lib/sitemap";
import { cache } from "react";
import { buildWatchUrl, extractVideoId } from "@/lib/video/slug";
import { toProxiedThumbUrl } from "@/lib/video/thumb-url";
import { TIER1_CATEGORIES } from "@/lib/category-config";
import { slugify } from "@/lib/utils";
import { JsonLd } from "@/components/seo/JsonLd";
import { getEnrichedVideo } from "@/lib/seo/enrichment-store";

// ISR: Regenerate watch pages every 6 hours.
// Video metadata (title, thumbnail, views) is very stable — rarely changes.
// Aligned with VIDEO_TTL in lib/api/eporner.ts for cache consistency.
// Sync is handled exclusively by /api/cron/sync (cron-job.org every 30 min).
export const revalidate = 21600; // 6 hours

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.lusthub.web.id";

/**
 * Converts total seconds to ISO 8601 duration string (PT format).
 * Required for VideoObject schema. Returns null if seconds is invalid.
 */
function toISO8601Duration(totalSeconds: number | null | undefined): string | null {
  if (!totalSeconds || totalSeconds <= 0) return null;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `PT${h}H${m}M${s}S`;
  if (m > 0) return `PT${m}M${s}S`;
  return `PT${s}S`;
}

/**
 * Builds a keyword-enriched, unique description for a video.
 * Falls back to the generic template if no keywords are available.
 */
function buildVideoDescription(title: string, keywords: string | undefined): string {
  const kws = keywords
    ? keywords.split(",").slice(0, 5).map((k) => k.trim()).filter(Boolean)
    : [];
  if (kws.length > 0) {
    return `Watch "${title}" on LustHub — featuring ${kws.join(", ")}. Free HD streaming, no registration required.`;
  }
  return `Watch "${title}" in HD quality for free on LustHub. No registration required.`;
}

/**
 * Formats runtime into a natural English duration label for editorial overview text.
 */
function formatRuntimeLabel(lengthSec?: number | null, lengthMin?: string | null): string | null {
  if (lengthSec && lengthSec >= 60) {
    const mins = Math.round(lengthSec / 60);
    return mins === 1 ? "1-minute" : `${mins}-minute`;
  }
  if (lengthMin && lengthMin !== "0:00") {
    return `${lengthMin}`;
  }
  return null;
}

/**
 * Builds a clean, unique, server-rendered editorial overview for every watch page so
 * non-enriched videos still provide substantive on-page context instead of bare hashtags.
 */
function buildRichVideoOverview(params: {
  title: string;
  keywords?: string;
  lengthSec?: number | null;
  lengthMin?: string | null;
  views?: number;
  rate?: string;
  primaryCategoryName?: string | null;
  enrichedSummary?: string | null;
  dbAiDescription?: string | null;
}): string {
  if (params.enrichedSummary && params.enrichedSummary.trim().length >= 40) {
    return params.enrichedSummary.trim();
  }
  if (!isCompetitorFallbackDesc(params.dbAiDescription)) {
    return params.dbAiDescription!.trim();
  }

  const runtime = formatRuntimeLabel(params.lengthSec, params.lengthMin);
  const cleanKws = (params.keywords || "")
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length >= 2 && k.length <= 40)
    .slice(0, 6);
  const catPhrase = params.primaryCategoryName
    ? `${params.primaryCategoryName} HD`
    : "HD adult";
  const lengthPhrase = runtime ? `${runtime} ${catPhrase}` : catPhrase;
  const viewsCount = Number(params.views) || 0;
  const rateVal = params.rate ? parseFloat(params.rate) : 0;
  const approvalPct = rateVal > 0 ? Math.round(rateVal * 20) : 0;

  const sentences: string[] = [
    `Stream "${params.title}", a ${lengthPhrase} video available for instant free playback on LustHub without registration.`,
  ];

  if (cleanKws.length > 0) {
    sentences.push(
      `This scene highlights ${cleanKws.slice(0, 5).join(", ")} themes curated for fast desktop and mobile viewing.`
    );
  }

  if (viewsCount >= 100 && approvalPct > 0) {
    sentences.push(
      `Watched over ${viewsCount.toLocaleString("en-US")} times with a ${approvalPct}% viewer approval rating across our global catalog.`
    );
  } else if (viewsCount >= 100) {
    sentences.push(
      `Viewed ${viewsCount.toLocaleString("en-US")} times on LustHub with adaptive streaming quality.`
    );
  }

  return sentences.join(" ");
}

import { sql } from "@/lib/db";

const getCachedEnrichedVideo = cache(getEnrichedVideo);

type WatchCacheRecord =
  | { status: "active"; video: ReturnType<typeof mapDbVideoToEporner> & { seoDescription: string | null } }
  | { status: "blocked" };

const getCachedVideoById = cache(async (id: string) => {
  const cacheKey = `db:watch:${id}`;
  const memHit = getDbCache<WatchCacheRecord>(cacheKey);

  if (memHit) {
    if (memHit.status === "blocked") {
      return null;
    }
    // Respect 6-hour cached checkVideoStatus; only updates DB if upstream removed it
    const upstreamStatus = await EpornerAPI.checkVideoStatus(id);
    if (upstreamStatus === "removed") {
      await sql`UPDATE "Video" SET status = 'REMOVED', "updatedAt" = NOW() WHERE id = ${id}`.catch((e) =>
        console.warn(`[WatchPage] Failed to self-heal REMOVED status for ${id}:`, e)
      );
      invalidateVideoCaches(id);
      setDbCache(cacheKey, { status: "blocked" }, DB_NEGATIVE_CACHE_TTL);
      invalidateSitemapCache();
      return null;
    }
    return memHit.video;
  }

  let dbErrored = false;
  const dbRecord = await coalesceInFlight(cacheKey, async (): Promise<WatchCacheRecord | null> => {
    try {
      // We select status to check if it's explicitly marked as REMOVED/DRAFT
      const rows = await sql`SELECT *, "aiDescription" FROM "Video" WHERE id = ${id} LIMIT 1`;
      if (rows && rows.length > 0) {
        const dbVideo = rows[0];

        // If the video exists in our DB but is not ACTIVE (e.g. DRAFT/Spam or REMOVED),
        // we must hard block it. Do NOT fall back to Eporner API.
        if (dbVideo.status !== "ACTIVE") {
          setDbCache(cacheKey, { status: "blocked" }, DB_NEGATIVE_CACHE_TTL);
          return { status: "blocked" };
        }

        // Self-healing upstream check: if Eporner permanently deleted this video between
        // daily cron runs, immediately mark it REMOVED in DB and return 404 so Googlebot
        // never crawls a 200 OK watch page pointing to /embed404/ and dead 404 thumbnails.
        const upstreamStatus = await EpornerAPI.checkVideoStatus(id);
        if (upstreamStatus === "removed") {
          await sql`UPDATE "Video" SET status = 'REMOVED', "updatedAt" = NOW() WHERE id = ${id}`.catch((e) =>
            console.warn(`[WatchPage] Failed to self-heal REMOVED status for ${id}:`, e)
          );
          invalidateVideoCaches(id);
          setDbCache(cacheKey, { status: "blocked" }, DB_NEGATIVE_CACHE_TTL);
          invalidateSitemapCache();
          return { status: "blocked" };
        }

        const mapped = {
          ...mapDbVideoToEporner(dbVideo as Record<string, unknown>),
          seoDescription: (dbVideo.aiDescription as string | null) ?? null,
        };
        const entry: WatchCacheRecord = { status: "active", video: mapped };
        setDbCache(cacheKey, entry, DB_VIDEO_CACHE_TTL);
        return entry;
      }
      return null;
    } catch (err: any) {
      dbErrored = true;
      if (err?.code === "42P01") {
        // 42P01 = undefined_table (Database table "Video" does not exist yet)
        // Only warn concisely so terminal log stays clean; will automatically fallback to Eporner API
        console.warn("[WatchPage] Database table 'Video' not yet created (run 'npm run db:push' on server to initialize). Falling back to Eporner API.");
      } else {
        console.error("[WatchPage] Error fetching video from DB:", err);
      }
      return null;
    }
  });

  if (dbRecord) {
    return dbRecord.status === "blocked" ? null : dbRecord.video;
  }

  // Fallback to Eporner if not in local DB or DB temporarily failed
  const epornerVideo = await EpornerAPI.getById(id);
  if (!dbErrored && !epornerVideo) {
    // Video genuinely does not exist in DB or upstream — avoid repeated lookups
    setDbCache(cacheKey, { status: "blocked" }, DB_NEGATIVE_CACHE_TTL);
  }
  return epornerVideo;
});

/**
 * Eporner video IDs are alphanumeric strings, 4–20 chars, no hyphens or special chars.
 * Example: "2fPfA79DdjL", "AbCd1234"
 * This regex rejects garbage IDs from bots before they hit the API or create ISR cache entries.
 */
const EPORNER_ID_REGEX = /^[a-zA-Z0-9]{4,20}$/;

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  // `id` here is the full slug param (e.g. "step-sis-2fPfA79DdjL")
  const { id: slugParam } = await params;
  const videoId = extractVideoId(slugParam);
  // Reject garbage IDs from bots immediately — no API call, no ISR cache entry
  if (!EPORNER_ID_REGEX.test(videoId)) return notFound();
  const video = await getCachedVideoById(videoId);
  if (!video) return notFound();

  const canonicalPath = buildWatchUrl(video.id, video.title);
  const canonicalParam = canonicalPath.replace(/^\/watch\//, "");
  
  if (slugParam !== canonicalParam) {
    permanentRedirect(canonicalPath);
  }

  const canonicalUrl = `${SITE_URL}${canonicalPath}`;

  // Resolve primary thumbnail via first-party Cloudflare-cached /thumbs/ proxy
  const rawThumbUrl =
    video.default_thumb?.src ||
    (Array.isArray(video.thumbs) && video.thumbs[0]?.src) ||
    `${SITE_URL}/logo.webp`;
  const thumbUrl = toProxiedThumbUrl(rawThumbUrl, SITE_URL) || `${SITE_URL}/logo.webp`;

  const thumbWidth =
    video.default_thumb?.width && video.default_thumb.width > 0
      ? video.default_thumb.width
      : 640;
  const thumbHeight =
    video.default_thumb?.height && video.default_thumb.height > 0
      ? video.default_thumb.height
      : 360;

  const embedUrl = (video.embed || `https://www.eporner.com/embed/${video.id}`).replace(/\/+$/, "");

  // Fetch enriched AI metadata if available (Fase 5C)
  const enriched = await getCachedEnrichedVideo(video.id);

  const displayTitle = enriched?.seo_title || video.title;

  // Use clean AI SEO Description if available (ignoring broken competitor fallback templates)
  const rawDbDesc = "seoDescription" in video ? (video.seoDescription as string | null) : null;
  const cleanDbDesc = !isCompetitorFallbackDesc(rawDbDesc) ? rawDbDesc!.trim() : null;
  const description = enriched?.meta_description ||
    cleanDbDesc ||
    buildVideoDescription(video.title, video.keywords);

  // Watch pages are always indexable. The catalog is open-ended (links come from
  // the live Eporner feed), so gating robots on enrichment status produced
  // hundreds of self-inflicted "Excluded by noindex" pages in GSC.
  // ENFORCE_INDEXING_GATE now only controls sitemap selection (lib/sitemap.ts).
  const robots = { index: true, follow: true };

  return {
    title: displayTitle,
    description,
    // Canonical always points to the slug-based URL — never the bare ID URL
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "x-default": canonicalUrl,
        en: canonicalUrl,
      },
    },
    robots,
    openGraph: {
      title: `${displayTitle} — LustHub`,
      description,
      type: "video.other",
      locale: "en_US",
      alternateLocale: ["en_GB", "de_DE", "fr_FR", "es_ES", "ja_JP", "ko_KR", "id_ID"],
      url: canonicalUrl,
      siteName: "LustHub",
      ...(thumbUrl ? { images: [{ url: thumbUrl, width: thumbWidth, height: thumbHeight, alt: displayTitle }] } : {}),
      videos: [
        {
          url: embedUrl,
          secureUrl: embedUrl,
          type: "text/html",
          width: 1280,
          height: 720,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${displayTitle} — LustHub`,
      description,
      ...(thumbUrl ? { images: [thumbUrl] } : {}),
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function WatchVideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: slugParam } = await params;
  if (!slugParam) return notFound();

  // Extract the raw video ID from the end of the slug param
  const videoId = extractVideoId(slugParam);

  // Reject garbage IDs from bots immediately — prevents API call + ISR cache entry
  if (!EPORNER_ID_REGEX.test(videoId)) return notFound();

  const video = await getCachedVideoById(videoId);
  if (!video) return notFound();

  // Build the canonical slug URL for this video
  const canonicalPath = buildWatchUrl(video.id, video.title);
  const canonicalParam = canonicalPath.replace(/^\/watch\//, "");

  // ── Canonical Redirect ────────────────────────────────────────────────────
  if (slugParam !== canonicalParam) {
    permanentRedirect(canonicalPath);
  }

  // Fetch enriched AI metadata if available (Fase 5C)
  const enriched = await getCachedEnrichedVideo(video.id);

  // Match keyword to a Tier-1 category for breadcrumbs & semantic hierarchy
  const keywords = typeof video.keywords === "string" && video.keywords ? video.keywords.split(",") : [];
  const primaryCat = keywords
    .map((k) => {
      const slug = slugify(k.trim());
      return TIER1_CATEGORIES.find((c) => c.slug === slug);
    })
    .find(Boolean);

  // Prioritize curated, sitemap-indexed DB videos for Recommended Videos so internal
  // link equity flows across stable catalog pages instead of ephemeral non-DB uploads.
  const firstKeyword = keywords.length > 0 ? keywords[0].trim() : "";
  const curatedTopicVideos = await getCuratedDbVideos({
    limit: 10,
    categoryOrKeyword: primaryCat?.name || firstKeyword || undefined,
    excludeId: video.id,
  });
  let related = curatedTopicVideos;
  if (related.length < 6) {
    const existingIds = new Set([video.id, ...related.map((v) => v.id)]);
    const curatedGeneral = await getCuratedDbVideos({ limit: 12, excludeId: video.id });
    for (const item of curatedGeneral) {
      if (!existingIds.has(item.id) && related.length < 10) {
        existingIds.add(item.id);
        related = [...related, item];
      }
    }
  }
  if (related.length < 6) {
    const query = primaryCat?.name || firstKeyword || "hd";
    const relatedRes = await EpornerAPI.search({ query, order: "most-popular", per_page: 12 }).catch(() => null);
    const existingIds = new Set([video.id, ...related.map((v) => v.id)]);
    for (const item of relatedRes?.videos || []) {
      if (!existingIds.has(item.id) && related.length < 10) {
        existingIds.add(item.id);
        related = [...related, item];
      }
    }
  }

  // ── VideoObject JSON-LD ────────────────────────────────────────────────────────────────────────────
  // Emit a single first-party Cloudflare-cached thumbnail URL (/thumbs/...jpg) to cut
  // Googlebot thumbnail crawl load by 67% and eliminate third-party hostload failures.
  const rawPrimaryThumb =
    video.default_thumb?.src ||
    (Array.isArray(video.thumbs) && video.thumbs[0]?.src) ||
    `${SITE_URL}/logo.webp`;
  const primaryThumbUrl = toProxiedThumbUrl(rawPrimaryThumb, SITE_URL) || `${SITE_URL}/logo.webp`;

  const duration = toISO8601Duration(video.length_sec);

  // Use clean AI SEO Description if available (ignoring broken competitor fallback templates)
  const rawDbDesc = "seoDescription" in video ? (video.seoDescription as string | null) : null;
  const cleanDbDesc = !isCompetitorFallbackDesc(rawDbDesc) ? rawDbDesc!.trim() : null;
  const description = enriched?.meta_description ||
    cleanDbDesc ||
    buildVideoDescription(video.title, video.keywords);

  const editorialOverview = buildRichVideoOverview({
    title: enriched?.seo_title || video.title,
    keywords: video.keywords,
    lengthSec: video.length_sec,
    lengthMin: video.length_min,
    views: video.views,
    rate: video.rate,
    primaryCategoryName: primaryCat?.name || null,
    enrichedSummary: enriched?.summary || null,
    dbAiDescription: cleanDbDesc,
  });
    
  const canonicalUrl = `${SITE_URL}${canonicalPath}`;

  // Validate uploadDate — must be ISO 8601 for Google compliance
  const uploadDate = video.added && !isNaN(Date.parse(video.added))
    ? new Date(video.added).toISOString()
    : undefined;

  const cleanEmbedUrl = (video.embed || `https://www.eporner.com/embed/${video.id}`).replace(/\/+$/, "");

  // Build VideoObject — omit contentUrl since cleanEmbedUrl is an HTML player URL, not raw video bytes
  const videoSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "@id": `${canonicalUrl}#video`,
    "name": enriched?.seo_title || video.title,
    "description": description,
    "url": canonicalUrl,
    "embedUrl": cleanEmbedUrl,
    "thumbnailUrl": primaryThumbUrl,
    "inLanguage": "en",
    "width": 1280,
    "height": 720,
    "isFamilyFriendly": false,
    "potentialAction": {
      "@type": "WatchAction",
      "target": canonicalUrl,
    },
  };

  if (duration) videoSchema["duration"] = duration;
  if (uploadDate) videoSchema["uploadDate"] = uploadDate;
  if (video.views) {
    videoSchema["interactionStatistic"] = {
      "@type": "InteractionCounter",
      "interactionType": "https://schema.org/WatchAction",
      "userInteractionCount": video.views,
    };
  }

  // ── BreadcrumbList JSON-LD ─────────────────────────────────────────────
  const breadcrumbItems = [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": SITE_URL,
    },
    ...(primaryCat
      ? [
          {
            "@type": "ListItem",
            "position": 2,
            "name": primaryCat.name,
            "item": `${SITE_URL}/category/${primaryCat.slug}`,
          },
        ]
      : [
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Categories",
            "item": `${SITE_URL}/categories`,
          },
        ]),
    {
      "@type": "ListItem",
      "position": 3,
      "name": video.title,
      "item": canonicalUrl,
    },
  ];

  const breadcrumbSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${canonicalUrl}#breadcrumb`,
    "itemListElement": breadcrumbItems,
  };

  // Bundle schemas into graph
  const schemaList: Array<Record<string, unknown>> = [videoSchema, breadcrumbSchema];

  // If FAQ was generated by Gemini, inject FAQPage schema
  if (enriched?.faq && enriched.faq.length > 0) {
    schemaList.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "@id": `${canonicalUrl}#faq`,
      "mainEntity": enriched.faq.map((item) => ({
        "@type": "Question",
        "name": item.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": item.answer,
        },
      })),
    });
  }

  return (
    <>
      {/* VideoObject, BreadcrumbList & optional FAQPage JSON-LD */}
      <JsonLd data={schemaList} />
      <WatchPageClient 
        video={video as any} 
        relatedVideos={related} 
        primaryCategory={primaryCat ? { name: primaryCat.name, slug: primaryCat.slug } : null}
        enriched={enriched}
        editorialOverview={editorialOverview}
      />
    </>
  );
}
