import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db/prisma";

export async function GET() {
  try {
    // 1. General Metrics
    const totalVideos = await prisma.video.count();
    const totalBroadcasts = await prisma.broadcastLog.count({ where: { status: "SENT" } });
    const totalClicks = await prisma.telegramClick.count();
    const ctr = totalBroadcasts > 0 ? ((totalClicks / totalBroadcasts) * 100).toFixed(1) : "0.0";

    // 2. Click Through Rate (CTR) over last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const logsLast7Days = await prisma.broadcastLog.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo },
        status: "SENT",
      },
      select: {
        createdAt: true,
        _count: {
          select: { clicks: true },
        },
      },
    });

    // Group by day of week
    const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const last7DaysData: Record<string, { sent: number; clicks: number }> = {};
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = dayNames[d.getDay()];
      last7DaysData[dayName] = { sent: 0, clicks: 0 };
    }

    logsLast7Days.forEach((log) => {
      const dayName = dayNames[new Date(log.createdAt).getDay()];
      if (last7DaysData[dayName]) {
        last7DaysData[dayName].sent += 1;
        last7DaysData[dayName].clicks += log._count.clicks;
      }
    });

    const ctrChart = Object.entries(last7DaysData).map(([day, val]) => ({
      label: day,
      ctr: val.sent > 0 ? parseFloat(((val.clicks / val.sent) * 100).toFixed(1)) : 0,
      sent: val.sent,
      clicks: val.clicks,
    }));

    // 3. Hourly Performance (Best hours to broadcast based on clicks)
    const clicks30Days = await prisma.telegramClick.findMany({
      where: {
        clickedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      select: {
        clickedAt: true,
      },
    });

    const hourlyClicks = Array(24).fill(0);
    clicks30Days.forEach((click) => {
      const localHour = new Date(click.clickedAt).getHours();
      hourlyClicks[localHour]++;
    });

    const hourlyChart = hourlyClicks.map((clicksCount, hour) => ({
      hour: `${hour.toString().padStart(2, "0")}:00`,
      clicks: clicksCount,
    }));

    // 4. Performant Channels
    const channels = await prisma.telegramChannel.findMany({
      include: {
        broadcasts: {
          where: { status: "SENT" },
          select: {
            _count: {
              select: { clicks: true },
            },
          },
        },
      },
    });

    const channelChart = channels.map((ch) => {
      const totalSent = ch.broadcasts.length;
      const totalChClicks = ch.broadcasts.reduce((sum, b) => sum + b._count.clicks, 0);
      return {
        name: ch.name,
        sent: totalSent,
        clicks: totalChClicks,
        ctr: totalSent > 0 ? parseFloat(((totalChClicks / totalSent) * 100).toFixed(1)) : 0,
      };
    });

    // 5. Top 5 Videos by Clicks
    const topVideosRaw = await prisma.video.findMany({
      where: {
        broadcasts: {
          some: {
            status: "SENT",
          },
        },
      },
      take: 20, // get more to aggregate
      select: {
        id: true,
        title: true,
        views: true,
        broadcasts: {
          select: {
            _count: {
              select: { clicks: true },
            },
          },
        },
      },
    });

    const topVideos = topVideosRaw
      .map((v) => ({
        id: v.id,
        title: v.title,
        clicks: v.broadcasts.reduce((sum, b) => sum + b._count.clicks, 0),
        views: v.views,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5);

    return NextResponse.json({
      summary: {
        totalVideos,
        totalBroadcasts,
        totalClicks,
        ctr,
      },
      ctrChart,
      hourlyChart,
      channelChart,
      topVideos,
    });
  } catch (error: any) {
    console.error("[AnalyticsAPI] Failed to generate analytics:", error.message);
    return NextResponse.json(
      { error: "Gagal memuat data analitik." },
      { status: 500 }
    );
  }
}
