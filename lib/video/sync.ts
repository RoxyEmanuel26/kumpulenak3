import { neon } from "@neondatabase/serverless";
import { EpornerAPI } from "@/lib/api/eporner";
import { GeminiAPI } from "@/lib/api/gemini";

export async function syncVideoToDatabase(videoId: string) {
  console.log(`[SyncVideo] Starting internal sync for video ID: ${videoId}`);

  const sql = neon(process.env.DATABASE_URL!);

  // Check if video already exists in database
  const existing = await sql`
    SELECT id FROM "Video" WHERE id = ${videoId} LIMIT 1
  `;

  if (existing.length > 0) {
    console.log(`[SyncVideo] Video ${videoId} already exists in database.`);
    return existing[0];
  }

  // Fetch video details from Eporner API
  const v = await EpornerAPI.getById(videoId);
  if (!v) {
    throw new Error(`Video with ID ${videoId} not found on Eporner.`);
  }

  // Call Gemini AI Classification
  console.log(`[SyncVideo] Running Gemini AI classification for: "${v.title}"`);
  const aiResult = await GeminiAPI.classifyVideo(v.title, v.keywords);

  const rawTags = aiResult.cleanedTags.length > 0
    ? aiResult.cleanedTags
    : v.keywords.split(",");
  const finalTags = Array.from(new Set(rawTags.map((t) => t.trim().toLowerCase()))).filter(Boolean);

  // Insert video
  const [newVideo] = await sql`
    INSERT INTO "Video" (
      id, title, "lengthMin", "lengthSec", "addedAt", rate, views,
      "defaultThumb", thumbs, keywords, "embedUrl", status,
      "aiScoreTrending", "aiScoreEngagement", "aiScoreSpam", "aiSpamFlag", "aiDescription",
      "updatedAt"
    ) VALUES (
      ${v.id}, ${v.title}, ${v.length_min}, ${v.length_sec},
      ${v.added ? new Date(v.added).toISOString() : null},
      ${v.rate}, ${v.views},
      ${JSON.stringify(v.default_thumb)}, ${JSON.stringify(v.thumbs)},
      ${v.keywords}, ${v.embed},
      ${aiResult.isSpam ? "DRAFT" : "ACTIVE"},
      ${aiResult.scores.trending}, ${aiResult.scores.engagement}, ${aiResult.scores.spam},
      ${aiResult.isSpam}, ${aiResult.seoDescription},
      NOW()
    )
    ON CONFLICT (id) DO NOTHING
    RETURNING *
  `;

  if (!newVideo) {
    // Already inserted (race condition), return existing
    const [row] = await sql`SELECT * FROM "Video" WHERE id = ${videoId}`;
    return row;
  }

  // Insert tags (connectOrCreate equivalent)
  for (const tagName of finalTags) {
    // Upsert tag
    const tagId = crypto.randomUUID();
    const [tag] = await sql`
      INSERT INTO "Tag" (id, name) VALUES (${tagId}, ${tagName})
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `;
    // Link video-tag
    await sql`
      INSERT INTO "VideoTag" ("videoId", "tagId") VALUES (${v.id}, ${tag.id})
      ON CONFLICT DO NOTHING
    `;
  }

  // Insert category (connectOrCreate equivalent)
  const catName = aiResult.category.trim();
  if (catName) {
    const catId = crypto.randomUUID();
    const [cat] = await sql`
      INSERT INTO "Category" (id, name) VALUES (${catId}, ${catName})
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `;
    await sql`
      INSERT INTO "VideoCategory" ("videoId", "categoryId") VALUES (${v.id}, ${cat.id})
      ON CONFLICT DO NOTHING
    `;
  }

  return newVideo;
}
