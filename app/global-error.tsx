"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Global ErrorBoundary caught error]:", error);
  }, [error]);

  return (
    <html lang="id">
      <body className="bg-[#0a0a0a] text-white min-h-screen flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-[#141414] border border-white/10 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto text-red-500 font-bold text-2xl">
            !
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">LustHub — Kendala Server</h1>
            <p className="text-sm text-neutral-400">
              Terjadi kendala sistem sementara pada server. Silakan muat ulang halaman.
            </p>
          </div>
          <button
            onClick={() => reset()}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
          >
            Muat Ulang Halaman
          </button>
        </div>
      </body>
    </html>
  );
}
