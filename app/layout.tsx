import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

import Link from "next/link";

export const metadata: Metadata = {
  title: "Eporner Video Aggregator",
  description: "A fast, modern video aggregator and Telegram broadcaster.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-background text-foreground antialiased`}>
        <div className="flex flex-col min-h-screen">
          <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto flex h-14 items-center px-4">
              <div className="mr-4 hidden md:flex">
                <Link className="mr-6 flex items-center space-x-2" href="/">
                  <span className="hidden font-bold sm:inline-block">
                    Eporner Aggregator
                  </span>
                </Link>
                <nav className="flex items-center space-x-6 text-sm font-medium">
                  <Link className="transition-colors hover:text-foreground/80 text-foreground/60" href="/">Home</Link>
                </nav>

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
