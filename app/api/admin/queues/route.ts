import { NextResponse } from "next/server";
import { syncQueue, broadcastQueue, enqueueSyncJob } from "../../../../lib/queue/bullmq";
import { prisma } from "../../../../lib/db/prisma";

export async function GET() {
  try {
    // 1. Fetch Job counts from BullMQ
    const syncCounts = await syncQueue.getJobCounts("active", "completed", "failed", "delayed", "waiting");
    const broadcastCounts = await broadcastQueue.getJobCounts("active", "completed", "failed", "delayed", "waiting");

    // 2. Fetch Recent Broadcast Logs (live delivery)
    const recentBroadcasts = await prisma.broadcastLog.findMany({
      take: 20,
      orderBy: { updatedAt: "desc" },
      include: {
        video: {
          select: {
            title: true,
          },
        },
        channel: {
          select: {
            name: true,
          },
        },
      },
    });

    // 3. Fetch Recent Failed Jobs
    const recentFailed = await prisma.broadcastLog.findMany({
      where: {
        status: "FAILED",
      },
      take: 10,
      orderBy: { updatedAt: "desc" },
      include: {
        video: {
          select: {
            title: true,
          },
        },
        channel: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      queues: {
        sync: syncCounts,
        broadcast: broadcastCounts,
      },
      recentBroadcasts,
      recentFailed,
    });
  } catch (err) { const error = err as Error;
    console.error("[QueuesAPI] Failed to fetch queue status:", error.message);
    return NextResponse.json(
      { error: "Failed to load worker queue status." },
      { status: 500 }
    );
  }
}

// Fix 17: In-memory rate limiter for manual sync triggers
const SYNC_ATTEMPTS = new Map<string, { resetAt: number }>();
const WINDOW_MS = 60 * 1000; // 1 minute per trigger

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = SYNC_ATTEMPTS.get(ip);

  if (!record || now > record.resetAt) {
    SYNC_ATTEMPTS.set(ip, { resetAt: now + WINDOW_MS });
    return false;
  }
  return true;
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "unknown";

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait 1 minute before triggering another sync." },
        { status: 429 }
      );
    }

    await enqueueSyncJob();
    return NextResponse.json({ success: true, message: "Synchronization job successfully added to the queue." });
  } catch (err) { const error = err as Error;
    console.error("[QueuesAPI] Failed to trigger manual sync:", error.message);
    return NextResponse.json(
      { error: "Failed to trigger manual content synchronization." },
      { status: 500 }
    );
  }
}
