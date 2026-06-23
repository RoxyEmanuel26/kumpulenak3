"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { useUI } from "./UIContext";
import {
  Home, 
  Flame, 
  Clock, 
  ThumbsUp, 
  Compass, 
  PlaySquare,
  LayoutGrid
} from "lucide-react";
import { trackEvent } from "@/lib/analytics";


export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isSidebarCollapsed, isMobileMenuOpen, setMobileMenuOpen } = useUI();

  const primaryItems = [
    { label: "New", href: "/", icon: Home },
    { label: "Categories", href: "/categories", icon: LayoutGrid },
    { label: "Top Weekly", href: "/results?order=top-weekly", icon: Flame },
    { label: "Top Monthly", href: "/results?order=top-monthly", icon: Compass },
    { label: "Most Popular", href: "/results?order=most-popular", icon: ThumbsUp },
  ];

  const personalItems = [
    { label: "History", href: "/library?tab=history", icon: Clock },
    { label: "Liked Videos", href: "/library?tab=likes", icon: PlaySquare },
  ];

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    if (href.includes("?")) {
      return searchParams.toString().includes(href.split("?")[1]);
    }
    return pathname.startsWith(href);
  };

  // Render items for collapsed desktop mode (72px)
  if (isSidebarCollapsed) {
    return (
      <aside className="fixed top-14 left-0 bottom-0 z-40 w-[72px] bg-[#0F0F0F] hidden md:flex flex-col items-center py-4 border-r border-white/5 overflow-y-auto no-scrollbar">
        {primaryItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center w-[64px] h-[72px] rounded-xl transition-all mb-1 cursor-pointer group ${
                active 
                  ? "bg-white/10 text-white font-semibold" 
                  : "text-[#AAAAAA] hover:bg-white/5 hover:text-white"
              }`}
              title={item.label}
            >
              <item.icon className="h-5 w-5 mb-1.5 transition-transform group-hover:scale-110" />
              <span className="text-[9px] tracking-wide select-none">{item.label}</span>
            </Link>
          );
        })}
      </aside>
    );
  }

  // Common item renderer
  const renderItem = (item: { label: string; href: string; icon: React.ComponentType<{ className?: string }> }) => {
    const active = isActive(item.href);
    return (
      <Link
        key={item.label}
        href={item.href}
        onClick={() => setMobileMenuOpen(false)}
        className={`flex items-center gap-6 px-4 py-2.5 rounded-xl transition-all cursor-pointer group ${
          active 
            ? "bg-white/10 text-white font-semibold" 
            : "text-[#AAAAAA] hover:bg-white/5 hover:text-white"
        }`}
      >
        <item.icon className="h-5 w-5 transition-transform group-hover:scale-105 shrink-0" />
        <span className="text-sm select-none truncate">{item.label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Desktop Sidebar (240px) */}
      <aside className="fixed top-14 left-0 bottom-0 z-40 w-60 bg-[#0F0F0F] hidden md:flex flex-col py-4 border-r border-white/5 overflow-y-auto no-scrollbar">
        {/* Primary section */}
        <div className="px-2 pb-4 border-b border-white/5 space-y-0.5">
          {primaryItems.map(renderItem)}
        </div>

        {/* ── Top Categories section ───────────────────────────────
             5 hardcoded Tier-1 categories — gives site-wide direct
             pathway to category pages on every page for crawlers and users.
             Text-only links (no icons) to keep sidebar compact.
        */}
        <div className="px-2 py-4 border-b border-white/5">
          <h4 className="px-4 text-[11px] font-bold text-[#AAAAAA] uppercase tracking-wider mb-2 font-mono">Top Categories</h4>
          {[
            { label: "Japanese", href: "/category/japanese", slug: "japanese" },
            { label: "MILF", href: "/category/milf", slug: "milf" },
            { label: "Lesbian", href: "/category/lesbian", slug: "lesbian" },
            { label: "Amateur", href: "/category/amateur", slug: "amateur" },
            { label: "Asian", href: "/category/asian", slug: "asian" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => trackEvent("sidebar_cat_click", { category: item.slug })}
              className="flex items-center px-4 py-2 rounded-xl text-sm text-[#AAAAAA] hover:bg-white/5 hover:text-white transition-all cursor-pointer"
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Personal section */}
        <div className="px-2 py-4 border-b border-white/5 space-y-0.5">
          <h4 className="px-4 text-[11px] font-bold text-[#AAAAAA] uppercase tracking-wider mb-2 font-mono">Library</h4>
          {personalItems.map(renderItem)}
        </div>

        {/* Footer */}
        <div className="p-6 text-[10px] text-muted-foreground/60 leading-relaxed mt-auto space-y-2">
          <div className="flex flex-wrap gap-x-2 gap-y-1">
            <Link href="/about" className="hover:underline">About</Link>
            <span>•</span>
            <Link href="/privacy" className="hover:underline">Privacy</Link>
            <span>•</span>
            <Link href="/terms" className="hover:underline">Terms</Link>
            <span>•</span>
            <Link href="/dmca" className="hover:underline">DMCA</Link>
            <span>•</span>
            <Link href="/compliance" className="hover:underline">2257 Compliance</Link>
          </div>
          <p>© 2026 LustHub</p>
        </div>
      </aside>

      {/* Mobile Drawer (Overlay sliding panel) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-200">
          {/* Backdrop */}
          <div 
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs cursor-default" 
          />

          {/* Drawer Panel */}
          <aside className="relative w-64 bg-[#0F0F0F] h-full flex flex-col py-4 shadow-2xl border-r border-white/5 overflow-y-auto no-scrollbar animate-in slide-in-from-left duration-200">
            {/* Header branding in drawer */}
            <div className="px-6 pb-6 border-b border-white/5 flex items-center gap-2">
              <Image 
                src="/logo.webp" 
                alt="LustHub Logo" 
                width={28} 
                height={28} 
                className="rounded-md object-contain"
              />
              <span className="font-extrabold tracking-tight bg-gradient-to-r from-red-600 to-purple-500 bg-clip-text text-transparent text-lg font-heading">
                LustHub
              </span>
            </div>

            <div className="px-2 py-4 space-y-0.5">
              {primaryItems.map(renderItem)}
            </div>

            {/* Top Categories — mobile drawer */}
            <div className="px-2 py-4 border-t border-white/5">
              <h4 className="px-4 text-[10px] font-bold text-[#AAAAAA] uppercase tracking-wider mb-2 font-mono">Top Categories</h4>
              {[
                { label: "Japanese", href: "/category/japanese", slug: "japanese" },
                { label: "MILF", href: "/category/milf", slug: "milf" },
                { label: "Lesbian", href: "/category/lesbian", slug: "lesbian" },
                { label: "Amateur", href: "/category/amateur", slug: "amateur" },
                { label: "Asian", href: "/category/asian", slug: "asian" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    trackEvent("sidebar_cat_click", { category: item.slug });
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center px-4 py-2 rounded-xl text-sm text-[#AAAAAA] hover:bg-white/5 hover:text-white transition-all cursor-pointer"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="px-2 py-4 border-t border-white/5 space-y-0.5">
              <h4 className="px-4 text-[10px] font-bold text-[#AAAAAA] uppercase tracking-wider mb-2 font-mono">Library</h4>
              {personalItems.map(renderItem)}
            </div>

            <div className="p-6 text-[10px] text-muted-foreground/50 mt-auto space-y-2">
              <div className="flex flex-wrap gap-x-2 gap-y-1">
                <Link href="/about" className="hover:underline">About</Link>
                <span>•</span>
                <Link href="/privacy" className="hover:underline">Privacy</Link>
                <span>•</span>
                <Link href="/terms" className="hover:underline">Terms</Link>
                <span>•</span>
                <Link href="/dmca" className="hover:underline">DMCA</Link>
                <span>•</span>
                <Link href="/compliance" className="hover:underline">2257 Compliance</Link>
              </div>
              <p>© 2026 LustHub</p>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
