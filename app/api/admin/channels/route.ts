import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db/prisma";

export async function GET() {
  try {
    const channels = await prisma.telegramChannel.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        bot: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });
    return NextResponse.json(channels);
  } catch (err) { const error = err as Error;
    console.error("[ChannelsAPI] Failed to fetch channels:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch Telegram channels list." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { id, name, isActive, template, routingRules, botId } = await request.json();

    if (!id || !name) {
      return NextResponse.json(
        { error: "Channel ID and Channel Name are required." },
        { status: 400 }
      );
    }

    // Upsert the channel
    const channel = await prisma.telegramChannel.upsert({
      where: { id },
      update: {
        name,
        isActive: typeof isActive === "boolean" ? isActive : true,
        template: template || null,
        routingRules: routingRules ? JSON.parse(JSON.stringify(routingRules)) : null,
        botId: botId || null,
      },
      create: {
        id,
        name,
        isActive: typeof isActive === "boolean" ? isActive : true,
        template: template || null,
        routingRules: routingRules ? JSON.parse(JSON.stringify(routingRules)) : null,
        botId: botId || null,
      },
    });

    return NextResponse.json(channel);
  } catch (err) { const error = err as Error;
    console.error("[ChannelsAPI] Failed to save channel:", error.message);
    return NextResponse.json(
      { error: "Failed to save Telegram channel." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Channel ID was not provided." },
        { status: 400 }
      );
    }

    await prisma.telegramChannel.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err) { const error = err as Error;
    console.error("[ChannelsAPI] Failed to delete channel:", error.message);
    return NextResponse.json(
      { error: "Failed to delete Telegram channel." },
      { status: 500 }
    );
  }
}
