import { notFound } from "next/navigation";
import { EpornerAPI, getCuratedDbVideos } from "@/lib/api/eporner";
import { VideoGrid } from "@/components/video/VideoGrid";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Metadata } from "next";
import { TIER1_CATEGORIES } from "@/lib/category-config";
import { ContinueWatching } from "@/components/video/ContinueWatching";
import { AdsterraBanner } from "@/components/ads/AdsterraBanner";
import { JsonLd } from "@/components/seo/JsonLd";
import { parsePositivePage, isInvalidSearchQuery } from "@/lib/utils";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.lusthub.web.id";

// ISR: regenerate homepage every 30 minutes in the background.
// Shows freshly synced videos without requiring a full redeploy.
// 1800 seconds = 30 minutes — appropriate for a "latest videos" feed.
export const revalidate = 1800;

export const metadata: Metadata = {
  title: {
    absolute: "LustHub — Free HD Porn Videos",
  },
  description: "Watch the latest and most popular free HD porn videos on LustHub. New videos added daily, free streaming, no registration required.",
  alternates: {
    canonical: SITE_URL,
    languages: {
      "x-default": SITE_URL,
      en: SITE_URL,
    },
  },
  openGraph: {
    title: "LustHub — Free HD Porn Videos",
    description: "Watch the latest and most popular free HD porn videos on LustHub. New videos added daily, free streaming, no registration required.",
    type: "website",
    locale: "en_US",
    alternateLocale: ["en_GB", "de_DE", "fr_FR", "es_ES", "ja_JP", "ko_KR", "id_ID"],
    url: SITE_URL,
    siteName: "LustHub",
    images: [
      {
        url: "/logo.webp",
        width: 512,
        height: 512,
        alt: "LustHub — Free HD Porn Videos",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LustHub — Free HD Porn Videos",
    description: "Watch the latest and most popular free HD porn videos on LustHub. New videos added daily, free streaming, no registration required.",
    images: ["/logo.webp"],
  },
};

export default async function UserHome({
  searchParams,
}: {
  searchParams: Promise<{ 
    q?: string; 
    page?: string; 
    order?: string;
    lq?: string;
  }>;
}) {
  const resolvedSearchParams = await searchParams;
  const rawQuery = resolvedSearchParams.q;
  const page = parsePositivePage(resolvedSearchParams.page);
  if (page === null || isInvalidSearchQuery(rawQuery)) {
    return notFound();
  }
  const query = rawQuery?.trim() || "all";
  const order = (resolvedSearchParams.order as "latest" | "top-weekly" | "top-monthly" | "most-popular" | "longest" | "shortest") || "latest";
  const lq = parseInt(resolvedSearchParams.lq || "1") as 0 | 1 | 2;
  const per_page = 30; 

  const showFeaturedRow = page === 1 && order === "latest" && query === "all";

  const [res, featuredVideos] = await Promise.all([
    EpornerAPI.search({
      query,
      page,
      per_page,
      order,
      lq,
    }),
    showFeaturedRow ? getCuratedDbVideos({ limit: 8 }) : Promise.resolve([]),
  ]);

  const featuredIdSet = new Set(featuredVideos.map((v) => v.id));
  const rawVideos = res?.videos || [];
  const videos = showFeaturedRow && featuredVideos.length > 0
    ? rawVideos.filter((v) => !featuredIdSet.has(v.id))
    : rawVideos;
  const totalPages = res?.total_pages || 1;

  // Prevent Soft 404 on explicit query/pagination variants while keeping bare `/` resilient
  const hasExplicitQuery = Boolean(rawQuery?.trim() && rawQuery.trim() !== "all");
  if ((hasExplicitQuery || page > 1) && (videos.length === 0 || (totalPages > 0 && page > totalPages))) {
    return notFound();
  }

  // Helper to build page URL
  const getPageUrl = (targetPage: number) => {
    const params = new URLSearchParams();
    if (query !== "all") params.set("q", query);
    if (order !== "latest") params.set("order", order);
    if (lq !== 1) params.set("lq", lq.toString());
    params.set("page", targetPage.toString());
    return `/?${params.toString()}`;
  };

  // ── WebSite + Organization JSON-LD ────────────────────────────────────────
  // @graph bundles both types in one script tag to avoid multiple LD+JSON blocks.
  // WebSite enables Sitelinks Searchbox; Organization anchors the brand entity.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        "name": "LustHub",
        "url": SITE_URL,
        "inLanguage": "en",
        "description": "Free HD porn videos updated daily. No registration required.",
        "potentialAction": {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": `${SITE_URL}/results?search_query={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        "name": "LustHub",
        "url": SITE_URL,
        "logo": {
          "@type": "ImageObject",
          // /logo.webp exists in public/ — use this as the brand logo.
          // Google recommends a rectangular logo for Knowledge Panel eligibility.
          "url": `${SITE_URL}/logo.webp`,
          "width": 512,
          "height": 512,
        },
      },
    ],
  };

  return (
    <>
      {/* JSON-LD — injected server-side, invisible to users */}
      <JsonLd data={jsonLd} />

      <div className="px-3 sm:px-5 py-2.5 sm:py-4 space-y-5 sm:space-y-6">
        {/* H1 — required for SEO; styled small and unobtrusive */}
        <h1 className="sr-only">Latest Free HD Porn Videos</h1>

        {/* ── Category Topic Strip (YouTube-style 1-row swipeable chips on mobile/tablet) ──
             Keeps all 25 Tier-1 category <Link>s in SSR HTML (1-click crawl depth) while
             eliminating the 6-row pill wall on phone screens so videos sit right above the fold.
        */}
        {page === 1 && (
          <nav aria-label="Featured categories" className="relative">
            <div className="flex flex-nowrap lg:flex-wrap items-center gap-2 overflow-x-auto lg:overflow-visible no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0 py-0.5">
              <Link
                href="/"
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 whitespace-nowrap transition-all ${
                  order === "latest" && query === "all"
                    ? "bg-white text-black shadow-xs"
                    : "bg-[#1B1B1B] text-[#D4D4D4] border border-white/[0.08] hover:bg-[#262626] hover:text-white"
                }`}
              >
                All
              </Link>
              {TIER1_CATEGORIES.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/category/${cat.slug}`}
                  className="px-3.5 py-1.5 rounded-full bg-[#1B1B1B] border border-white/[0.08] text-xs text-[#D4D4D4] hover:text-white hover:bg-[#262626] hover:border-[#f6396c]/40 active:scale-[0.97] transition-all font-medium shrink-0 whitespace-nowrap"
                >
                  {cat.name}
                </Link>
              ))}
              <Link
                href="/categories"
                className="px-3.5 py-1.5 rounded-full bg-[#f6396c]/15 border border-[#f6396c]/30 text-xs text-[#ff6b93] hover:text-white hover:bg-[#f6396c]/25 transition-all font-semibold shrink-0 whitespace-nowrap"
              >
                All Categories →
              </Link>
            </div>
          </nav>
        )}

        {/* ── Continue Watching (sleek compact resume cards for returning visitors) ── */}
        {page === 1 && <ContinueWatching />}

        {/* ── Featured HD Videos (Horizontal snap carousel on phone, 4-col grid on tablet/PC) ── */}
        {showFeaturedRow && featuredVideos.length > 0 && (
          <section aria-label="Featured HD videos" className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-heading text-sm sm:text-base font-bold tracking-tight text-[#F5F5F5] flex items-center gap-2">
                <span className="w-1 h-4 rounded-full bg-[#f6396c]" aria-hidden="true" />
                <span>Featured HD Videos</span>
              </h2>
              <span className="text-[11px] text-[#8E8E8E] sm:hidden">
                Swipe →
              </span>
              <Link
                href="/categories"
                className="hidden sm:inline text-xs font-medium text-[#ff6b93] hover:text-white transition-colors"
              >
                Explore Categories →
              </Link>
            </div>
            <VideoGrid videos={featuredVideos} showNativeAd={false} carouselOnMobile />
          </section>
        )}

        {/* ── Curated Feed Switcher (Latest / Trending / Popular / Top Rated) ── */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0 py-1">
            {[
              { label: "Latest", value: "latest", href: "/" },
              { label: "Trending", value: "top-weekly", href: "/?order=top-weekly" },
              { label: "Most Popular", value: "most-popular", href: "/?order=most-popular" },
              { label: "Top Rated", value: "top-monthly", href: "/?order=top-monthly" },
            ].map((tab) => {
              const isActive = order === tab.value;
              return (
                <Link
                  key={tab.value}
                  href={tab.href}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium shrink-0 whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-[#f6396c] text-white font-semibold shadow-[0_6px_18px_-6px_rgba(246,57,108,0.65)]"
                      : "bg-[#181818] text-[#CCCCCC] hover:text-white hover:bg-[#242424] border border-white/[0.07]"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── Adsterra Top Banner (728×90 desktop / 320×50 mobile) ────────── */}
        <AdsterraBanner
          adKey="361158242f9f7ba4b97dddf961d303d6"
          width={728}
          height={90}
          className="hidden lg:flex"
        />
        <AdsterraBanner
          adKey="1657e4fb76c1445cfbb411b5b0a859ee"
          width={320}
          height={50}
          className="flex lg:hidden"
        />

        {/* Grid Video Container */}
        <VideoGrid
          videos={videos}
        />

        {/* ── Adsterra Bottom Banner (300×250 Medium Rectangle) ───────────── */}
        <AdsterraBanner
          adKey="3f7aeb74bde61edc8e369b2303797899"
          width={300}
          height={250}
          className="flex my-4"
        />

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 pt-6 pb-12 font-semibold">
            {page > 1 ? (
              <Link
                href={getPageUrl(page - 1)}
                className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#272727] hover:bg-[#3F3F3F] text-xs transition-colors text-white cursor-pointer border border-white/5"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous</span>
              </Link>
            ) : (
              <button
                disabled
                className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#1F1F1F] text-xs text-muted-foreground opacity-30 cursor-not-allowed border border-white/5"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous</span>
              </button>
            )}

            <span className="text-xs text-[#AAAAAA] px-4 font-mono">
              Page <span className="text-white font-bold">{page}</span> of{" "}
              <span className="text-white font-bold">{totalPages}</span>
            </span>

            {page < totalPages ? (
              <Link
                href={getPageUrl(page + 1)}
                className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#272727] hover:bg-[#3F3F3F] text-xs transition-colors text-white cursor-pointer border border-white/5"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <button
                disabled
                className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#1F1F1F] text-xs text-muted-foreground opacity-30 cursor-not-allowed border border-white/5"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
