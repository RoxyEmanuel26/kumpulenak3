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

export async function POST() {
  try {
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
