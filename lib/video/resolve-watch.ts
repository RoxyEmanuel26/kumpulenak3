import { sql } from "../db";
import { EpornerAPI } from "../api/eporner";
import { buildWatchUrl, extractVideoId } from "./slug";

const EPORNER_ID_REGEX = /^[a-zA-Z0-9]{4,20}$/;

/**
 * Resolves a legacy video/watch ID straight to its canonical `/watch/{slug}-{id}` path
 * so `/watch?v={id}` and `/video/{id}` emit a single 1-hop 308 redirect (or 404 if removed).
 */
export async function resolveCanonicalWatchPath(rawId: string): Promise<string | null> {
  const videoId = extractVideoId(rawId.trim());
  if (!EPORNER_ID_REGEX.test(videoId)) return null;

  try {
    const rows = await sql`
      SELECT id, title, status
      FROM "Video"
      WHERE id = ${videoId}
      LIMIT 1
    `;
    if (rows && rows.length > 0) {
      const row = rows[0];
      if (row.status !== "ACTIVE") return null;
      const upstreamStatus = await EpornerAPI.checkVideoStatus(videoId);
      if (upstreamStatus === "removed") return null;
      return buildWatchUrl(row.id as string, (row.title as string) || "");
    }
  } catch {
    // Fall back to Eporner API when local DB is unavailable or uninitialized
  }

  const video = await EpornerAPI.getById(videoId);
  return video ? buildWatchUrl(video.id, video.title) : null;
}
