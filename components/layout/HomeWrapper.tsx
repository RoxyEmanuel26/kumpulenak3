"use client";

import { useState } from "react";
import { Search, ChevronLeft, ChevronRight, Play, ArrowDown } from "lucide-react";
import { VideoGrid } from "../video/VideoGrid";
import { VideoModal } from "../video/VideoModal";
import { TestimonialMarquee } from "./TestimonialMarquee";
import { ContactForm } from "./ContactForm";
import Link from "next/link";

interface TagItem {
  tag: {
    id: string;
    name: string;
  };
}

interface Video {
  id: string;
  title: string;
  duration: string | null;
  rating: string | null;
  views: number;
  thumbnail: string | null;
  tags: TagItem[];
}

interface HomeWrapperProps {
  initialVideos: Video[];
  categories: string[];
  activeCategory: string;
  totalVideos: number;
  query: string;
  page: number;
  limit: number;
}

export function HomeWrapper({
  initialVideos,
  categories,
  activeCategory,
  totalVideos,
  query,
  page,
  limit,
}: HomeWrapperProps) {
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const totalPages = Math.ceil(totalVideos / limit);

  // Helper to build page URL
  const getPageUrl = (targetPage: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (activeCategory !== "all") params.set("category", activeCategory);
    params.set("page", targetPage.toString());
    return `/?${params.toString()}`;
  };

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      {/* Premium Background Grid / Glow */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808005_1px,transparent_1px),linear-gradient(to_bottom,#80808005_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-gradient-to-b from-primary/5 via-purple-500/5 to-transparent blur-[120px] pointer-events-none rounded-full" />

      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex flex-col items-center justify-center text-center px-4 max-w-4xl mx-auto">
        <span className="text-xs font-mono font-bold tracking-[0.3em] text-primary uppercase bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20 animate-pulse mb-6">
          PREMIUM VIDEO PORTFOLIO
        </span>
        
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-b from-white via-white/90 to-gray-500 bg-clip-text text-transparent mb-6 leading-tight select-none">
          VISUAL STORYTELLING
        </h1>
        
        <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-xl mb-10 leading-relaxed">
          Temukan katalog video terkurasi dengan kualitas tinggi secara instan. Diperbarui otomatis setiap waktu, didukung klasifikasi kecerdasan buatan.
        </p>

        {/* Search Bar */}
        <form action="/" method="GET" className="w-full max-w-2xl relative group mb-12">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-2xl blur-md opacity-40 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <div className="relative flex items-center bg-card/65 backdrop-blur-md border border-white/10 rounded-2xl p-1.5 focus-within:border-primary/50 transition-all">
            <Search className="h-5 w-5 text-muted-foreground/60 ml-4 shrink-0" />
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Cari video premium (contoh: Teen, Amateur, POV)..."
              className="w-full bg-transparent border-0 outline-none focus:ring-0 text-xs sm:text-sm px-3 text-foreground"
            />
            {activeCategory !== "all" && (
              <input type="hidden" name="category" value={activeCategory} />
            )}
            <button
              type="submit"
              className="bg-primary hover:bg-primary/95 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-colors shrink-0 cursor-pointer"
            >
              Cari
            </button>
          </div>
        </form>

        {/* Scroll down indicator */}
        <div 
          onClick={() => {
            const el = document.getElementById("gallery");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}
          className="absolute bottom-10 flex flex-col items-center gap-2 text-muted-foreground/50 hover:text-white transition-colors cursor-pointer animate-bounce"
        >
          <span className="text-[10px] font-mono tracking-widest uppercase">Lihat Portfolio</span>
          <ArrowDown className="h-4 w-4" />
        </div>
      </section>

      {/* Grid Content Gallery */}
      <section id="gallery" className="container mx-auto px-4 pb-20 relative z-10 scroll-mt-20">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-extrabold tracking-tight text-white/90">
            {query ? `Hasil Pencarian: "${query}"` : "Katalog Eksklusif"}
          </h2>
          <span className="text-xs text-muted-foreground font-mono">{totalVideos} Video ditemukan</span>
        </div>

        {/* Video Grid Component */}
        <VideoGrid 
          videos={initialVideos} 
          categories={categories}
          activeCategory={activeCategory}
          onSelectVideo={(id) => setSelectedVideoId(id)}
        />

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-16 font-semibold">
            {page > 1 ? (
              <Link 
                href={getPageUrl(page - 1)}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-card/45 hover:bg-card border border-white/5 hover:border-white/10 text-xs transition-all text-white cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Sebelumnya</span>
              </Link>
            ) : (
              <button 
                disabled
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-card/25 border border-white/5 text-xs text-muted-foreground opacity-30 cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Sebelumnya</span>
              </button>
            )}

            <span className="text-xs text-muted-foreground px-4 font-mono">
              Halaman <span className="text-white font-bold">{page}</span> dari <span className="text-white font-bold">{totalPages}</span>
            </span>

            {page < totalPages ? (
              <Link 
                href={getPageUrl(page + 1)}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-card/45 hover:bg-card border border-white/5 hover:border-white/10 text-xs transition-all text-white cursor-pointer"
              >
                <span>Selanjutnya</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <button 
                disabled
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-card/25 border border-white/5 text-xs text-muted-foreground opacity-30 cursor-not-allowed"
              >
                <span>Selanjutnya</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </section>

      {/* Portfolio Showcase Sections */}
      <TestimonialMarquee />
      
      <ContactForm />

      {/* Dynamic Detail Modal */}
      <VideoModal 
        videoId={selectedVideoId} 
        onClose={() => setSelectedVideoId(null)} 
      />

      {/* Premium Footer */}
      <Footer />
    </main>
  );
}

function Footer() {
  return (
    <footer className="bg-[#080808] border-t border-white/5 py-12 px-4 text-center text-xs text-muted-foreground relative z-10">
      <div className="container mx-auto max-w-5xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-left">
          <div className="font-extrabold text-sm text-white tracking-tight">KumpulEnak</div>
          <p className="text-[10px] text-muted-foreground mt-1">Aggregator Video Premium & Telegram Broadcaster Otomatis</p>
        </div>
        <div className="flex gap-6 text-[11px] font-medium">
          <Link href="/" className="hover:text-primary transition-colors">Beranda</Link>
          <Link href="/admin" className="hover:text-primary transition-colors">Admin Panel</Link>
          <a href="mailto:admin@kumpulenak.com" className="hover:text-primary transition-colors">Kontak</a>
        </div>
      </div>
      <div className="container mx-auto max-w-5xl border-t border-white/5 mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px]">
        <p>© 2026 KumpulEnak. Hak Cipta Dilindungi.</p>
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="text-primary hover:underline font-mono uppercase tracking-wider cursor-pointer bg-transparent border-0"
        >
          Kembali Ke Atas ↑
        </button>
      </div>
    </footer>
  );
}
