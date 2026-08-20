import { EpornerSearchResponse, EpornerVideo } from "../../types/eporner";

const BASE_URL = "https://www.eporner.com/api/v2/video";

export function repairMojibake(str: string): string {
  if (!str) return str;
  const utf8Regex = /[\u00C2-\u00DF][\u0080-\u00BF]|[\u00E0-\u00EF][\u0080-\u00BF]{2}|[\u00F0-\u00F4][\u0080-\u00BF]{3}/g;
  return str.replace(utf8Regex, (match) => {
    try {
      const bytes = new Uint8Array(match.length);
      for (let i = 0; i < match.length; i++) { bytes[i] = match.charCodeAt(i); }
      return new TextDecoder('utf-8').decode(bytes);
    } catch { return match; }
  });
}

export function decodeHtmlEntities(str: string): string {
  if (!str) return str;
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export function cleanEpornerText(str: string): string {
  if (!str) return str;
  const repaired = repairMojibake(str);
  const decoded = decodeHtmlEntities(repaired);
  return decoded.replace(/[\u200b-\u200d\u200e\u200f\ufeff]/g, '');
}

function cleanVideoData(video: EpornerVideo): EpornerVideo {
  if (!video) return video;
  return { ...video, title: cleanEpornerText(video.title), keywords: cleanEpornerText(video.keywords) };
}

// ── Two-Layer Cache ──────────────────────────────────────────────────────────
// Layer 1 (memCache): In-memory Map — zero latency, lives within Node.js process.
// Layer 2 (next.revalidate): Next.js fetch disk cache — survives Pterodactyl restarts.
//
// TTL values (intentionally generous — Eporner API calls are the #1 CPU bottleneck):
//   SEARCH_TTL = 30 minutes (was 5 min) — homepage/category videos stable for 30 min
//   VIDEO_TTL  = 6 hours    (was 1 hr)  — video metadata almost never changes
const memCache = new Map<string, { data: unknown; expires: number }>();
const MEM_CACHE_MAX = 2000;

function setCache(key: string, data: unknown, ttlSeconds: number) {
  if (memCache.size >= MEM_CACHE_MAX) {
    const now = Date.now();
    for (const [k, v] of memCache.entries()) {
      if (v.expires <= now) memCache.delete(k);
    }
    if (memCache.size >= MEM_CACHE_MAX) memCache.clear();
  }
  memCache.set(key, { data, expires: Date.now() + ttlSeconds * 1000 });
}

function getCache(key: string): unknown | null {
  const cached = memCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.data;
  if (cached) memCache.delete(key); // Eagerly evict stale entries
  return null;
}

const SEARCH_TTL = 30 * 60;     // 30 minutes
const VIDEO_TTL  = 6 * 60 * 60; // 6 hours

export const EpornerAPI = {
  async search(params: {
    query?: string;
    per_page?: number;
    page?: number;
    thumbsize?: string;
    order?: "latest" | "top-weekly" | "top-monthly" | "most-popular" | "longest" | "shortest";
    lq?: 0 | 1 | 2;
    format?: "json" | "xml";
  } = {}): Promise<EpornerSearchResponse> {
    const queryParams = new URLSearchParams({
      format: "json",
      per_page: "100",
      order: "latest",
      gay: "0",
      lq: "0",
      ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    });
    const url = `${BASE_URL}/search/?${queryParams.toString()}`;

    const memHit = getCache(url);
    if (memHit) return memHit as EpornerSearchResponse;

    // next.revalidate = Next.js disk cache, persists across Pterodactyl restarts
    const res = await fetch(url, { next: { revalidate: SEARCH_TTL } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: EpornerSearchResponse = await res.json();
    if (data && Array.isArray(data.videos)) {
      data.videos = data.videos.map(cleanVideoData);
    }
    setCache(url, data, SEARCH_TTL);
    return data;
  },

  async getById(id: string): Promise<EpornerVideo | null> {
    try {
      const queryParams = new URLSearchParams({ id, format: "json" });
      const url = `${BASE_URL}/id/?${queryParams.toString()}`;

      const memHit = getCache(url);
      if (memHit) return memHit as EpornerVideo;

      const res = await fetch(url, { next: { revalidate: VIDEO_TTL } });
      if (!res.ok) return null;
      const data = await res.json();
      const video = (data && !Array.isArray(data) && data.id) ? cleanVideoData(data) : null;
      if (video) setCache(url, video, VIDEO_TTL);
      return video;
    } catch { return null; }
  },

  async getRemoved(): Promise<string> {
    // Cron-only — always fetch fresh, never cache
    const queryParams = new URLSearchParams({ format: "json" });
    const res = await fetch(`${BASE_URL}/removed/?${queryParams.toString()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  },
};
