import { EpornerAPI } from "@/lib/api/eporner";
import { VideoGrid } from "@/components/video/VideoGrid";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

  return (
    <div className="px-4 py-3 space-y-6">
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
