import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db/prisma";
import { EpornerAPI } from "../../../../lib/api/eporner";
import { GeminiAPI } from "../../../../lib/api/gemini";
import { enqueueBroadcastJob } from "../../../../lib/queue/bullmq";

export async function POST(request: NextRequest) {
  try {
    // Webhook authentication check
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (webhookSecret) {
      const authHeader = request.headers.get("Authorization") || request.nextUrl.searchParams.get("secret");
      const expectedAuth = `Bearer ${webhookSecret}`;
      if (authHeader !== expectedAuth && authHeader !== webhookSecret) {
        return NextResponse.json(
          { error: "Unauthorized: Token secret webhook tidak valid." },
          { status: 401 }
        );
      }
    }

    const body = await request.json();
    const { videoId } = body;

    if (!videoId) {
      return NextResponse.json(
        { error: "Parameter videoId wajib dilampirkan." },
        { status: 400 }
      );
    }

    console.log(`[WebhookFeed] Received ping for video ID: ${videoId}`);

    // Check if video already exists in database
    const existing = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        message: "Video sudah terdaftar di database.",
        videoId,
      });
    }

    // Fetch video details from Eporner API
    const v = await EpornerAPI.getById(videoId);
    if (!v) {
      return NextResponse.json(
        { error: `Video dengan ID ${videoId} tidak ditemukan di Eporner.` },
        { status: 404 }
      );
    }

    // Call Gemini AI Classification
    console.log(`[WebhookFeed] Running Gemini AI classification for: "${v.title}"`);
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
        duration: v.length_min,
        rating: v.rate,
        views: v.views,
        thumbnail: v.default_thumb?.src,
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

    // Enqueue Broadcast Job
    if (newVideo.status === "ACTIVE") {
      await enqueueBroadcastJob(newVideo.id);
      console.log(`[WebhookFeed] Broadcast job enqueued for video ${newVideo.id}`);
    }

    return NextResponse.json({
      success: true,
      message: "Video berhasil disinkronkan via Webhook.",
      video: {
        id: newVideo.id,
        title: newVideo.title,
        status: newVideo.status,
      },
    });
  } catch (error: any) {
    console.error("[WebhookFeed] Error processing webhook ping:", error.message);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat memproses sinkronisasi webhook." },
      { status: 500 }
    );
  }
}
