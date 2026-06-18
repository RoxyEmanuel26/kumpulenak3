"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Home, Compass, LayoutGrid, Flame, PlaySquare } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const navItems = [
    { label: "Home", href: "/", icon: Home },
    { label: "Trending", href: "/results?order=top-weekly", icon: Compass },
    { label: "Categories", href: "/categories", icon: LayoutGrid },
    { label: "Popular", href: "/results?order=most-popular", icon: Flame },
    { label: "Library", href: "/library", icon: PlaySquare },
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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 h-[calc(3.5rem+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] bg-[#0F0F0F]/95 border-t border-white/5 backdrop-blur-md flex items-center justify-around md:hidden px-2 shadow-[0_-8px_24px_rgba(0,0,0,0.4)]">
      {navItems.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center justify-center flex-grow py-1.5 transition-all duration-200 cursor-pointer group relative ${
              active 
                ? "text-red-500 font-bold" 
                : "text-[#AAAAAA] hover:text-white"
            }`}
          >
            <item.icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110 group-active:scale-90" />
            <span className="text-[9px] font-medium tracking-tight mt-1 transition-colors duration-200">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
