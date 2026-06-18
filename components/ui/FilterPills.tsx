"use client";

import { useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface FilterPillsProps {
  categories: string[];
  activeCategory: string;
}

export function FilterPills({ categories, activeCategory }: FilterPillsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);

  const handleCategoryChange = (category: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (category === "all") {
      params.delete("category");
    } else {
      params.set("category", category);
    }
    params.set("page", "1"); // Reset page pagination
    router.push(`/?${params.toString()}`, { scroll: false });
  };

  const scroll = (direction: "left" | "right") => {
    if (containerRef.current) {
      const scrollAmount = 200;
      containerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="relative w-full flex items-center bg-[#0F0F0F] py-3.5 z-10">
      {/* Left scroll indicator arrow */}
      <button
        onClick={() => scroll("left")}
        className="p-1.5 bg-[#1F1F1F] hover:bg-[#272727] text-white rounded-full transition-colors mr-2 shrink-0 cursor-pointer hidden sm:block border border-white/5"
        aria-label="Scroll Left"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {/* Categories container */}
      <div
        ref={containerRef}
        className="flex gap-2 overflow-x-auto no-scrollbar scroll-smooth flex-grow py-1 select-none"
      >
        <button
          onClick={() => handleCategoryChange("all")}
          className={`text-xs sm:text-sm font-medium px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 border ${
            activeCategory === "all"
              ? "bg-[#F1F1F1] text-black border-white"
              : "bg-[#272727] text-white border-transparent hover:bg-[#3F3F3F]"
          }`}
        >
          All
        </button>

        {categories.map((cat) => {
          const isActive = activeCategory.toLowerCase() === cat.toLowerCase();
          return (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`text-xs sm:text-sm font-medium px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 border ${
                isActive
                  ? "bg-[#F1F1F1] text-black border-white"
                  : "bg-[#272727] text-white border-transparent hover:bg-[#3F3F3F]"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Right scroll indicator arrow */}
      <button
        onClick={() => scroll("right")}
        className="p-1.5 bg-[#1F1F1F] hover:bg-[#272727] text-white rounded-full transition-colors ml-2 shrink-0 cursor-pointer hidden sm:block border border-white/5"
        aria-label="Scroll Right"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
