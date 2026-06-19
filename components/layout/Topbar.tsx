"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUI } from "./UIContext";
import { Menu, Search, ArrowLeft } from "lucide-react";

export function Topbar() {
  const router = useRouter();
  const { toggleSidebar, toggleMobileMenu } = useUI();
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/results?search_query=${encodeURIComponent(searchQuery)}`);
      setShowMobileSearch(false);
    }
  };

  if (showMobileSearch) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-[#0F0F0F] border-b border-white/5 flex items-center px-4 gap-3">
        <button
          onClick={() => setShowMobileSearch(false)}
          className="p-2.5 text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <form onSubmit={handleSearchSubmit} className="flex flex-1 items-center">
          <div className="flex flex-grow bg-[#121212] border border-[#303030] focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 rounded-full overflow-hidden transition-all h-9">
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search videos, categories, tags..."
              className="flex-grow bg-transparent border-0 outline-none px-4 text-sm text-[#F1F1F1] placeholder-muted-foreground focus:ring-0"
            />
            <button
              type="submit"
              className="bg-[#222222] border-l border-[#303030] px-4 text-[#AAAAAA] hover:text-white hover:bg-[#303030] transition-colors cursor-pointer flex items-center justify-center"
              aria-label="Submit Search"
            >
              <Search className="h-4.5 w-4.5" />
            </button>
          </div>
        </form>
      </header>
    );
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-[#0F0F0F] border-b border-white/5 flex items-center justify-between px-4">
      {/* Left section: Hamburger & Logo */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => {
            // Check viewport size
            if (window.innerWidth < 768) {
              toggleMobileMenu();
            } else {
              toggleSidebar();
            }
          }}
          className="p-2.5 text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          aria-label="Toggle Sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        
        <Link href="/" className="flex items-center space-x-1 select-none">
          <span className="font-extrabold tracking-tight bg-gradient-to-r from-red-600 to-purple-500 bg-clip-text text-transparent text-lg md:text-xl font-heading">
            KumpulEnak
          </span>
          <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse self-end mb-1"></span>
        </Link>
      </div>

      {/* Middle section: Search bar */}
      <form 
        onSubmit={handleSearchSubmit} 
        className="hidden sm:flex flex-1 max-w-[600px] items-center gap-3 mx-4"
      >
        <div className="flex flex-grow bg-[#121212] border border-[#303030] focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 rounded-full overflow-hidden transition-all h-9">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search videos, categories, tags..."
            className="flex-grow bg-transparent border-0 outline-none px-4 text-sm text-[#F1F1F1] placeholder-muted-foreground focus:ring-0"
          />
          <button
            type="submit"
            className="bg-[#222222] border-l border-[#303030] px-6 text-[#AAAAAA] hover:text-white hover:bg-[#303030] transition-colors cursor-pointer"
            aria-label="Submit Search"
          >
            <Search className="h-4.5 w-4.5" />
          </button>
        </div>

      </form>

      {/* Right section: Actions */}
      <div className="flex items-center gap-2">
        <button
          className="p-2.5 text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer sm:hidden"
          onClick={() => setShowMobileSearch(true)}
          aria-label="Search Mobile"
        >
          <Search className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
