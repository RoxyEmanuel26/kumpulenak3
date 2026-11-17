/**
 * app/(user)/results/loading.tsx
 *
 * Next.js Suspense streaming skeleton scoped specifically to /results search pages.
 * Keeping loading.tsx out of app/(user)/ ensures routes that call notFound() or
 * permanentRedirect() (/watch/[id], /watch, /category/[slug]) emit real HTTP 404
 * and 308 status headers instead of streaming HTTP 200 with injected `noindex` tags.
 */

export default function Loading() {
  return (
    <div className="px-4 py-3 space-y-6 animate-pulse" aria-busy="true" aria-label="Loading content">

      {/* Category pill skeletons */}
      <div className="pb-2 border-b border-white/5">
        <div className="h-3 w-32 bg-white/10 rounded mb-3" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-7 bg-white/8 rounded-full" style={{ width: `${60 + (i % 4) * 18}px` }} />
          ))}
        </div>
      </div>

      {/* Ad placeholder */}
      <div className="h-[50px] lg:h-[90px] w-full bg-white/5 rounded-lg" />

      {/* Video grid skeleton — matches the actual VideoGrid layout */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="space-y-2">
            {/* Thumbnail placeholder — 16:9 aspect ratio */}
            <div className="w-full aspect-video bg-white/8 rounded-lg" />
            {/* Title placeholder */}
            <div className="h-3 bg-white/10 rounded w-full" />
            <div className="h-3 bg-white/6 rounded w-2/3" />
            {/* Meta placeholder */}
            <div className="h-2.5 bg-white/5 rounded w-1/2" />
          </div>
        ))}
      </div>

    </div>
  );
}
