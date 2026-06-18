import { EpornerAPI } from "@/lib/api/eporner";
import { VideoGrid } from "@/components/video/VideoGrid";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

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

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 space-y-6">
      <div className="border-b border-white/5 pb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Search className="h-5 w-5 text-red-500" />
          {query !== "all" 
            ? `Search Results for: "${query}"` 
            : "Explore Videos"
          }
        </h2>
        <p className="text-xs text-muted-foreground mt-1 font-mono">{res?.total_count?.toLocaleString("en-US") || 0} videos found</p>
      </div>

      <VideoGrid videos={videos} />

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
