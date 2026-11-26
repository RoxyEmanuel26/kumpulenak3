"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { VideoPlayer } from "./VideoPlayer";
import { VideoCardMini } from "./VideoCardMini";
import { useUI } from "../layout/UIContext";
import {
  ThumbsUp, 
  ThumbsDown,
  Download
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EpornerVideo } from "@/types/eporner";
import { slugify, formatVideoDate } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { TIER1_SLUGS } from "@/lib/category-config";
import { ShareButton } from "./ShareButton";
import { AdsterraBanner } from "@/components/ads/AdsterraBanner";
import { buildWatchUrl } from "@/lib/video/slug";
import { toProxiedThumbUrl } from "@/lib/video/thumb-url";
import type { EnrichedVideoData } from "@/lib/seo/enrichment-store";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.lusthub.web.id";


interface WatchPageClientProps {
  video: EpornerVideo;
  relatedVideos: EpornerVideo[];
  primaryCategory?: { name: string; slug: string } | null;
  enriched?: EnrichedVideoData | null;
  editorialOverview?: string;
}

export function WatchPageClient({
  video,
  relatedVideos,
  primaryCategory,
  enriched,
  editorialOverview,
}: WatchPageClientProps) {
  const router = useRouter();
  const { likedVideos, toggleLikeVideo, addToHistory } = useUI();
  const [isTheater, setIsTheater] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  // Calculate rating percentage and total estimated votes
  const safeViews = Number(video.views) || 0;
  const rateVal = video.rate ? parseFloat(video.rate) : 0;
  const ratingPercent = rateVal > 0 ? Math.round(rateVal * 20) : 90;
  const totalVotes = Math.max(5, Math.round(safeViews * 0.015));
  
  const baseLikes = Math.round(totalVotes * (ratingPercent / 100));
  const baseDislikes = totalVotes - baseLikes;

  // Track vote states
  const isLikedGlobal = likedVideos.includes(video.id);
  const [localVote, setLocalVote] = useState<"like" | "dislike" | null>(null);

  // Determine actual display likes/dislikes
  let displayLikes = baseLikes;
  let displayDislikes = baseDislikes;

  // Adjust display values based on user global/local vote states
  if (isLikedGlobal) {
    displayLikes += 1;
  } else if (localVote === "dislike") {
    displayDislikes += 1;
  }

  const currentPercent = Math.round((displayLikes / (displayLikes + displayDislikes)) * 100);

  // Record video in local watch history
  useEffect(() => {
    addToHistory(video.id);
  }, [video.id, addToHistory]);

  // Reset local vote state when video changes to prevent cross-video state leakage (render-phase state adjustment)
  const [prevVideoId, setPrevVideoId] = useState(video.id);
  if (video.id !== prevVideoId) {
    setPrevVideoId(video.id);
    setLocalVote(null);
  }

  const handleLike = () => {
    toggleLikeVideo(video.id);
    if (localVote === "dislike") {
      setLocalVote(null);
    }
  };

  const handleDislike = () => {
    if (isLikedGlobal) {
      toggleLikeVideo(video.id);
      setLocalVote("dislike");
    } else {
      setLocalVote(localVote === "dislike" ? null : "dislike");
    }
  };

  const keywordsList = typeof video.keywords === "string" && video.keywords
    ? video.keywords.split(",").map((k) => k.trim()).filter(Boolean)
    : [];

  return (
    <div className="flex flex-col w-full bg-[#0F0F0F] text-white">
      {/* 1. Large player layout - full width on mobile, responsive padding on desktop */}
      <div className={`w-full bg-black flex justify-center ${
        isTheater ? "border-b border-white/5 py-0" : "py-0 md:py-6 px-0 md:px-4"
      }`}>
        <VideoPlayer
          embedUrl={(video.embed || `https://www.eporner.com/embed/${video.id}`).replace(/\/+$/, "")}
          title={video.title}
          thumbnailUrl={toProxiedThumbUrl(video.default_thumb?.src || (Array.isArray(video.thumbs) && video.thumbs[0]?.src) || null, SITE_URL)}
          isTheater={isTheater}
          onToggleTheater={() => setIsTheater(!isTheater)}
        />
      </div>

      {/* 2. Main content area below player */}
      <div className={`container mx-auto px-4 md:px-6 py-4 md:py-6 flex flex-col lg:flex-row gap-5 md:gap-6 ${
        isTheater ? "max-w-7xl" : "max-w-6xl"
      }`}>
        
        {/* Left Column: Video Info */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Breadcrumb Navigation — Visible on page, mirrors BreadcrumbList JSON-LD */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono mb-2 overflow-hidden truncate">
            <Link href="/" className="hover:text-white transition-colors shrink-0">Home</Link>
            <span className="shrink-0">/</span>
            {primaryCategory ? (
              <>
                <Link href={`/category/${primaryCategory.slug}`} className="hover:text-white transition-colors shrink-0">
                  {primaryCategory.name}
                </Link>
                <span className="shrink-0">/</span>
              </>
            ) : (
              <>
                <Link href="/categories" className="hover:text-white transition-colors shrink-0">
                  Categories
                </Link>
                <span className="shrink-0">/</span>
              </>
            )}
            <span className="text-white truncate">{video.title}</span>
          </nav>

          <h1 className="text-lg md:text-2xl font-bold leading-tight break-words text-[#F1F1F1] text-left">
            {video.title}
          </h1>
          <h2 className="sr-only">Video Details and Tags</h2>

          {/* Action Bar */}
          <div className="flex items-center justify-between gap-2 sm:gap-3 py-2.5 border-b border-white/5 w-full">
            <div className="flex items-center bg-[#272727] hover:bg-[#3F3F3F] transition-colors rounded-full overflow-hidden border border-white/5 shrink-0 h-9 sm:h-10">
              <button 
                onClick={handleLike}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 h-full border-r border-white/10 cursor-pointer transition-colors ${isLikedGlobal ? 'text-white bg-white/5' : 'text-[#AAAAAA] hover:text-white'}`}
              >
                <ThumbsUp className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLikedGlobal ? "fill-current text-green-500" : ""}`} />
                <span className="text-xs sm:text-sm font-semibold font-mono">
                  {displayLikes.toLocaleString("en-US")}
                </span>
              </button>
              <button 
                onClick={handleDislike}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 h-full cursor-pointer transition-colors ${localVote === "dislike" ? 'text-white bg-white/5' : 'text-[#AAAAAA] hover:text-white'}`}
              >
                <ThumbsDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${localVote === "dislike" ? "fill-current text-red-500" : ""}`} />
                <span className="text-xs sm:text-sm font-semibold font-mono">
                  {displayDislikes.toLocaleString("en-US")}
                </span>
              </button>
            </div>

            {/* Right side: approval % + share button + download */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden sm:flex items-center justify-center text-[10px] sm:text-xs text-muted-foreground font-mono bg-[#161616]/40 border border-white/5 px-2.5 sm:px-3 h-9 sm:h-10 rounded-full backdrop-blur-md">
                {currentPercent}% approval
              </span>
              {/* Share button — Web Share API on mobile, clipboard on desktop */}
              <ShareButton
                url={`${SITE_URL}${buildWatchUrl(video.id, video.title)}`}
                title={video.title}
              />
              {/* Download button - Can be linked to a Smartlink for Adsterra monetization */}
              <a 
                href="https://apiguinee.org/4/217e85c96daa47caf53c19c87f6e7c6d"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 h-9 sm:h-10 bg-[#FF3366] hover:bg-[#E62E5C] text-white text-xs sm:text-sm font-bold rounded-full transition-colors cursor-pointer shadow-lg shadow-[#FF3366]/20"
                onClick={() => trackEvent("download_click", { video: video.id })}
              >
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                Download now!
              </a>
            </div>
          </div>

          {/* ── Contextual Category Links ────────────────────────────────────
               Derives Tier-1 category links from the video's keywords.
               Falls back to primaryCategory or top Tier-1 hubs so EVERY watch page
               maintains unbroken internal linking and passes crawl equity.
               Authority flow: /watch/{id} → /category/{slug}
          */}
          {(() => {
            let catLinks = keywordsList
              .map((tag) => ({ tag, slug: slugify(tag) }))
              .filter(({ slug }) => TIER1_SLUGS.has(slug))
              .slice(0, 4);

            if (catLinks.length === 0) {
              if (primaryCategory) {
                catLinks = [{ tag: primaryCategory.name, slug: primaryCategory.slug }];
              } else {
                catLinks = [
                  { tag: "Japanese", slug: "japanese" },
                  { tag: "Asian", slug: "asian" },
                  { tag: "MILF", slug: "milf" },
                  { tag: "Amateur", slug: "amateur" },
                ];
              }
            }

            return (
              <div className="flex flex-wrap items-center gap-2 py-2">
                <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest shrink-0">
                  Explore Categories:
                </span>
                {catLinks.map(({ tag, slug }) => (
                  <Link
                    key={slug}
                    href={`/category/${slug}`}
                    onClick={() => trackEvent("category_cta_click", { category: slug, from_video: video.id })}
                    className="px-2.5 py-1 rounded-full bg-[#1F1F1F] border border-white/10 text-xs text-[#CCCCCC] hover:text-white hover:bg-[#2A2A2A] hover:border-red-600/40 transition-all font-medium"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            );
          })()}


          <div className="bg-[#272727] rounded-xl p-4 hover:bg-[#2F2F2F] transition-colors mt-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-semibold text-muted-foreground">
              <span className="text-white">{safeViews.toLocaleString("en-US")} views</span>
              {video.added && (
                <>
                  <span>•</span>
                  <span className="text-white">{formatVideoDate(video.added)}</span>
                </>
              )}
              {video.length_min && video.length_min !== "0:00" && (
                <>
                  <span>•</span>
                  <span className="text-white font-mono">{video.length_min}</span>
                </>
              )}
            </div>

            {/* Always-visible server-rendered editorial overview & highlights */}
            <section aria-label="About this video" className="space-y-2.5 text-xs sm:text-sm text-[#E5E5E5] leading-relaxed">
              <h2 className="text-[11px] font-bold uppercase tracking-wider font-mono text-muted-foreground">
                About This Video
              </h2>
              <p className="font-normal">
                {editorialOverview || enriched?.summary || `Watch "${video.title}" in HD quality on LustHub.`}
              </p>
              {enriched?.highlights && enriched.highlights.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-[#CCCCCC] list-disc list-inside">
                  {enriched.highlights.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              )}
            </section>

            {/* Structured Video Details Grid — visible in initial SSR HTML */}
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/10 text-[11px]">
              <div className="bg-black/25 rounded-lg px-2.5 py-1.5 border border-white/5">
                <dt className="text-muted-foreground font-mono uppercase text-[9px]">Duration</dt>
                <dd className="text-white font-semibold font-mono mt-0.5">{video.length_min || "HD"}</dd>
              </div>
              <div className="bg-black/25 rounded-lg px-2.5 py-1.5 border border-white/5">
                <dt className="text-muted-foreground font-mono uppercase text-[9px]">Category</dt>
                <dd className="text-white font-semibold mt-0.5 truncate">
                  {primaryCategory ? (
                    <Link href={`/category/${primaryCategory.slug}`} className="hover:text-red-400 transition-colors">
                      {primaryCategory.name}
                    </Link>
                  ) : (
                    <Link href="/categories" className="hover:text-red-400 transition-colors">
                      HD Videos
                    </Link>
                  )}
                </dd>
              </div>
              <div className="bg-black/25 rounded-lg px-2.5 py-1.5 border border-white/5">
                <dt className="text-muted-foreground font-mono uppercase text-[9px]">Rating</dt>
                <dd className="text-white font-semibold font-mono mt-0.5">{currentPercent}% Liked</dd>
              </div>
              <div className="bg-black/25 rounded-lg px-2.5 py-1.5 border border-white/5">
                <dt className="text-muted-foreground font-mono uppercase text-[9px]">Quality</dt>
                <dd className="text-white font-semibold font-mono mt-0.5">Free HD Stream</dd>
              </div>
            </dl>

            {/* Tags: Tier-1 categories render as SEO <Link>, non-Tier-1 tags navigate
                client-side via <button> to eliminate /results?search_query= crawl traps. */}
            {keywordsList.length > 0 && (
              <div className={`text-xs sm:text-sm text-[#F1F1F1] leading-relaxed flex flex-wrap gap-x-2 gap-y-1 ${!descExpanded ? "max-h-14 overflow-hidden" : ""}`}>
                {(descExpanded ? keywordsList : keywordsList.slice(0, 10)).map((tag, idx) => {
                  const slug = slugify(tag);
                  const isTier1 = TIER1_SLUGS.has(slug);
                  if (isTier1) {
                    return (
                      <Link
                        key={idx}
                        href={`/category/${slug}`}
                        className="text-blue-400 hover:underline inline-block"
                      >
                        #{tag.replace(/\s+/g, "")}
                      </Link>
                    );
                  }
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => router.push(`/results?search_query=${encodeURIComponent(tag)}`)}
                      className="text-blue-400 hover:underline inline-block cursor-pointer bg-transparent border-0 p-0"
                    >
                      #{tag.replace(/\s+/g, "")}
                    </button>
                  );
                })}
              </div>
            )}

            {keywordsList.length > 10 && (
              <button 
                type="button"
                onClick={() => setDescExpanded(!descExpanded)}
                className="text-xs sm:text-sm font-semibold hover:underline cursor-pointer text-[#AAAAAA] hover:text-white"
              >
                {descExpanded ? "Show less tags" : "Show all tags"}
              </button>
            )}

            {/* Expanded tag badges */}
            {descExpanded && keywordsList.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-3 border-t border-white/10">
                {keywordsList.map((tag, index) => {
                  const tagSlug = slugify(tag);
                  const isTier1 = TIER1_SLUGS.has(tagSlug);
                  if (isTier1) {
                    return (
                      <Link key={index} href={`/category/${tagSlug}`}>
                        <Badge variant="secondary" className="bg-white/10 text-xs text-[#F1F1F1] hover:bg-white/20 border-0 cursor-pointer py-1 px-2.5 rounded-lg">
                          {tag}
                        </Badge>
                      </Link>
                    );
                  }
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => router.push(`/results?search_query=${encodeURIComponent(tag)}`)}
                      className="bg-transparent border-0 p-0 cursor-pointer"
                    >
                      <Badge variant="secondary" className="bg-white/10 text-xs text-[#F1F1F1] hover:bg-white/20 border-0 cursor-pointer py-1 px-2.5 rounded-lg">
                        {tag}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            )}

            {/* FAQ Section — ALWAYS rendered in SSR HTML via native <details> so FAQPage JSON-LD
                matches visible DOM content per Google Structured Data guidelines. */}
            {enriched?.faq && enriched.faq.length > 0 && (
              <section aria-label="Frequently asked questions" className="pt-3 border-t border-white/10 space-y-2 text-xs">
                <h2 className="font-bold text-muted-foreground uppercase font-mono tracking-wider text-[11px]">
                  Frequently Asked Questions
                </h2>
                <div className="space-y-1.5">
                  {enriched.faq.map((item, idx) => (
                    <details key={idx} className="bg-black/30 border border-white/5 rounded-lg p-2.5 group" open={idx === 0}>
                      <summary className="font-semibold text-white cursor-pointer list-none flex items-center justify-between gap-2">
                        <span>{item.question}</span>
                        <span className="text-muted-foreground text-[10px] font-mono shrink-0">+</span>
                      </summary>
                      <p className="text-muted-foreground mt-1.5 leading-relaxed">{item.answer}</p>
                    </details>
                  ))}
                </div>
              </section>
            )}
          </div>

        </div>

        {/* Right Column: Related Videos */}
        <div className="w-full lg:w-[400px] shrink-0 space-y-4">
          <div className="flex items-center justify-between pb-2">
            <h2 className="font-bold text-lg">Recommended Videos</h2>
          </div>


          
          <div className="flex flex-col gap-3">
            {relatedVideos.map((relVideo) => (
              <VideoCardMini key={relVideo.id} video={relVideo} />
            ))}
          </div>

          {/* ── Continuation CTA ─────────────────────────────────────────
               Always links to an indexed category hub (never /results?search_query=)
               so internal crawl equity stays inside indexable category pages.
          */}
          <div className="pt-3 border-t border-white/5 text-center">
            <Link
              href={primaryCategory ? `/category/${primaryCategory.slug}` : "/categories"}
              onClick={() => trackEvent("see_more_click", { keyword: primaryCategory?.name || "categories" })}
              className="text-xs text-muted-foreground hover:text-red-400 transition-colors font-medium inline-flex items-center gap-1 group"
            >
              {primaryCategory ? `Explore more ${primaryCategory.name} videos` : "Browse all HD categories"}
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
}
