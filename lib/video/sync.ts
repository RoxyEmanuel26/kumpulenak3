import { prisma } from "@/lib/db/prisma";
import { EpornerAPI } from "@/lib/api/eporner";
import { GeminiAPI } from "@/lib/api/gemini";
import { Prisma } from "@prisma/client/edge";

export async function syncVideoToDatabase(videoId: string) {
  console.log(`[SyncVideo] Starting internal sync for video ID: ${videoId}`);

  // Check if video already exists in database
  const existing = await prisma.video.findUnique({
    where: { id: videoId },
  });

  if (existing) {
    console.log(`[SyncVideo] Video ${videoId} already exists in database.`);
    return existing;
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

  // Save to DB
  const newVideo = await prisma.video.create({
    data: {
      id: v.id,
      title: v.title,
      lengthMin: v.length_min,
      lengthSec: v.length_sec,
      addedAt: v.added ? new Date(v.added) : undefined,
      rate: v.rate,
      views: v.views,
      defaultThumb: v.default_thumb as unknown as Prisma.InputJsonValue,
      thumbs: v.thumbs as unknown as Prisma.InputJsonValue,
      keywords: v.keywords,
      embedUrl: v.embed,
      status: aiResult.isSpam ? "DRAFT" : "ACTIVE",
      
      // AI features
      aiScoreTrending: aiResult.scores.trending,
      aiScoreEngagement: aiResult.scores.engagement,
      aiScoreSpam: aiResult.scores.spam,
      aiSpamFlag: aiResult.isSpam,
      aiDescription: aiResult.seoDescription,
      
      // Handle tags
      tags: {
        create: finalTags.map((cleanTag) => ({
          tag: {
            connectOrCreate: {
              where: { name: cleanTag },
              create: { name: cleanTag },
            },
          },
        })),
      },
      
      // Handle category
      categories: {
        create: [
          {
            category: {
              connectOrCreate: {
                where: { name: aiResult.category.trim() },
                create: { name: aiResult.category.trim() },
              },
            },
          },
        ],
      },
    },
  });

  // Video sync completed

  return newVideo;
}
