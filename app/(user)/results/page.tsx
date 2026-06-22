import { EpornerAPI } from "@/lib/api/eporner";
import { VideoGrid } from "@/components/video/VideoGrid";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Metadata } from "next";
import { TIER1_CATEGORIES } from "@/lib/category-config";
import { slugify } from "@/lib/utils";
import { AdsterraBanner } from "@/components/ads/AdsterraBanner";


export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ search_query?: string; order?: string }>;
}): Promise<Metadata> {
  const resolved = await searchParams;
  const query = resolved.search_query;
  const order = resolved.order;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://lusthub.web.id";

  if (query && query !== "all") {
    const title = `"${query}" Porn Videos \u2014 LustHub`;
    const description = `Watch free HD porn videos for "${query}" on LustHub. Thousands of results updated daily. No registration required.`;
    const canonicalUrl = `${baseUrl}/results?search_query=${encodeURIComponent(query)}`;
    return {
      title,
      description,
      alternates: { canonical: canonicalUrl },
      openGraph: {
        title,
        description,
        type: "website",
        url: canonicalUrl,
        siteName: "LustHub",
        images: [{ url: `${baseUrl}/opengraph-image`, width: 1200, height: 630, alt: "LustHub" }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [`${baseUrl}/opengraph-image`],
      },
    };
  }

  const orderLabels: Record<string, string> = {
    "top-weekly": "Top Trending This Week",
    "top-monthly": "Top Trending This Month",
    "most-popular": "Most Popular",
    "longest": "Longest Videos",
    "shortest": "Shortest Videos",
  };

  const label = (order && orderLabels[order]) || "Latest Videos";
  const title = `${label} \u2014 LustHub`;
  const description = `${label} — Browse free HD porn videos on LustHub, updated daily. No registration required.`;
  const canonicalUrl = order
    ? `${baseUrl}/results?order=${encodeURIComponent(order)}`
    : `${baseUrl}/results`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonicalUrl,
      siteName: "LustHub",
      images: [{ url: `${baseUrl}/opengraph-image`, width: 1200, height: 630, alt: "LustHub" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${baseUrl}/opengraph-image`],
    },
  };
}



export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ 
    search_query?: string; 
    page?: string; 
    order?: string;
  }>;
}) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams.search_query || "all";
  const page = parseInt(resolvedSearchParams.page || "1");
  const order = (resolvedSearchParams.order as "latest" | "top-weekly" | "top-monthly" | "most-popular" | "longest" | "shortest") || "latest";
  const per_page = 30;

  const res = await EpornerAPI.search({
    query,
    page,
    per_page,
    order,
  });

  const videos = res?.videos || [];
  const totalPages = res?.total_pages || 1;

  // Helper to build page URL
  const getPageUrl = (targetPage: number) => {
    const params = new URLSearchParams();
    if (query !== "all") params.set("search_query", query);
    if (order !== "latest") params.set("order", order);
    params.set("page", targetPage.toString());
    return `/results?${params.toString()}`;
  };

  // ── Related categories for this search query ──────────────────────────────────────
  // Pure server-side computation — no API call.
  // Only shown when query is a real search term (not 'all' or order-only pages).
  const relatedCats = query !== "all"
    ? TIER1_CATEGORIES.filter((cat) => {
        const qLower = query.toLowerCase();
        const qSlug = slugify(query);
        return (
          cat.name.toLowerCase().includes(qLower) ||
          cat.slug.includes(qSlug) ||
          qLower.includes(cat.name.toLowerCase()) ||
          qSlug.includes(cat.slug)
        );
      }).slice(0, 4)
    : [];

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 space-y-6">
      <div className="border-b border-white/5 pb-4">
        {/* H1 — heading hierarchy fix: was h2, now h1 */}
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Search className="h-5 w-5 text-red-500" />
          {query !== "all"
            ? `Search Results for: "${query}"`
            : "Explore Videos"
          }
        </h1>
        <p className="text-xs text-muted-foreground mt-1 font-mono">{res?.total_count?.toLocaleString("en-US") || 0} videos found</p>
      </div>

      {/* ── Related Categories row ─────────────────────────────────────────
           Only shown when the search query overlaps with a Tier-1 category.
           Transforms search dead-ends into category discovery funnels.
           Authority flow: /results?search_query=X → /category/{slug}
      */}
      {relatedCats.length > 0 && (
        <nav aria-label="Related categories" className="flex flex-wrap items-center gap-2 pt-1 pb-3 border-b border-white/5">
          <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest shrink-0">
            Categories:
          </span>
          {relatedCats.map((cat) => (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              className="px-3 py-1.5 rounded-full bg-[#1F1F1F] border border-white/10 text-xs text-[#CCCCCC] hover:text-white hover:bg-[#2A2A2A] hover:border-red-600/40 transition-all font-medium"
            >
              {cat.name}
            </Link>
          ))}
        </nav>
      )}

      <VideoGrid videos={videos} />

      {/* ── Adsterra Banner ──────────────────────────────────────
           Placed after VideoGrid for mid-page viewability.
           Leaderboard 728×90 — desktop & tablet
           Mobile Banner 320×50 — mobile only
      ─────────────────────────────────────────────────── */}
      <AdsterraBanner
        adKey="361158242f9f7ba4b97dddf961d303d6"
        width={728}
        height={90}
        className="hidden md:flex my-2"
      />
      <AdsterraBanner
        adKey="1657e4fb76c1445cfbb411b5b0a859ee"
        width={320}
        height={50}
        className="flex md:hidden my-2"
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
            Page <span className="text-white font-bold">{page}</span> of <span className="text-white font-bold">{totalPages}</span>
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
  );
}
