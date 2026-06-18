import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db/prisma";
import { Telegraf } from "telegraf";

export async function GET() {
  try {
    const bots = await prisma.telegramBot.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(bots);
  } catch (error: any) {
    console.error("[BotsAPI] Failed to fetch bots:", error.message);
    return NextResponse.json(
      { error: "Gagal mengambil daftar bot Telegram." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token, isActive } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "Token bot Telegram wajib diisi." },
        { status: 400 }
      );
    }

    // Connect to Telegram API to verify the token and retrieve bot information
    let botInfo;
    try {
      const tempBot = new Telegraf(token);
      botInfo = await tempBot.telegram.getMe();
    } catch (err: any) {
      return NextResponse.json(
        { error: `Token bot tidak valid atau tidak bisa terhubung ke Telegram: ${err.message}` },
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
  } catch (error: any) {
    console.error("[BotsAPI] Failed to create bot:", error.message);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Bot dengan token ini sudah terdaftar." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Gagal menyimpan bot Telegram." },
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
        { error: "ID bot tidak disediakan." },
        { status: 400 }
      );
    }

    await prisma.telegramBot.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[BotsAPI] Failed to delete bot:", error.message);
    return NextResponse.json(
      { error: "Gagal menghapus bot Telegram." },
      { status: 500 }
    );
  }
}
