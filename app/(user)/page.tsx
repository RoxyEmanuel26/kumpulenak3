import { EpornerAPI } from "@/lib/api/eporner";
import { VideoGrid } from "@/components/video/VideoGrid";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Metadata } from "next";
import { TIER1_CATEGORIES } from "@/lib/category-config";
import { ContinueWatching } from "@/components/video/ContinueWatching";
import { AdsterraBanner } from "@/components/ads/AdsterraBanner";


const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://lusthub.web.id";

// ISR: regenerate homepage every 30 minutes in the background.
// Shows freshly synced videos without requiring a full redeploy.
// 1800 seconds = 30 minutes — appropriate for a "latest videos" feed.
export const revalidate = 1800;

export const metadata: Metadata = {
  title: "LustHub — Free HD Porn Videos",
  description: "Watch the latest and most popular free HD porn videos on LustHub. New videos added daily, free streaming, no registration required.",
  alternates: {
    canonical: "https://lusthub.web.id",
  },
  openGraph: {
    title: "LustHub — Free HD Porn Videos",
    description: "Watch the latest and most popular free HD porn videos on LustHub. New videos added daily, free streaming, no registration required.",
    type: "website",
    url: "https://lusthub.web.id",
    siteName: "LustHub",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "LustHub — Free HD Porn Videos",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LustHub — Free HD Porn Videos",
    description: "Watch the latest and most popular free HD porn videos on LustHub. New videos added daily, free streaming, no registration required.",
    images: ["/opengraph-image"],
  },
};



export default async function UserHome({
  searchParams,
}: {
  searchParams: Promise<{ 
    q?: string; 
    page?: string; 
    order?: string;
    gay?: string;
    lq?: string;
  }>;
}) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams.q || "all";
  const page = parseInt(resolvedSearchParams.page || "1");
  const order = (resolvedSearchParams.order as "latest" | "top-weekly" | "top-monthly" | "most-popular" | "longest" | "shortest") || "latest";
  const gay = parseInt(resolvedSearchParams.gay || "0") as 0 | 1 | 2;
  const lq = parseInt(resolvedSearchParams.lq || "1") as 0 | 1 | 2;
  const per_page = 30; 

  const res = await EpornerAPI.search({
    query,
    page,
    per_page,
    order,
    gay,
    lq,
  });

  const videos = res?.videos || [];
  const totalPages = res?.total_pages || 1;

  // Helper to build page URL
  const getPageUrl = (targetPage: number) => {
    const params = new URLSearchParams();
    if (query !== "all") params.set("q", query);
    if (order !== "latest") params.set("order", order);
    if (gay !== 0) params.set("gay", gay.toString());
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
          "url": `${SITE_URL}/og-image.png`,
        },
      },
    ],
  };

  return (
    <>
      {/* JSON-LD — injected server-side, invisible to users */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="px-4 py-3 space-y-6">
        {/* H1 — required for SEO; styled small and unobtrusive */}
        <h1 className="sr-only">Latest Free HD Porn Videos</h1>

        {/* ── Continue Watching (return visitor row) ────────────────────────
             Client component — reads watchHistory from UIContext (localStorage).
             Renders nothing for first-time visitors or when history is empty.
             Only shown on page 1 to keep the homepage clean on paginated views.
        */}
        {page === 1 && <ContinueWatching />}

        {/* ── Featured Categories ─────────────────────────────────────────────────────
             Server-rendered direct links to all 15 Tier-1 categories.
             Shown only on page 1. Reduces category crawl depth from 2 clicks to 1.
             Authority flows: Homepage → /category/{slug} directly.
             Expanded from 8 → 15 to expose all SEO-indexed category pages.
        */}
        {page === 1 && (
          <nav aria-label="Featured categories" className="pb-2 border-b border-white/5">
            <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest font-mono mb-3">
              Browse Categories
            </h2>
            <div className="flex flex-wrap gap-2">
              {TIER1_CATEGORIES.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/category/${cat.slug}`}
                  className="px-3 py-1.5 rounded-full bg-[#1F1F1F] border border-white/10 text-xs text-[#CCCCCC] hover:text-white hover:bg-[#2A2A2A] hover:border-red-600/40 transition-all font-medium"
                >
                  {cat.name}
                </Link>
              ))}
              <Link
                href="/categories"
                className="px-3 py-1.5 rounded-full bg-red-600/10 border border-red-600/20 text-xs text-red-400 hover:text-red-300 hover:bg-red-600/20 hover:border-red-600/40 transition-all font-medium"
              >
                All Categories →
              </Link>
            </div>
          </nav>
        )}

        {/* ── Adsterra Banner ─────────────────────────────────────────────
             Leaderboard 728×90 — desktop & tablet
             Mobile Banner 320×50 — mobile only
             Placed above the video grid for maximum viewability.
        ─────────────────────────────────────────────────────────────── */}
        {/* Leaderboard 728x90: hidden on mobile, shown on md+ */}
        <AdsterraBanner
          adKey="361158242f9f7ba4b97dddf961d303d6"
          width={728}
          height={90}
          className="hidden md:flex my-2"
        />
        {/* Mobile Banner 320x50: shown only on mobile */}
        <AdsterraBanner
          adKey="1657e4fb76c1445cfbb411b5b0a859ee"
          width={320}
          height={50}
          className="flex md:hidden my-2"
        />

        {/* Grid Video Container */}
        <VideoGrid
          videos={videos}
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
