import { notFound } from "next/navigation";
import { WatchPageClient } from "@/components/video/WatchPageClient";
import { Metadata } from "next";
import { EpornerAPI } from "@/lib/api/eporner";
import { syncVideoToDatabase } from "@/lib/video/sync";
import { cache } from "react";

// Always render dynamically — videos can be removed by the sync worker at any time,
// so stale cached pages must never be served.
export const dynamic = "force-dynamic";

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
  const { id } = await params;
  const video = await getCachedVideoById(id);
  if (!video) return { title: "Video Not Found" };

  const thumbUrl =
    video.default_thumb?.src ||
    (Array.isArray(video.thumbs) && video.thumbs[0]?.src) ||
    undefined;

  const description = buildVideoDescription(video.title, video.keywords);

  return {
    title: video.title,
    description,
    // Self-referencing canonical — this is now the authoritative URL
    alternates: {
      canonical: `${SITE_URL}/watch/${id}`,
    },
    openGraph: {
      title: `${video.title} — LustHub`,
      description,
      type: "video.other",
      url: `${SITE_URL}/watch/${id}`,
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
  const { id } = await params;
  if (!id) return notFound();

  const video = await getCachedVideoById(id);
  if (!video) return notFound();

  // HYBRID SYNC: trigger background sync without blocking the UI.
  // This keeps the DB up-to-date with view counts and status.
  syncVideoToDatabase(video.id).catch((err) => {
    console.error(`[WatchVideoPage] Error in background sync:`, err.message);
  });

  // Fetch related videos using the first keyword for contextual relevance
  const keywords = video.keywords ? video.keywords.split(",") : [];
  const query = keywords.length > 0 ? keywords[0].trim() : "hd";
  const relatedRes = await EpornerAPI.search({ query, per_page: 12 });
  const related = relatedRes?.videos?.filter((v) => v.id !== video.id) || [];

  // ── VideoObject JSON-LD ────────────────────────────────────────────────
  // Only include fields that match real visible content to avoid schema/content mismatch.
  // uploadDate uses video.added as-is (Eporner returns ISO 8601 date strings).
  const thumbUrl =
    video.default_thumb?.src ||
    (Array.isArray(video.thumbs) && video.thumbs[0]?.src) ||
    undefined;

  const duration = toISO8601Duration(video.length_sec);
  const description = buildVideoDescription(video.title, video.keywords);
  const canonicalUrl = `${SITE_URL}/watch/${id}`;

  // Conditionally build schema fields — never include undefined/null values
  const videoSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "name": video.title,
    "description": description,
    "url": canonicalUrl,
    "embedUrl": video.embed || undefined,
    "contentUrl": video.embed || undefined,
  };
  if (thumbUrl) videoSchema["thumbnailUrl"] = thumbUrl;
  if (duration) videoSchema["duration"] = duration;
  if (video.added) videoSchema["uploadDate"] = video.added;
  if (video.views) {
    videoSchema["interactionStatistic"] = {
      "@type": "InteractionCounter",
      "interactionType": "https://schema.org/WatchAction",
      "userInteractionCount": video.views,
    };
  }

  return (
    <>
      {/* VideoObject JSON-LD — server-side, invisible to users */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(videoSchema) }}
      />
      <WatchPageClient video={video} relatedVideos={related} />
    </>
  );
}
