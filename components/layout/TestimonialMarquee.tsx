"use client";

import { Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Testimonial {
  id: number;
  name: string;
  role: string;
  text: string;
  rating: number;
}

export function TestimonialMarquee() {
  const testimonials: Testimonial[] = [
    {
      id: 1,
      name: "Andi Wijaya",
      role: "Administrator Channel Telegram",
      text: "Sangat membantu otomasi grup saya. Fitur smart routing filter pertagnya berjalan mulus!",
      rating: 5,
    },
    {
      id: 2,
      name: "Sarah Amanda",
      role: "Webmaster Dewasa",
      text: "Sinkronisasi otomatis video Eporner lewat BullMQ sangat andal. Server hampir tidak pernah overload.",
      rating: 5,
    },
    {
      id: 3,
      name: "Rian Hidayat",
      role: "Pecinta Media",
      text: "Desain UI premium gelapnya sangat menakjubkan. Loading thumbnail cepat dan pemutar videonya lancar.",
      rating: 4,
    },
    {
      id: 4,
      name: "Budi Santoso",
      role: "Operator Multi-Bot",
      text: "Fitur multi-bot Telegram memudahkan saya membagi beban pengiriman notifikasi ke 10 channel sekaligus.",
      rating: 5,
    },
    {
      id: 5,
      name: "Denny Pradipta",
      role: "SEO Specialist",
      text: "Auto sitemap dan Gemini AI description Generator membuat indeks Google website kami melejit dalam seminggu.",
      rating: 5,
    },
  ];

  // Duplicate the list to create a seamless infinite scrolling effect
  const doubleTestimonials = [...testimonials, ...testimonials];

  return (
    <section className="py-20 bg-[#0c0c0c] border-y border-white/5 overflow-hidden relative">
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: flex;
          width: max-content;
          animation: marquee 35s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="container mx-auto px-4 mb-10 text-center">
        <span className="text-xs font-mono font-bold tracking-widest text-primary uppercase bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
          ULASAN PENGGUNA
        </span>
        <h2 className="text-2xl md:text-3xl font-extrabold text-white mt-3">
          Apa Kata Pengelola & Pengunjung Website?
        </h2>
      </div>

      {/* Marquee Wrapper */}
      <div className="relative w-full flex items-center">
        {/* Left Overlay gradient */}
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#0c0c0c] to-transparent z-10 pointer-events-none" />
        
        {/* Infinite Moving Row */}
        <div className="animate-marquee gap-6">
          {doubleTestimonials.map((item, index) => (
            <div 
              key={`${item.id}-${index}`} 
              className="w-[300px] sm:w-[350px] shrink-0"
            >
              <Card className="glass-card bg-card/25 border-white/5 hover:border-primary/25 hover:bg-card/40 transition-all duration-300 shadow-premium h-full flex flex-col justify-between">
                <CardContent className="p-6 space-y-4">
                  {/* Rating stars */}
                  <div className="flex gap-1">
                    {Array.from({ length: item.rating }).map((_, i) => (
                      <Star key={i} className="h-4.5 w-4.5 text-yellow-500 fill-current" />
                    ))}
                    {Array.from({ length: 5 - item.rating }).map((_, i) => (
                      <Star key={i} className="h-4.5 w-4.5 text-muted-foreground/35" />
                    ))}
                  </div>

                  {/* Feedback Text */}
                  <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed text-left italic">
                    "{item.text}"
                  </p>

                  {/* Profile info */}
                  <div className="flex items-center gap-3 pt-3 border-t border-white/5">
                    <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-xs uppercase font-mono border border-primary/25 shrink-0">
                      {item.name.slice(0, 2)}
                    </div>
                    <div className="text-left min-w-0">
                      <div className="text-xs font-bold text-white truncate">{item.name}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{item.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* Right Overlay gradient */}
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#0c0c0c] to-transparent z-10 pointer-events-none" />
      </div>
    </section>
  );
}
