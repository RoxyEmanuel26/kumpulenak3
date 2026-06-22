"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Hash } from "lucide-react";
import { TIER1_SLUGS } from "@/lib/category-config";
import { slugify } from "@/lib/utils";

interface CategoryItem {
  name: string;
  imageId: string;
  count: number;
}

interface CategoriesClientProps {
  categories: CategoryItem[];
}

export function CategoriesClient({ categories }: CategoriesClientProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /**
   * Returns the appropriate href for a category:
   * - Tier-1 categories → /category/{slug}  (real SEO page)
   * - All others        → /results?search_query={name}  (search fallback)
   */
  const getCategoryHref = (name: string): string => {
    const slug = slugify(name);
    if (TIER1_SLUGS.has(slug)) {
      return `/category/${slug}`;
    }
    return `/results?search_query=${encodeURIComponent(name)}`;
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between items-stretch sm:items-center bg-[#161616]/40 p-3 sm:p-4 rounded-2xl border border-white/5 backdrop-blur-md">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search categories..."
            className="w-full bg-card/60 border border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/30 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white outline-none transition-all focus:bg-card/90"
          />
        </div>
        <div className="text-[10px] sm:text-xs text-muted-foreground uppercase font-mono tracking-wider self-end sm:self-auto px-2">
          {filtered.length} categories matched
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
        {filtered.map((cat) => {
          const href = getCategoryHref(cat.name);
          const isTier1 = TIER1_SLUGS.has(slugify(cat.name));

          return (
            <Link
              key={cat.name}
              href={href}
              className="group relative overflow-hidden aspect-[4/3] rounded-2xl border border-white/5 shadow-md hover:shadow-xl hover:border-white/10 transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] cursor-pointer flex flex-col justify-end p-3 sm:p-4"
            >
              {/* Background Image */}
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                style={{
                  backgroundImage: `url(https://static-sg-cdn.eporner.com/catimg/${cat.imageId}.jpg)`,
                }}
              />

              {/* Dark gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/10 group-hover:via-black/40 transition-colors duration-300" />

              {/* Tag/Category symbol (top right) */}
              <div className="absolute top-2 right-2 sm:top-3 sm:right-3 p-1 sm:p-1.5 bg-black/40 rounded-lg backdrop-blur-md border border-white/10 z-10">
                <Hash className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white/80" />
              </div>

              {/* Tier-1 badge — subtle indicator that this has a real page */}
              {isTier1 && (
                <div className="absolute top-2 left-2 sm:top-3 sm:left-3 px-1.5 py-0.5 bg-red-600/80 rounded text-[7px] font-bold text-white uppercase tracking-wide z-10 backdrop-blur-sm">
                  HD
                </div>
              )}

              {/* Name and Count */}
              <div className="relative z-10 text-left">
                <h3 className="font-extrabold text-xs sm:text-sm md:text-base text-white tracking-tight leading-tight group-hover:underline line-clamp-2">
                  {cat.name}
                </h3>
                <p className="text-[8px] sm:text-[9px] md:text-[10px] text-white/60 font-mono font-semibold mt-1">
                  {cat.count > 0 ? `${cat.count} videos synced` : "Explore videos"}
                </p>
              </div>
            </Link>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full py-16 text-center text-muted-foreground text-xs font-mono uppercase tracking-widest bg-card/25 rounded-2xl border border-white/5">
            No categories match your search
          </div>
        )}
      </div>
    </div>
  );
}
