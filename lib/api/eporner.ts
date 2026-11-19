import dns from "node:dns";
import { EpornerSearchResponse, EpornerVideo } from "../../types/eporner";
import { sql } from "../db";

// Docker/Pterodactyl containers frequently lack working IPv6 egress while
// www.eporner.com publishes an AAAA record; prefer IPv4 to avoid 10s connect timeouts.
try {
  dns.setDefaultResultOrder?.("ipv4first");
} catch {
  // Ignore in runtimes without node:dns
}

const BASE_URL = "https://www.eporner.com/api/v2/video";
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.lusthub.web.id";

export function repairMojibake(str: string): string {
  if (!str || !/[^\x00-\x7F]/.test(str)) return str;
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

export function cleanVideoData(video: EpornerVideo): EpornerVideo {
  if (!video) return video;
  const thumbs = Array.isArray(video.thumbs)
    ? video.thumbs.filter((t): t is EpornerVideo["thumbs"][number] => Boolean(t && typeof t.src === "string"))
    : [];
  return {
    ...video,
    title: cleanEpornerText(typeof video.title === "string" ? video.title : "HD Video"),
    keywords: cleanEpornerText(typeof video.keywords === "string" ? video.keywords : ""),
    views: Number(video.views) || 0,
    embed: typeof video.embed === "string" ? video.embed.replace(/\/+$/, "") : `https://www.eporner.com/embed/${video.id}`,
    thumbs,
  };
}

// ── Two-Layer Cache ──────────────────────────────────────────────────────────
// Layer 1 (memCache): Shared process-wide Map — zero latency, keeps Neon DB
// able to scale-to-zero (sleep after 5 min) by avoiding repeat DB wakes.
// Layer 2 (next.revalidate): Next.js fetch cache — survives within process budget.
//
// TTL values (intentionally generous — Eporner/DB calls are CPU & CU-hr bottlenecks):
//   SEARCH_TTL = 30 minutes — homepage/category videos stable for 30 min
//   VIDEO_TTL  = 6 hours    — video metadata almost never changes
export const DB_VIDEO_CACHE_TTL = 6 * 60 * 60; // 6 hours
export const DB_NEGATIVE_CACHE_TTL = 60 * 60;  // 1 hour for REMOVED/DRAFT videos

type CacheEntry = { data: unknown; expires: number };

const globalForCache = globalThis as unknown as {
  epornerMemCache?: Map<string, CacheEntry>;
  epornerInFlight?: Map<string, Promise<unknown>>;
};

const memCache = globalForCache.epornerMemCache ?? new Map<string, CacheEntry>();
globalForCache.epornerMemCache = memCache;

const MEM_CACHE_MAX = 5000;

const inFlightRequests = globalForCache.epornerInFlight ?? new Map<string, Promise<unknown>>();
globalForCache.epornerInFlight = inFlightRequests;

export function coalesceInFlight<T>(key: string, work: () => Promise<T>): Promise<T> {
  const existing = inFlightRequests.get(key);
  if (existing) return existing as Promise<T>;
  const promise = work().finally(() => {
    inFlightRequests.delete(key);
  });
  inFlightRequests.set(key, promise);
  return promise;
}

function setCache(key: string, data: unknown, ttlSeconds: number) {
  if (memCache.size >= MEM_CACHE_MAX && !memCache.has(key)) {
    const now = Date.now();
    for (const [k, v] of memCache.entries()) {
      if (v.expires <= now) memCache.delete(k);
    }
    // Evict oldest 20% (FIFO) instead of wiping the whole cache
    if (memCache.size >= MEM_CACHE_MAX) {
      const toEvict = Math.ceil(MEM_CACHE_MAX * 0.2);
      let evicted = 0;
      for (const k of memCache.keys()) {
        memCache.delete(k);
        if (++evicted >= toEvict) break;
      }
    }
  }
  memCache.set(key, { data, expires: Date.now() + ttlSeconds * 1000 });
}

function getCache(key: string): unknown | null {
  const cached = memCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.data;
  if (cached) memCache.delete(key);
  return null;
}

export function getDbCache<T>(key: string): T | null {
  return getCache(key) as T | null;
}

export function setDbCache(key: string, data: unknown, ttlSeconds = DB_VIDEO_CACHE_TTL): void {
  setCache(key, data, ttlSeconds);
}

export function deleteDbCache(key: string): void {
  memCache.delete(key);
}

export function invalidateVideoCaches(videoId: string): void {
  memCache.delete(`db:watch:${videoId}`);
  memCache.delete(`db:api-video:${videoId}`);
  memCache.delete(`db:api-related:${videoId}`);
  memCache.delete(`status:${videoId}`);
}

function getStaleCache(key: string): unknown | null {
  return memCache.get(key)?.data ?? null;
}

async function fetchWithRetry(
  url: string,
  init: RequestInit & { next?: { revalidate?: number | false } },
  retries = 1
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        signal: init.signal ?? AbortSignal.timeout(8000),
      });
      if (res.ok || (res.status < 500 && res.status !== 429)) {
        return res;
      }
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
    }
  }
  throw lastError;
}

function emptySearchResponse(page: number, perPage: number): EpornerSearchResponse {
  return {
    time_ms: 0,
    total_count: 0,
    total_pages: 1,
    per_page: perPage,
    current_page: page,
    videos: [],
  };
}

function parseJsonObject<T>(val: unknown, fallback: T): T {
  if (val && typeof val === "object") return val as T;
  if (typeof val === "string") {
    try {
      return JSON.parse(val) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export function mapDbVideoToEporner(row: Record<string, unknown>): EpornerVideo {
  const id = row.id as string;
  const defaultThumb = parseJsonObject(row.defaultThumb, {
    size: "big",
    width: 640,
    height: 360,
    src: `${SITE_URL}/logo.webp`,
  });
  const parsedThumbs = parseJsonObject<unknown>(row.thumbs, null);
  const thumbs = Array.isArray(parsedThumbs)
    ? (parsedThumbs as EpornerVideo["thumbs"])
    : [defaultThumb];
  const addedRaw = row.addedAt;
  const added =
    addedRaw instanceof Date
      ? addedRaw.toISOString()
      : typeof addedRaw === "string"
        ? addedRaw
        : "";

  return cleanVideoData({
    id,
    title: (row.title as string) || "HD Video",
    keywords: (row.keywords as string) || "",
    views: Number(row.views) || 0,
    rate: (row.rate as string) || "0",
    url: "",
    added,
    length_sec: Number(row.lengthSec) || 0,
    length_min: (row.lengthMin as string) || "0:00",
    embed: ((row.embedUrl as string) || `https://www.eporner.com/embed/${id}`).replace(/\/+$/, ""),
    default_thumb: defaultThumb,
    thumbs,
  });
}

async function fallbackSearchFromDb(params: {
  query?: string;
  per_page?: number;
  page?: number;
  order?: string;
}): Promise<EpornerSearchResponse> {
  const page = Math.max(1, params.page ?? 1);
  const perPage = Math.max(1, Math.min(100, params.per_page ?? 30));
  if (!process.env.DATABASE_URL) return emptySearchResponse(page, perPage);

  const offset = (page - 1) * perPage;
  const q = params.query?.trim();
  const hasFilter = Boolean(q && q.toLowerCase() !== "all");
  const pattern = hasFilter ? `%${q}%` : "";

  try {
    let rows = hasFilter
      ? await sql`
          SELECT id, title, keywords, views, rate, "addedAt", "lengthSec", "lengthMin", "embedUrl", "defaultThumb", thumbs
          FROM "Video"
          WHERE status = 'ACTIVE' AND "aiSpamFlag" = false AND "aiScoreSpam" < 65
            AND (title ILIKE ${pattern} OR keywords ILIKE ${pattern})
          ORDER BY "addedAt" DESC NULLS LAST, views DESC
          LIMIT ${perPage} OFFSET ${offset}
        `
      : params.order === "most-popular"
        ? await sql`
            SELECT id, title, keywords, views, rate, "addedAt", "lengthSec", "lengthMin", "embedUrl", "defaultThumb", thumbs
            FROM "Video"
            WHERE status = 'ACTIVE' AND "aiSpamFlag" = false AND "aiScoreSpam" < 65
            ORDER BY views DESC, "addedAt" DESC NULLS LAST
            LIMIT ${perPage} OFFSET ${offset}
          `
        : await sql`
            SELECT id, title, keywords, views, rate, "addedAt", "lengthSec", "lengthMin", "embedUrl", "defaultThumb", thumbs
            FROM "Video"
            WHERE status = 'ACTIVE' AND "aiSpamFlag" = false AND "aiScoreSpam" < 65
            ORDER BY "addedAt" DESC NULLS LAST
            LIMIT ${perPage} OFFSET ${offset}
          `;

    // If a specific search/category had 0 exact keyword matches on page 1, fall back to
    // top active DB videos so category/watch fallback never triggers a false Soft 404.
    if (rows.length === 0 && page === 1 && hasFilter) {
      rows = await sql`
        SELECT id, title, keywords, views, rate, "addedAt", "lengthSec", "lengthMin", "embedUrl", "defaultThumb", thumbs
        FROM "Video"
        WHERE status = 'ACTIVE' AND "aiSpamFlag" = false AND "aiScoreSpam" < 65
        ORDER BY views DESC, "addedAt" DESC NULLS LAST
        LIMIT ${perPage}
      `;
    }

    const videos = rows.map((r) => mapDbVideoToEporner(r as Record<string, unknown>));
    return {
      time_ms: 0,
      total_count: videos.length,
      total_pages: videos.length >= perPage ? page + 1 : page,
      per_page: perPage,
      current_page: page,
      videos,
    };
  } catch (dbErr) {
    console.warn("[EpornerAPI] DB fallback failed:", (dbErr as Error).message);
    return emptySearchResponse(page, perPage);
  }
}

const SEARCH_TTL = 30 * 60;     // 30 minutes
const VIDEO_TTL  = 6 * 60 * 60; // 6 hours

export const EpornerAPI = {
  async search(
    params: {
      query?: string;
      per_page?: number;
      page?: number;
      thumbsize?: string;
      order?: "latest" | "top-weekly" | "top-monthly" | "most-popular" | "longest" | "shortest";
      lq?: 0 | 1 | 2;
      format?: "json" | "xml";
    } = {},
    options: { allowDbFallback?: boolean } = {}
  ): Promise<EpornerSearchResponse> {
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

    const allowDbFallback = options.allowDbFallback !== false;
    return coalesceInFlight(`search:${allowDbFallback ? "fb" : "nofb"}:${url}`, async () => {
      try {
        // next.revalidate = Next.js disk/memory cache
        const res = await fetchWithRetry(url, { next: { revalidate: SEARCH_TTL } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: EpornerSearchResponse = await res.json();
        if (!data || typeof data !== "object") {
          throw new Error("Invalid search payload");
        }
        data.videos = Array.isArray(data.videos)
          ? data.videos.filter(Boolean).map(cleanVideoData)
          : [];
        setCache(url, data, SEARCH_TTL);
        return data;
      } catch (err) {
        console.warn(`[EpornerAPI] search fallback triggered for "${params.query || "all"}":`, (err as Error).message);
        const stale = getStaleCache(url);
        if (stale) return stale as EpornerSearchResponse;

        if (allowDbFallback) {
          return fallbackSearchFromDb(params);
        }
        return emptySearchResponse(params.page ?? 1, params.per_page ?? 30);
      }
    });
  },

  async getById(id: string): Promise<EpornerVideo | null> {
    const queryParams = new URLSearchParams({ id, format: "json" });
    const url = `${BASE_URL}/id/?${queryParams.toString()}`;

    const memHit = getCache(url);
    if (memHit) return memHit as EpornerVideo;

    return coalesceInFlight(`video:${url}`, async () => {
      try {
        const res = await fetchWithRetry(url, { next: { revalidate: VIDEO_TTL } });
        if (!res.ok) return (getStaleCache(url) as EpornerVideo | null) ?? null;
        const data = await res.json();
        const video = (data && !Array.isArray(data) && typeof data === "object" && data.id)
          ? cleanVideoData(data)
          : null;
        if (video) {
          setCache(url, video, VIDEO_TTL);
          setCache(`status:${id}`, "alive", VIDEO_TTL);
        } else {
          setCache(`status:${id}`, "removed", VIDEO_TTL);
        }
        return video;
      } catch {
        return (getStaleCache(url) as EpornerVideo | null) ?? null;
      }
    });
  },

  /**
   * Verifies whether a video ID is still active on Eporner or has been deleted upstream.
   * Returns "alive" | "removed" | "unknown" (on network error/timeout, never false-positives as removed).
   */
  async checkVideoStatus(id: string): Promise<"alive" | "removed" | "unknown"> {
    const statusKey = `status:${id}`;
    const cachedStatus = getCache(statusKey) as "alive" | "removed" | null;
    if (cachedStatus) return cachedStatus;

    const queryParams = new URLSearchParams({ id, format: "json" });
    const url = `${BASE_URL}/id/?${queryParams.toString()}`;
    if (getCache(url)) {
      setCache(statusKey, "alive", VIDEO_TTL);
      return "alive";
    }

    return coalesceInFlight(statusKey, async () => {
      try {
        const res = await fetchWithRetry(
          url,
          {
            next: { revalidate: VIDEO_TTL },
            signal: AbortSignal.timeout(4000),
          },
          0
        );
        if (!res.ok) return "unknown";
        const data = await res.json();
        if (data && !Array.isArray(data) && typeof data === "object" && data.id) {
          setCache(url, cleanVideoData(data), VIDEO_TTL);
          setCache(statusKey, "alive", VIDEO_TTL);
          return "alive";
        }
        setCache(statusKey, "removed", VIDEO_TTL);
        return "removed";
      } catch {
        return "unknown";
      }
    });
  },

  /**
   * Streams the 150MB+ removed-videos feed line by line and returns only IDs
   * present in `activeIds`, avoiding buffering the entire response in Node RAM.
   */
  async findRemovedVideoIds(activeIds: Set<string>): Promise<string[]> {
    if (activeIds.size === 0) return [];

    const controller = new AbortController();
    const hardTimeout = setTimeout(
      () => controller.abort(new Error("Removed feed hard timeout (5m)")),
      300_000
    );
    let stallTimer: ReturnType<typeof setTimeout> | undefined;
    const resetStallTimer = () => {
      if (stallTimer) clearTimeout(stallTimer);
      stallTimer = setTimeout(
        () => controller.abort(new Error("Removed feed stalled (20s)")),
        20_000
      );
    };

    try {
      resetStallTimer();
      const res = await fetch(`${BASE_URL}/removed/?format=json`, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) return [];

      const matched: string[] = [];
      let token = "";
      const processChunk = (chunk: string) => {
        let start = -1;
        for (let i = 0; i < chunk.length; i++) {
          const c = chunk.charCodeAt(i);
          const isDelim = c <= 32 || c === 34 || c === 39 || c === 44 || c === 91 || c === 93;
          if (isDelim) {
            if (start !== -1 || token.length > 0) {
              const id = start !== -1 ? token + chunk.slice(start, i) : token;
              if (id && activeIds.has(id)) matched.push(id);
              token = "";
              start = -1;
            }
          } else if (start === -1) {
            start = i;
          }
        }
        if (start !== -1) {
          token += chunk.slice(start);
        }
      };

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        resetStallTimer();
        const { value, done } = await reader.read();
        if (done) break;
        processChunk(decoder.decode(value, { stream: true }));
      }

      const tail = decoder.decode();
      if (tail) processChunk(tail);
      if (token && activeIds.has(token)) matched.push(token);

      return matched;
    } finally {
      clearTimeout(hardTimeout);
      if (stallTimer) clearTimeout(stallTimer);
    }
  },

  async getRemoved(): Promise<string> {
    // Cron-only — always fetch fresh, never cache
    const queryParams = new URLSearchParams({ format: "json" });
    const res = await fetch(`${BASE_URL}/removed/?${queryParams.toString()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  },
};
