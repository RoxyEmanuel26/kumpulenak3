import Link from "next/link";
import { Home, LayoutGrid, Search, Film } from "lucide-react";
import { TIER1_CATEGORIES } from "@/lib/category-config";

export default function NotFound() {
  const popularCategories = TIER1_CATEGORIES.slice(0, 8);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16 text-center text-white">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Visual Badge */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-600/10 border border-red-600/20 text-red-500 mb-2">
          <Film className="w-8 h-8" />
        </div>

        {/* Headings */}
        <div className="space-y-2">
          <span className="text-xs font-mono font-bold text-red-500 uppercase tracking-widest">
            Error 404
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#F1F1F1] tracking-tight font-heading">
            Page Not Found
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
            The video or page you are looking for may have been removed, had its name changed, or is temporarily unavailable.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-semibold transition-all shadow-lg shadow-red-600/20 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Go to Homepage</span>
          </Link>
          <Link
            href="/categories"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#272727] hover:bg-[#3F3F3F] text-white text-xs sm:text-sm font-semibold border border-white/10 transition-colors cursor-pointer"
          >
            <LayoutGrid className="w-4 h-4 text-red-500" />
            <span>Browse Categories</span>
          </Link>
        </div>

        {/* Search Suggestion Form */}
        <form
          action="/results"
          method="GET"
          className="relative max-w-md mx-auto pt-4"
        >
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              name="search_query"
              placeholder="Search for videos or models..."
              className="w-full bg-[#161616] border border-white/10 focus:border-red-600/50 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-muted-foreground outline-none transition-all"
            />
          </div>
        </form>

        {/* Popular Categories Links */}
        <div className="pt-6 border-t border-white/5 space-y-3">
          <h2 className="text-xs font-bold text-muted-foreground font-mono uppercase tracking-wider">
            Explore Popular Categories
          </h2>
          <div className="flex flex-wrap justify-center gap-2">
            {popularCategories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/category/${cat.slug}`}
                className="px-3 py-1.5 rounded-full bg-[#1F1F1F] border border-white/10 text-xs text-[#CCCCCC] hover:text-white hover:bg-[#2A2A2A] hover:border-red-600/40 transition-all font-medium"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
