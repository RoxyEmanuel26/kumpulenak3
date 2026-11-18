import fs from "fs/promises";
import path from "path";

/**
 * Disk cache limits — tuned for a 5 GiB Pterodactyl disk.
 * Primary cache lives in bounded RAM (cacheMaxMemorySize + memCache) with
 * isrFlushToDisk: false, so these limits act as a hard safety net against any
 * leftover .trash directories or build/pre-existing fetch-cache files.
 */
export const FETCH_CACHE_MAX_BYTES = 200 * 1024 * 1024;    // 200 MB trigger threshold
export const FETCH_CACHE_TARGET_BYTES = 100 * 1024 * 1024; // 100 MB trim target
const MAINTENANCE_INTERVAL_MS = 10 * 60 * 1000;            // 10-minute throttle

export interface DiskCacheMaintenanceResult {
  skipped: boolean;
  trashFilesDeleted: number;
  trashFreedBytes: number;
  staleCacheDeleted: number;
  staleCacheFreedBytes: number;
  fetchCacheSizeBytes: number;
}

let lastMaintenanceAt = 0;
let inFlightMaintenance: Promise<DiskCacheMaintenanceResult> | null = null;

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

/** Shared recursive directory size walker (non-blocking) */
async function walkDirSize(dir: string): Promise<number> {
  let size = 0;
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(/*turbopackIgnore: true*/ dir, entry.name);
      if (entry.isDirectory()) {
        size += await walkDirSize(full);
      } else {
        try {
          const stat = await fs.stat(full);
          size += stat.size;
        } catch { /* skip missing/locked */ }
      }
    }
  } catch { /* skip unreadable dirs */ }
  return size;
}

/**
 * Removes leftover `.trash` directories and `*_trash_*` files created by
 * Next.js ISR atomic cache swaps interrupted by container kills/restarts.
 */
export async function cleanTrashFiles(): Promise<{ deleted: number; freedBytes: number }> {
  let deleted = 0;
  let freedBytes = 0;

  const cwd = process.cwd();
  const trashDirs = [
    path.join(/*turbopackIgnore: true*/ cwd, ".trash"),
    path.join(/*turbopackIgnore: true*/ cwd, ".next", ".trash"),
    path.join(/*turbopackIgnore: true*/ cwd, ".next", "cache", ".trash"),
  ];

  for (const trashDir of trashDirs) {
    try {
      if (!(await pathExists(trashDir))) continue;
      const stat = await fs.stat(trashDir);
      if (stat.isDirectory()) {
        freedBytes += await walkDirSize(trashDir);
        await fs.rm(trashDir, { recursive: true, force: true });
        deleted++;
        console.log(`[CacheCleanup] Deleted trash dir: ${trashDir}`);
      }
    } catch (e) {
      console.warn(`[CacheCleanup] Could not clean ${trashDir}:`, (e as Error).message);
    }
  }

  const fetchCacheDir = path.join(/*turbopackIgnore: true*/ cwd, ".next", "cache", "fetch-cache");
  try {
    if (await pathExists(fetchCacheDir)) {
      const names = await fs.readdir(fetchCacheDir);
      for (const name of names) {
        if (name.includes("_trash_") || name.includes("_trashpath_")) {
          const full = path.join(/*turbopackIgnore: true*/ fetchCacheDir, name);
          try {
            const stat = await fs.stat(full);
            freedBytes += stat.size;
            await fs.rm(full, { recursive: true, force: true });
            deleted++;
          } catch { /* ignore */ }
        }
      }
    }
  } catch { /* ignore */ }

  return { deleted, freedBytes };
}

/**
 * Enforces a strict size limit on `.next/cache/fetch-cache` using LRW
 * (Least Recently Written, mtime ascending) eviction.
 */
export async function enforceFetchCacheSizeLimit(
  maxSizeBytes = FETCH_CACHE_MAX_BYTES,
  targetSizeBytes = FETCH_CACHE_TARGET_BYTES,
): Promise<{ deleted: number; freedBytes: number; totalSizeBefore: number }> {
  let deleted = 0;
  let freedBytes = 0;
  let totalSizeBefore = 0;
  const fetchCacheDir = path.join(/*turbopackIgnore: true*/ process.cwd(), ".next", "cache", "fetch-cache");

  if (targetSizeBytes >= maxSizeBytes) {
    console.warn(
      `[CacheCleanup] enforceFetchCacheSizeLimit: targetSizeBytes (${targetSizeBytes}) must be < maxSizeBytes (${maxSizeBytes}). Skipping.`
    );
    return { deleted, freedBytes, totalSizeBefore };
  }

  try {
    if (!(await pathExists(fetchCacheDir))) {
      return { deleted, freedBytes, totalSizeBefore };
    }

    const files: { filePath: string; size: number; mtime: number }[] = [];
    let totalSize = 0;
    const entries = await fs.readdir(fetchCacheDir);

    for (const name of entries) {
      if (name.includes("_trash_") || name.includes("_trashpath_")) continue;
      const full = path.join(/*turbopackIgnore: true*/ fetchCacheDir, name);
      try {
        const stat = await fs.stat(full);
        if (stat.isFile()) {
          files.push({ filePath: full, size: stat.size, mtime: stat.mtimeMs });
          totalSize += stat.size;
        }
      } catch { /* skip missing/locked files */ }
    }

    totalSizeBefore = totalSize;

    if (totalSize <= maxSizeBytes) {
      return { deleted, freedBytes, totalSizeBefore };
    }

    files.sort((a, b) => a.mtime - b.mtime);

    let currentSize = totalSize;
    for (const file of files) {
      if (currentSize <= targetSizeBytes) break;
      try {
        await fs.rm(file.filePath, { force: true });
        freedBytes += file.size;
        currentSize -= file.size;
        deleted++;
      } catch { /* skip locked/in-use files */ }
    }

    if (deleted > 0) {
      console.log(
        `[CacheCleanup] fetch-cache exceeded ${(maxSizeBytes / 1024 / 1024).toFixed(0)} MB ` +
        `(${(totalSize / 1024 / 1024).toFixed(1)} MB). Pruned ${deleted} file(s), ` +
        `freed ${(freedBytes / 1024 / 1024).toFixed(1)} MB (~${(currentSize / 1024 / 1024).toFixed(1)} MB remaining).`
      );
    }

    if (currentSize > targetSizeBytes) {
      console.warn(
        `[CacheCleanup] WARNING: fetch-cache still ${(currentSize / 1024 / 1024).toFixed(1)} MB after eviction ` +
        `(target ${(targetSizeBytes / 1024 / 1024).toFixed(0)} MB).`
      );
    }
  } catch (e) {
    console.warn("[CacheCleanup] Error enforcing cache limit:", (e as Error).message);
  }

  return { deleted, freedBytes, totalSizeBefore };
}

/**
 * Runs trash cleanup + fetch-cache size enforcement.
 * Throttled to once every 10 minutes unless `force: true` is passed.
 */
export async function runDiskCacheMaintenance(
  options: { force?: boolean } = {}
): Promise<DiskCacheMaintenanceResult> {
  const now = Date.now();
  if (!options.force && now - lastMaintenanceAt < MAINTENANCE_INTERVAL_MS) {
    return {
      skipped: true,
      trashFilesDeleted: 0,
      trashFreedBytes: 0,
      staleCacheDeleted: 0,
      staleCacheFreedBytes: 0,
      fetchCacheSizeBytes: 0,
    };
  }

  if (inFlightMaintenance) {
    return inFlightMaintenance;
  }

  inFlightMaintenance = (async () => {
    lastMaintenanceAt = Date.now();
    const trash = await cleanTrashFiles();
    const cache = await enforceFetchCacheSizeLimit(FETCH_CACHE_MAX_BYTES, FETCH_CACHE_TARGET_BYTES);
    return {
      skipped: false,
      trashFilesDeleted: trash.deleted,
      trashFreedBytes: trash.freedBytes,
      staleCacheDeleted: cache.deleted,
      staleCacheFreedBytes: cache.freedBytes,
      fetchCacheSizeBytes: cache.totalSizeBefore,
    };
  })().finally(() => {
    inFlightMaintenance = null;
  });

  return inFlightMaintenance;
}
