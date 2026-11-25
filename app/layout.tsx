import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { UIProvider } from "../components/layout/UIContext";
import { AdsterraSitewide } from "../components/ads/AdsterraSitewide";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
  weight: ["600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://www.lusthub.web.id"),
  title: {
    default: "LustHub — Free HD Porn Videos",
    template: "%s — LustHub",
  },
  description: "LustHub is a fast, free, and modern HD porn video platform. Watch thousands of premium adult videos instantly in high quality.",
  openGraph: {
    title: "LustHub — Free HD Porn Videos",
    description: "LustHub is a fast, free, and modern HD porn video platform. Watch thousands of premium adult videos instantly in high quality.",
    type: "website",
    locale: "en_US",
    alternateLocale: ["en_GB", "de_DE", "fr_FR", "es_ES", "ja_JP", "ko_KR", "id_ID"],
    siteName: "LustHub",
    url: process.env.NEXT_PUBLIC_APP_URL || "https://www.lusthub.web.id",
    images: [
      {
        url: "/logo.webp",
        width: 512,
        height: 512,
        alt: "LustHub — Free HD Porn Videos",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LustHub — Free HD Porn Videos",
    description: "Watch thousands of premium adult videos instantly in high quality on LustHub.",
    images: ["/logo.webp"],
  },
  verification: {
    google: "G71CC4n1uaSgqVnjIvv3JSKs78kXb2lYNn_yJXiEb7Q",
  },
  other: {
    rating: "RTA-5042-1996-1400-1577-RTA",
  },
  icons: {
    icon: "/favicon.webp",
    shortcut: "/favicon.webp",
    apple: "/favicon.webp",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://www.eporner.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.eporner.com" />
      </head>
      <body className={`${inter.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable} min-h-screen bg-[#0F0F0F] text-[#F1F1F1] antialiased font-sans`}>
        <UIProvider>
          {children}
        </UIProvider>

        {/* ── Adsterra Sitewide Ads ──────────────────────────────────────────
            Loads Popunder + Social Bar once per session across all pages.
            strategy="afterInteractive" ensures LCP is never blocked.
        ─────────────────────────────────────────────────────────────────── */}
        <AdsterraSitewide />

        {/*
          ── Plausible Analytics ────────────────────────────────────────────
          Privacy-first, cookieless analytics.
          - strategy="afterInteractive" → loads after LCP, never blocks paint
          - SPA navigation is tracked automatically (Next.js pushState aware)
          - No cookies, no PII, no consent banner required
          - To activate: sign up at plausible.io and add lusthub.web.id
          ─────────────────────────────────────────────────────────────────── */}
        <Script
          src="https://plausible.io/js/script.js"
          data-domain="lusthub.web.id"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
