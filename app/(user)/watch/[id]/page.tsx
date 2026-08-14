import { notFound, permanentRedirect } from "next/navigation";
import { WatchPageClient } from "@/components/video/WatchPageClient";
import { Metadata } from "next";
export const runtime = "edge";
import { EpornerAPI } from "@/lib/api/eporner";
import { cache } from "react";
import { buildWatchUrl, extractVideoId } from "@/lib/video/slug";

// ISR: Regenerate watch pages every 1 hour.
// Video metadata (title, thumbnail, views) almost never changes within hours.
// Sync is now handled exclusively by the /api/cron/sync endpoint (cron-job.org)
// rather than being triggered on every page render.
export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://lusthub.web.id";

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

const getCachedVideoById = cache(async (id: string) => {
  return EpornerAPI.getById(id);
});

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  // `id` here is the full slug param (e.g. "step-sis-2fPfA79DdjL")
  const { id: slugParam } = await params;
  const videoId = extractVideoId(slugParam);
  const video = await getCachedVideoById(videoId);
  if (!video) return { title: "Video Not Found" };

  const canonicalUrl = `${SITE_URL}${buildWatchUrl(video.id, video.title)}`;

  // Resolve best available thumbnail — matches the array logic in the page body.
  // Prefer default_thumb, fall back to first entry in thumbs array.
  const thumbUrl =
    video.default_thumb?.src ||
    (Array.isArray(video.thumbs) && video.thumbs[0]?.src) ||
    undefined;

  const description = buildVideoDescription(video.title, video.keywords);

  return {
    title: video.title,
    description,
    // Canonical always points to the slug-based URL — never the bare ID URL
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${video.title} — LustHub`,
      description,
      type: "video.other",
      url: canonicalUrl,
      siteName: "LustHub",
      ...(thumbUrl ? { images: [{ url: thumbUrl, width: 1280, height: 720, alt: video.title }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: `${video.title} — LustHub`,
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
  // `slugParam` is the full Next.js [id] segment — could be:
  //   "2fPfA79DdjL"                     (bare ID — legacy, redirect)
  //   "random-text-2fPfA79DdjL"         (wrong slug — redirect)
  //   "step-sis-caught-me-2fPfA79DdjL"  (canonical — render)
  const { id: slugParam } = await params;
  if (!slugParam) return notFound();

  // Extract the raw video ID from the end of the slug param
  const videoId = extractVideoId(slugParam);

  const video = await getCachedVideoById(videoId);
  if (!video) return notFound();

  // Build the canonical slug URL for this video
  const canonicalPath = buildWatchUrl(video.id, video.title);
  // Derive the slug param portion from canonical path (strip leading "/watch/")
  const canonicalParam = canonicalPath.replace(/^\/watch\//, "");

  // ── Canonical Redirect ────────────────────────────────────────────────────
  // If the current URL param doesn't exactly match the canonical slug param,
  // issue a 308 Permanent Redirect. This handles:
  //   - Bare ID visits:     /watch/2fPfA79DdjL  → 308 → /watch/step-sis-2fPfA79DdjL
  //   - Wrong slug visits:  /watch/wrong-2fPfA79DdjL → 308 → /watch/step-sis-2fPfA79DdjL
  // Always a single redirect hop — no chains.
  if (slugParam !== canonicalParam) {
    permanentRedirect(canonicalPath);
  }

  // REMOVED: syncVideoToDatabase() was previously triggered here on every
  // watch page render, causing excess function invocations.
  // Video syncing is now handled exclusively by the /api/cron/sync endpoint
  // which is called every 30 minutes via cron-job.org.

  // Fetch related videos using the first keyword for contextual relevance
  const keywords = video.keywords ? video.keywords.split(",") : [];
  const query = keywords.length > 0 ? keywords[0].trim() : "hd";
  const relatedRes = await EpornerAPI.search({ query, per_page: 12 });
  const related = relatedRes?.videos?.filter((v) => v.id !== video.id) || [];

  // ── VideoObject JSON-LD ────────────────────────────────────────────────────────────────────────────
  // Google Video Rich Results requirements:
  //   Required:    name, description, thumbnailUrl (array), uploadDate
  //   Recommended: duration, embedUrl, interactionStatistic, contentUrl
  //
  // contentUrl MUST be a direct MP4/WebM file URL, NOT an embed iframe URL.
  // Since we use Eporner iframe embeds, we OMIT contentUrl entirely.
  // Setting contentUrl = embedUrl (as previously done) causes:
  //   - "Video tidak diproses" (GSC Video Indexing errors)
  //   - Validation failures in Google Rich Results Test
  //
  // thumbnailUrl is now an ARRAY for maximum coverage:
  //   Google prefers multiple thumbnails at different aspect ratios.
  //   We provide up to 3 from Eporner's CDN (default + best from thumbs array).
  //
  // uploadDate: Eporner returns ISO 8601 strings (e.g. "2024-01-15T00:00:00+00:00").
  // We pass it directly after validation to ensure it's always a valid date.
  // 
  // regionsAllowed is omitted to allow global indexing; if specific country 
  // blocking is required, regionsAllowed: ["US", "CA"] would be used.

  // Build thumbnail array — deduplicate and prefer highest resolution
  const thumbUrls: string[] = [];
  if (video.default_thumb?.src) thumbUrls.push(video.default_thumb.src);
  if (Array.isArray(video.thumbs)) {
    // Add up to 2 additional unique thumbs (different sizes for Google)
    video.thumbs
      .filter((t) => t.src && t.src !== video.default_thumb?.src)
      .slice(0, 2)
      .forEach((t) => thumbUrls.push(t.src));
  }
  const thumbUrl = thumbUrls[0]; // Primary thumbnail for OG/Twitter

  const duration = toISO8601Duration(video.length_sec);
  const description = buildVideoDescription(video.title, video.keywords);
  const canonicalUrl = `${SITE_URL}${canonicalPath}`;

  // Validate uploadDate — must be ISO 8601 for Google compliance
  const uploadDate = video.added && !isNaN(Date.parse(video.added))
    ? video.added
    : undefined;

  // Build VideoObject — conditionally include optional fields
  const videoSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    // @id links this node to BreadcrumbList and other graph entities
    "@id": `${canonicalUrl}#video`,
    "name": video.title,
    "description": description,
    // url: the watch page — where the user watches the video
    "url": canonicalUrl,
    // embedUrl: Eporner iframe player (required for embedded video indexing)
    // Google uses this to understand the video player for rich results.
    // NOTE: contentUrl is intentionally OMITTED — it must be a direct MP4 URL,
    // not an embed iframe. Setting it to embedUrl causes GSC validation errors.
    ...(video.embed ? { "embedUrl": video.embed } : {}),
    // isFamilyFriendly: false signals adult content to Google.
    // This prevents the video from appearing in SafeSearch results.
    "isFamilyFriendly": false,
    // potentialAction: enables "Watch" sitelink in SERP
    "potentialAction": {
      "@type": "WatchAction",
      "target": canonicalUrl,
    },
  };

  // thumbnailUrl: array of thumbnails — required by Google
  // Google validates that thumbnail URLs are accessible (HTTP 200, non-empty image).
  // If Eporner CDN is overloaded (hostload), Google logs "Thumbnail tidak dapat di-crawl".
  // Providing multiple thumbnails increases the chance at least one is accessible.
  if (thumbUrls.length > 0) {
    videoSchema["thumbnailUrl"] = thumbUrls.length === 1 ? thumbUrls[0] : thumbUrls;
  }

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
  // Provides Google with structured breadcrumb data for rich results in SERP.
  // Uses @id to reference VideoObject above — linked data graph for Google.
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${canonicalUrl}#breadcrumb`,
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": SITE_URL,
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": video.title,
        "item": canonicalUrl,
      },
    ],
  };

  return (
    <>
      {/* VideoObject JSON-LD — server-side, invisible to users */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(videoSchema) }}
      />
      {/* BreadcrumbList JSON-LD — server-side, enables rich breadcrumbs in SERP */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <WatchPageClient video={video} relatedVideos={related} />
    </>
  );
}
