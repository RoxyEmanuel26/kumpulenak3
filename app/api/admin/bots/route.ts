import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db/prisma";
import { Telegraf } from "telegraf";

export async function GET() {
  try {
    const bots = await prisma.telegramBot.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(bots);
  } catch (err) { const error = err as Error;
    console.error("[BotsAPI] Failed to fetch bots:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch Telegram bots list." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token, isActive } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "Telegram bot token is required." },
        { status: 400 }
      );
    }

    // Connect to Telegram API to verify the token and retrieve bot information
    let botInfo;
    try {
      const tempBot = new Telegraf(token);
      botInfo = await tempBot.telegram.getMe();
    } catch (err) {
      const error = err as Error;
      return NextResponse.json(
        { error: `Bot token is invalid or cannot connect to Telegram: ${error.message}` },
        { status: 400 }
      );
    }

    // Save/create bot in database
    const bot = await prisma.telegramBot.create({
      data: {
        token,
        name: botInfo.first_name,
        username: botInfo.username,
        isActive: typeof isActive === "boolean" ? isActive : true,
      },
    });

    return NextResponse.json(bot);
  } catch (err) {
    const error = err as Error;
    console.error("[BotsAPI] Failed to create bot:", error.message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((error as any).code === "P2002") {
      return NextResponse.json(
        { error: "A bot with this token is already registered." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to save Telegram bot." },
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
        { error: "Bot ID was not provided." },
        { status: 400 }
      );
    }

    await prisma.telegramBot.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err) { const error = err as Error;
    console.error("[BotsAPI] Failed to delete bot:", error.message);
    return NextResponse.json(
      { error: "Failed to delete Telegram bot." },
      { status: 500 }
    );
  }
}
