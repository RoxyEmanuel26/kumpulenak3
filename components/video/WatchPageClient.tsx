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
  Download,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  Calendar,
  Sparkles,
  Tag
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EpornerVideo } from "@/types/eporner";
import { slugify, formatVideoDate } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { TIER1_SLUGS } from "@/lib/category-config";
import { ShareButton } from "./ShareButton";
import { AdsterraBanner } from "@/components/ads/AdsterraBanner";
import { AdsterraNativeBanner } from "@/components/ads/AdsterraNativeBanner";
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

  const cleanEmbedUrl = (video.embed || `https://www.eporner.com/embed/${video.id}`).replace(/\/+$/, "");
  const proxiedThumb = toProxiedThumbUrl(
    video.default_thumb?.src || (Array.isArray(video.thumbs) && video.thumbs[0]?.src) || null,
    SITE_URL
  );
  const formattedDate = video.added ? formatVideoDate(video.added) : "";

  const playerNode = (
    <VideoPlayer
      embedUrl={cleanEmbedUrl}
      title={video.title}
      thumbnailUrl={proxiedThumb}
      isTheater={isTheater}
      onToggleTheater={() => setIsTheater(!isTheater)}
    />
  );

  // Contextual Tier-1 category pills (always >= 1 link for unbroken crawl equity)
  let catLinks = keywordsList
    .map((tag) => ({ tag, slug: slugify(tag) }))
    .filter(({ slug }) => TIER1_SLUGS.has(slug))
    .filter((item, idx, arr) => arr.findIndex((x) => x.slug === item.slug) === idx)
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
    <div className="flex flex-col w-full min-w-0 overflow-x-clip bg-[#0F0F0F] text-white">
      {/* Theater Mode full-width cinema stage (PC & Tablet) */}
      {isTheater && (
        <div className="w-full bg-[#070707] border-b border-white/[0.06] py-0 sm:py-4 sm:px-4 md:px-6 flex justify-center">
          <div className="w-full max-w-[1440px]">
            {playerNode}
          </div>
        </div>
      )}

      {/* Main Responsive Watch Grid:
          - Phone (<640px): Edge-to-edge player on top, padded content stack below
          - Tablet (640px–1279px): Framed full-width player + spacious info + 2-col Recommended grid
          - PC (>=1280px): Unified 2-column cinema layout (Player+Info left, Ad+Recommended right) */}
      <div className={`w-full mx-auto max-w-[1440px] ${
        isTheater
          ? "px-3.5 sm:px-6 py-4 sm:py-6"
          : "px-0 sm:px-6 py-0 sm:py-5 lg:py-6"
      }`}>
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_390px] gap-y-6 xl:gap-x-7 items-start">

          {/* ── Primary Column: Player (default mode) + Metadata + About + FAQ + Native Ad ── */}
          <article className="min-w-0 flex flex-col">
            {!isTheater && (
              <div className="w-full">
                {playerNode}
              </div>
            )}

            {/* Padded content wrapper (adds horizontal padding on phone while keeping player edge-to-edge) */}
            <div className={`${isTheater ? "pt-0" : "px-3.5 sm:px-0 pt-3.5 sm:pt-4"} space-y-4`}>

              {/* Breadcrumb Navigation — mirrors BreadcrumbList JSON-LD */}
              <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px] text-[#8E8E8E] overflow-hidden">
                <Link href="/" className="hover:text-white transition-colors shrink-0">Home</Link>
                <ChevronRight className="w-3 h-3 shrink-0 opacity-50" />
                {primaryCategory ? (
                  <>
                    <Link href={`/category/${primaryCategory.slug}`} className="hover:text-white transition-colors shrink-0">
                      {primaryCategory.name}
                    </Link>
                    <ChevronRight className="w-3 h-3 shrink-0 opacity-50" />
                  </>
                ) : (
                  <>
                    <Link href="/categories" className="hover:text-white transition-colors shrink-0">
                      Categories
                    </Link>
                    <ChevronRight className="w-3 h-3 shrink-0 opacity-50" />
                  </>
                )}
                <span className="text-[#CCCCCC] truncate">{video.title}</span>
              </nav>

              {/* Title + Quick Stats */}
              <header className="space-y-2">
                <h1 className="font-heading text-lg sm:text-xl lg:text-2xl font-bold tracking-tight leading-snug text-[#F5F5F5] text-balance break-words text-left">
                  {video.title}
                </h1>
                <h2 className="sr-only">Video Details and Tags</h2>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#9E9E9E] font-mono tabular-nums">
                  <span className="inline-flex items-center gap-1.5 text-[#D4D4D4]">
                    <Eye className="w-3.5 h-3.5 text-[#888888]" />
                    {safeViews.toLocaleString("en-US")} views
                  </span>
                  {formattedDate && (
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#888888]" />
                      {formattedDate}
                    </span>
                  )}
                  {video.length_min && video.length_min !== "0:00" && (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#888888]" />
                      {video.length_min}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.07] text-[11px] text-[#D4D4D4]">
                    {currentPercent}% liked
                  </span>
                </div>
              </header>

              {/* Action Bar — wraps cleanly on 360px phones, single sleek row on tablet/PC */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 py-3 border-y border-white/[0.07] w-full">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Like / Dislike segmented pill */}
                  <div className="inline-flex items-center bg-[#1F1F1F] rounded-full overflow-hidden border border-white/[0.08] shrink-0 h-9 sm:h-10">
                    <button
                      type="button"
                      onClick={handleLike}
                      aria-pressed={isLikedGlobal}
                      className={`inline-flex items-center gap-1.5 px-3 sm:px-3.5 h-full border-r border-white/[0.08] cursor-pointer transition-all duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500/60 ${
                        isLikedGlobal ? "text-white bg-white/10" : "text-[#CCCCCC] hover:text-white hover:bg-white/[0.06]"
                      }`}
                    >
                      <ThumbsUp className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLikedGlobal ? "fill-current text-emerald-400" : ""}`} />
                      <span className="text-xs sm:text-sm font-semibold font-mono tabular-nums">
                        {displayLikes.toLocaleString("en-US")}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDislike}
                      aria-pressed={localVote === "dislike"}
                      className={`inline-flex items-center gap-1.5 px-3 sm:px-3.5 h-full cursor-pointer transition-all duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500/60 ${
                        localVote === "dislike" ? "text-white bg-white/10" : "text-[#CCCCCC] hover:text-white hover:bg-white/[0.06]"
                      }`}
                    >
                      <ThumbsDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${localVote === "dislike" ? "fill-current text-red-400" : ""}`} />
                      <span className="text-xs sm:text-sm font-semibold font-mono tabular-nums">
                        {displayDislikes.toLocaleString("en-US")}
                      </span>
                    </button>
                  </div>

                  {/* Share button */}
                  <ShareButton
                    url={`${SITE_URL}${buildWatchUrl(video.id, video.title)}`}
                    title={video.title}
                  />
                </div>

                {/* Primary Download Smartlink CTA — full-width on tiny phones, compact pill on sm+ */}
                <a
                  href="https://apiguinee.org/4/217e85c96daa47caf53c19c87f6e7c6d"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 sm:px-5 h-10 bg-[#E11D48] hover:bg-[#BE123C] active:scale-[0.98] text-white text-xs sm:text-sm font-semibold rounded-full transition-all duration-200 cursor-pointer shadow-[0_8px_24px_-8px_rgba(225,29,72,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                  onClick={() => trackEvent("download_click", { video: video.id })}
                >
                  <Download className="w-4 h-4 stroke-[2.25]" />
                  <span>Download HD Video</span>
                </a>
              </div>

              {/* Contextual Tier-1 Category Navigation */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-[#8E8E8E] font-medium shrink-0 mr-0.5">
                  Categories:
                </span>
                {catLinks.map(({ tag, slug }) => (
                  <Link
                    key={slug}
                    href={`/category/${slug}`}
                    onClick={() => trackEvent("category_cta_click", { category: slug, from_video: video.id })}
                    className="px-3 py-1 rounded-full bg-[#1B1B1B] border border-white/[0.09] text-xs text-[#D4D4D4] hover:text-white hover:bg-[#252525] hover:border-red-500/40 active:scale-[0.98] transition-all duration-200 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60"
                  >
                    {tag}
                  </Link>
                ))}
              </div>

              {/* Unified Editorial Overview, Structured Details, Tags & SSR FAQ Surface */}
              <div className="bg-[#161616] border border-white/[0.07] rounded-2xl p-4 sm:p-5 space-y-5">
                {/* About This Video — always visible in SSR HTML */}
                <section aria-label="About this video" className="space-y-2.5">
                  <h2 className="text-xs font-semibold uppercase tracking-wider font-mono text-[#9A9A9A] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-red-400/80" />
                    About This Video
                  </h2>
                  <p className="text-[13px] sm:text-sm text-[#DCDCDC] leading-relaxed max-w-[70ch]">
                    {editorialOverview || enriched?.summary || `Watch "${video.title}" in HD quality on LustHub.`}
                  </p>
                  {enriched?.highlights && enriched.highlights.length > 0 && (
                    <ul className="pt-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-[#C4C4C4]">
                      {enriched.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500/80 shrink-0" />
                          <span className="leading-relaxed">{h}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {/* Structured Video Details Grid — 2 cols on phone, 4 cols on tablet/PC */}
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 border-t border-white/[0.07]">
                  <div className="bg-[#111111] rounded-xl px-3 py-2.5 border border-white/[0.05]">
                    <dt className="text-[#8A8A8A] font-mono uppercase text-[10px] tracking-wider">Duration</dt>
                    <dd className="text-white font-semibold font-mono tabular-nums text-xs sm:text-[13px] mt-1">
                      {video.length_min || "HD"}
                    </dd>
                  </div>
                  <div className="bg-[#111111] rounded-xl px-3 py-2.5 border border-white/[0.05] min-w-0">
                    <dt className="text-[#8A8A8A] font-mono uppercase text-[10px] tracking-wider">Category</dt>
                    <dd className="text-white font-semibold text-xs sm:text-[13px] mt-1 truncate">
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
                  <div className="bg-[#111111] rounded-xl px-3 py-2.5 border border-white/[0.05]">
                    <dt className="text-[#8A8A8A] font-mono uppercase text-[10px] tracking-wider">Rating</dt>
                    <dd className="text-white font-semibold font-mono tabular-nums text-xs sm:text-[13px] mt-1">
                      {currentPercent}% Liked
                    </dd>
                  </div>
                  <div className="bg-[#111111] rounded-xl px-3 py-2.5 border border-white/[0.05]">
                    <dt className="text-[#8A8A8A] font-mono uppercase text-[10px] tracking-wider">Quality</dt>
                    <dd className="text-white font-semibold font-mono text-xs sm:text-[13px] mt-1">
                      Free HD Stream
                    </dd>
                  </div>
                </dl>

                {/* Unified Video Tags (no duplication when expanded; Tier-1 uses <Link>, others use <button>) */}
                {keywordsList.length > 0 && (
                  <div className="pt-4 border-t border-white/[0.07] space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-[#8A8A8A] inline-flex items-center gap-1.5">
                        <Tag className="w-3 h-3" />
                        Tags ({keywordsList.length})
                      </span>
                      {keywordsList.length > 8 && (
                        <button
                          type="button"
                          onClick={() => setDescExpanded(!descExpanded)}
                          className="text-xs font-medium text-[#B5B5B5] hover:text-white transition-colors cursor-pointer"
                        >
                          {descExpanded ? "Show fewer" : `Show all ${keywordsList.length}`}
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(descExpanded ? keywordsList : keywordsList.slice(0, 8)).map((tag, idx) => {
                        const slug = slugify(tag);
                        const isTier1 = TIER1_SLUGS.has(slug);
                        if (isTier1) {
                          return (
                            <Link key={idx} href={`/category/${slug}`}>
                              <Badge
                                variant="secondary"
                                className="bg-[#222222] hover:bg-[#2E2E2E] text-[#E5E5E5] hover:text-white border border-white/[0.07] text-xs font-normal py-1 px-2.5 rounded-lg transition-colors cursor-pointer"
                              >
                                {tag}
                              </Badge>
                            </Link>
                          );
                        }
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => router.push(`/results?search_query=${encodeURIComponent(tag)}`)}
                            className="bg-transparent border-0 p-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60 rounded-lg"
                          >
                            <Badge
                              variant="secondary"
                              className="bg-white/[0.05] hover:bg-white/[0.11] text-[#C8C8C8] hover:text-white border border-white/[0.05] text-xs font-normal py-1 px-2.5 rounded-lg transition-colors cursor-pointer"
                            >
                              {tag}
                            </Badge>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* FAQ Section — ALWAYS rendered in SSR HTML via native <details> so FAQPage JSON-LD
                    matches visible DOM content per Google Structured Data guidelines. */}
                {enriched?.faq && enriched.faq.length > 0 && (
                  <section aria-label="Frequently asked questions" className="pt-4 border-t border-white/[0.07] space-y-2.5">
                    <h2 className="text-xs font-semibold text-[#9A9A9A] uppercase font-mono tracking-wider">
                      Frequently Asked Questions
                    </h2>
                    <div className="space-y-2">
                      {enriched.faq.map((item, idx) => (
                        <details
                          key={idx}
                          className="bg-[#111111] border border-white/[0.06] rounded-xl px-3.5 py-3 group"
                          open={idx === 0}
                        >
                          <summary className="text-xs sm:text-[13px] font-semibold text-[#F1F1F1] cursor-pointer list-none flex items-center justify-between gap-3">
                            <span>{item.question}</span>
                            <ChevronDown className="w-4 h-4 text-[#888888] shrink-0 transition-transform duration-200 group-open:rotate-180" />
                          </summary>
                          <p className="text-xs sm:text-[13px] text-[#B0B0B0] mt-2 leading-relaxed max-w-[68ch]">
                            {item.answer}
                          </p>
                        </details>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              {/* Adsterra Native Banner — neatly contained below video details */}
              <div className="pt-1 overflow-hidden rounded-xl" aria-hidden="true">
                <AdsterraNativeBanner />
              </div>

            </div>
          </article>

          {/* ── Secondary Sidebar / Below-Fold Column: 300×250 Ad + Recommended Videos ── */}
          <aside
            aria-label="Recommended videos"
            className={`min-w-0 flex flex-col gap-5 ${isTheater ? "" : "px-3.5 sm:px-0"} xl:sticky xl:top-[4.5rem]`}
          >
            {/* Adsterra 300×250 Medium Rectangle — above the fold on PC, cleanly centered on tablet/phone */}
            <div className="w-full rounded-2xl bg-[#141414] border border-white/[0.06] p-2.5 flex flex-col items-center">
              <span className="text-[9px] font-mono uppercase tracking-widest text-[#666666] mb-1.5 select-none">
                Sponsored
              </span>
              <AdsterraBanner
                adKey="3f7aeb74bde61edc8e369b2303797899"
                width={300}
                height={250}
                className="flex justify-center w-full"
              />
            </div>

            {/* Recommended Videos: 1-col on phone, 2-col on tablet (sm–lg), 1-col rail on PC (xl+) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-white/[0.07] pb-2.5">
                <h2 className="font-heading font-bold text-base sm:text-lg tracking-tight text-[#F5F5F5]">
                  Recommended Videos
                </h2>
                <span className="text-[11px] font-mono text-[#777777] tabular-nums">
                  {relatedVideos.length} videos
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3.5">
                {relatedVideos.map((relVideo) => (
                  <VideoCardMini key={relVideo.id} video={relVideo} />
                ))}
              </div>

              {/* Continuation CTA — always links to an indexed category hub */}
              <div className="pt-3 border-t border-white/[0.07] text-center">
                <Link
                  href={primaryCategory ? `/category/${primaryCategory.slug}` : "/categories"}
                  onClick={() => trackEvent("see_more_click", { keyword: primaryCategory?.name || "categories" })}
                  className="inline-flex items-center justify-center gap-1.5 w-full sm:w-auto px-4 py-2 rounded-xl bg-[#1A1A1A] hover:bg-[#242424] border border-white/[0.08] text-xs font-medium text-[#D4D4D4] hover:text-white transition-all duration-200 group"
                >
                  <span>{primaryCategory ? `Explore more ${primaryCategory.name} videos` : "Browse all HD categories"}</span>
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </Link>
              </div>
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
}
