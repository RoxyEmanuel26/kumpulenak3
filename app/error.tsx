"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Home, Grid } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected runtime errors without crashing the server or leaking sensitive info
    console.error("[Application ErrorBoundary caught error]:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-[#121212] border border-white/10 rounded-2xl p-8 text-center shadow-2xl space-y-6">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto text-red-500">
          <AlertCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white tracking-tight">Terjadi Masalah Teknis</h2>
          <p className="text-sm text-neutral-400">
            Maaf, kami mengalami kendala saat memuat halaman ini. Silakan coba memuat ulang atau jelajahi kategori lainnya.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors duration-200 shadow-lg shadow-red-600/20 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Coba Lagi
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-semibold border border-white/10 transition-colors duration-200"
          >
            <Home className="w-4 h-4" />
            Beranda
          </Link>
        </div>

        <div className="border-t border-white/5 pt-4">
          <Link
            href="/categories"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
          >
            <Grid className="w-3.5 h-3.5" />
            Jelajahi Semua Kategori
          </Link>
        </div>
      </div>
    </div>
  );
}
