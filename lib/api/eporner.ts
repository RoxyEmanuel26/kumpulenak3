import { EpornerSearchResponse, EpornerVideo } from "../../types/eporner";

const BASE_URL = "https://www.eporner.com/api/v2/video";

export function repairMojibake(str: string): string {
  if (!str) return str;

  // Regex to match valid UTF-8 sequences interpreted as ISO-8859-1/CP1252 characters
  const utf8Regex = /[\u00C2-\u00DF][\u0080-\u00BF]|[\u00E0-\u00EF][\u0080-\u00BF]{2}|[\u00F0-\u00F4][\u0080-\u00BF]{3}/g;

  return str.replace(utf8Regex, (match) => {
    try {
      // Replace Node.js Buffer with Edge-compatible Web APIs
      const bytes = new Uint8Array(match.length);
      for (let i = 0; i < match.length; i++) {
        bytes[i] = match.charCodeAt(i);
      }
      return new TextDecoder('utf-8').decode(bytes);
    } catch {
      return match;
    }
  });
}

export function decodeHtmlEntities(str: string): string {
  if (!str) return str;
  return str
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function cleanEpornerText(str: string): string {
  if (!str) return str;
  const repaired = repairMojibake(str);
  const decoded = decodeHtmlEntities(repaired);
  // Remove zero-width space (\u200b), zero-width non-joiner (\u200c), zero-width joiner (\u200d), left-to-right mark (\u200e), right-to-left mark (\u200f), byte order mark (\ufeff)
  return decoded.replace(/[\u200b-\u200d\u200e\u200f\ufeff]/g, '');
}

function cleanVideoData(video: EpornerVideo): EpornerVideo {
  if (!video) return video;
  return {
    ...video,
    title: cleanEpornerText(video.title),
    keywords: cleanEpornerText(video.keywords),
  };
}

// In-memory cache to prevent Next.js from bloating the disk with .next/cache/fetch-cache
// This ensures caching for performance but avoids ENOSPC errors on persistent servers.
const memCache = new Map<string, { data: any; expires: number }>();

function setCache(key: string, data: any, ttlSeconds: number) {
  // Simple garbage collection to prevent memory leaks
  if (memCache.size > 1000) {
    const now = Date.now();
    for (const [k, v] of memCache.entries()) {
      if (v.expires <= now) memCache.delete(k);
    }
    if (memCache.size > 1000) memCache.clear();
  }
  memCache.set(key, { data, expires: Date.now() + ttlSeconds * 1000 });
}

function getCache(key: string) {
  const cached = memCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.data;
  return null;
}

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
      gay: "0",   // forced straight-only
      lq: "0",    // default — overridable by caller
      ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    });
    const url = `${BASE_URL}/search/?${queryParams.toString()}`;
    
    const cached = getCache(url);
    if (cached) return cached;

    const res = await fetch(url, {
      cache: "no-store", // Disable Next.js disk cache entirely
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: EpornerSearchResponse = await res.json();
    if (data && Array.isArray(data.videos)) {
      data.videos = data.videos.map(cleanVideoData);
    }
    
    setCache(url, data, 300); // 5 minutes cache
    return data;
  },

  async getById(id: string): Promise<EpornerVideo | null> {
    try {
      const queryParams = new URLSearchParams({ id, format: "json" });
      const url = `${BASE_URL}/id/?${queryParams.toString()}`;
      
      const cached = getCache(url);
      if (cached) return cached;

      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return null;
      const data = await res.json();
      const video = (data && !Array.isArray(data) && data.id) ? cleanVideoData(data) : null;
      
      if (video) setCache(url, video, 3600); // 1 hour cache
      return video;
    } catch {
      return null;
    }
  },

  async getRemoved(): Promise<string> {
    const queryParams = new URLSearchParams({ format: "json" });
    const res = await fetch(`${BASE_URL}/removed/?${queryParams.toString()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  },
};


