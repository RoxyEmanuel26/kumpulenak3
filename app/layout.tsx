import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { UIProvider } from "../components/layout/UIContext";

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

export const metadata: Metadata = {
  title: "KumpulEnak - Premium Video Platform",
  description: "The fastest premium video platform, watch high-quality videos instantly.",
  openGraph: {
    title: "KumpulEnak - Premium Video Platform",
    description: "The fastest premium video platform, watch high-quality videos instantly.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "KumpulEnak - Premium Video Platform",
  }
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
      <body className={`${inter.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable} min-h-screen bg-[#0F0F0F] text-[#F1F1F1] antialiased font-sans`}>
        <UIProvider>
          {children}
        </UIProvider>
      </body>
    </html>
  );
}
