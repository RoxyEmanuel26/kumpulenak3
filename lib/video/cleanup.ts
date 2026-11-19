import { sql } from "../db";
import { EpornerAPI, invalidateVideoCaches } from "../api/eporner";
import { invalidateSitemapCache } from "../sitemap";

export interface CleanupResult {
  skipped: boolean;
  activeChecked: number;
  removedVideosDeactivated: number;
  deletedOldRemoved: number;
  prunedExcessVideos: number;
  removedIds?: string[];
}

const TWENTY_HOURS_MS = 20 * 60 * 60 * 1000;
const MAX_STORED_VIDEOS = 15_000;

const globalForCleanup = globalThis as unknown as {
  lastCleanupRunAt?: number;
};

/**
 * Checks ACTIVE database videos against Eporner's removed-videos feed using
 * streaming lookup (low memory) and enforces Neon Free Tier retention rules.
 */
export async function runRemovedVideosCleanup(
  options: { force?: boolean } = {}
): Promise<CleanupResult> {
  const result: CleanupResult = {
    skipped: false,
    activeChecked: 0,
    removedVideosDeactivated: 0,
    deletedOldRemoved: 0,
    prunedExcessVideos: 0,
  };

  const now = new Date();
  if (
    !options.force &&
    globalForCleanup.lastCleanupRunAt &&
    now.getTime() - globalForCleanup.lastCleanupRunAt <= TWENTY_HOURS_MS
  ) {
    result.skipped = true;
    return result;
  }

  if (!options.force) {
    const [lastSyncSetting] = await sql`
      SELECT value FROM "Settings" WHERE key = 'last_removed_sync_at'
    `;
    let lastSync: Date | null = null;
    if (lastSyncSetting?.value) {
      try {
        lastSync = new Date(JSON.parse(lastSyncSetting.value as string));
      } catch {
        lastSync = null;
      }
    }

    if (lastSync && !isNaN(lastSync.getTime()) && now.getTime() - lastSync.getTime() <= TWENTY_HOURS_MS) {
      globalForCleanup.lastCleanupRunAt = lastSync.getTime();
      result.skipped = true;
      return result;
    }
  }

  const activeVideos = await sql`
    SELECT id FROM "Video" WHERE status = 'ACTIVE'
  `;
  result.activeChecked = activeVideos.length;

  if (activeVideos.length > 0) {
    const activeIdsSet = new Set(activeVideos.map((v) => v.id as string));
    const removedIds = await EpornerAPI.findRemovedVideoIds(activeIdsSet);

    if (removedIds.length > 0) {
      const updated = await sql`
        UPDATE "Video" SET status = 'REMOVED', "updatedAt" = NOW()
        WHERE id = ANY(${removedIds})
      `;
      result.removedVideosDeactivated =
        (updated as unknown as { count?: number; rowCount?: number }).count ??
        (updated as unknown as { rowCount?: number }).rowCount ??
        removedIds.length;
      result.removedIds = removedIds;
      for (const removedId of removedIds) {
        invalidateVideoCaches(removedId);
      }
      invalidateSitemapCache();
    }
  }

  await sql`
    INSERT INTO "Settings" (key, value, "updatedAt")
    VALUES ('last_removed_sync_at', ${JSON.stringify(now.toISOString())}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, "updatedAt" = NOW()
  `;
  globalForCleanup.lastCleanupRunAt = now.getTime();

  // Neon DB Storage Protection Policy (512 MB Free Tier ceiling)
  try {
    const delOld = await sql`
      DELETE FROM "Video"
      WHERE status = 'REMOVED' AND "updatedAt" < NOW() - INTERVAL '14 days'
    `;
    result.deletedOldRemoved =
      (delOld as unknown as { count?: number }).count ?? 0;

    const [countRow] = await sql`SELECT COUNT(*) as count FROM "Video"`;
    const totalVideos = parseInt((countRow?.count as string) || "0", 10) || 0;
    if (totalVideos > MAX_STORED_VIDEOS) {
      const excess = totalVideos - MAX_STORED_VIDEOS;
      await sql`
        DELETE FROM "Video"
        WHERE id IN (
          SELECT id FROM "Video"
          ORDER BY "addedAt" ASC NULLS LAST
          LIMIT ${excess}
        )
      `;
      result.prunedExcessVideos = excess;
      console.log(
        `[Cleanup] Pruned ${excess} oldest videos to enforce ${MAX_STORED_VIDEOS} ceiling.`
      );
    }

    await sql`
      DELETE FROM "Tag" WHERE id NOT IN (SELECT DISTINCT "tagId" FROM "VideoTag")
    `;
  } catch (pruneErr) {
    console.warn("[Cleanup] Storage pruning skipped:", (pruneErr as Error).message);
  }

  return result;
}
