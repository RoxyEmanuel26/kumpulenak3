import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-sans",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

import Link from "next/link";
import { cookies } from "next/headers";
import { CustomCursor } from "@/components/ui/cursor";
import { ScrollProgress } from "@/components/layout/ScrollProgress";

export const metadata: Metadata = {
  title: "KumpulEnak - Eporner Video Aggregator & Telegram Bot",
  description: "Website aggregator video dewasa tercepat, tonton video berkualitas tinggi secara instan dan dapatkan notifikasi otomatis di Telegram.",
  openGraph: {
    title: "KumpulEnak - Premium Video Aggregator",
    description: "Website aggregator video dewasa tercepat, tonton video berkualitas tinggi secara instan.",
    type: "website",
    locale: "id_ID",
  },
  twitter: {
    card: "summary_large_image",
    title: "KumpulEnak - Premium Video Aggregator",
  }
};


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const isAdmin = cookieStore.has("admin_session");

  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable} min-h-screen bg-background text-foreground antialiased font-sans`}>
        <CustomCursor />
        <ScrollProgress />
        <div className="flex flex-col min-h-screen">
          <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/70 backdrop-blur-md">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
              <div className="flex items-center gap-6">
                <Link className="flex items-center space-x-2 group" href="/">
                  <span className="font-extrabold tracking-tight bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent text-lg sm:text-xl">
                    KumpulEnak
                  </span>
                </Link>
                <nav className="flex items-center space-x-4 text-xs sm:text-sm font-medium">
                  <Link className="transition-colors hover:text-primary text-foreground/80" href="/">Home</Link>
                </nav>
              </div>
              <div className="flex items-center gap-3">
                {isAdmin && (
                  <Link 
                    href="/admin" 
                    className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 transition-all text-white"
                  >
                    Admin Panel
                  </Link>
                )}
              </div>
            </div>
          </header>
          <div className="flex-1">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
