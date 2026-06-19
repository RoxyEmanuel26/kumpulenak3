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

interface SanitizedRoutingRules {
  order?: string;
  categories?: string[];
  tags?: string[];
}

// Sanitizer to ensure routingRules contains only valid fields and prevents prototype pollution or DB injection
function sanitizeRoutingRules(rules: unknown): SanitizedRoutingRules | null {
  if (!rules || typeof rules !== "object" || Array.isArray(rules)) {
    return null;
  }

  const obj = rules as Record<string, unknown>;
  const sanitized: SanitizedRoutingRules = {};

  if (typeof obj.order === "string") {
    sanitized.order = obj.order;
  }

  if (Array.isArray(obj.categories)) {
    sanitized.categories = obj.categories
      .filter((c): c is string => typeof c === "string")
      .map((c) => c.trim());
  }

  if (Array.isArray(obj.tags)) {
    sanitized.tags = obj.tags
      .filter((t): t is string => typeof t === "string")
      .map((t) => t.trim());
  }

  return sanitized;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, isActive, template, routingRules, botId } = body;

    if (!id || !name) {
      return NextResponse.json(
        { error: "Channel ID and Channel Name are required." },
        { status: 400 }
      );
    }

    if (typeof id !== "string" || typeof name !== "string") {
      return NextResponse.json(
        { error: "Channel ID and Channel Name must be strings." },
        { status: 400 }
      );
    }

    if (template && typeof template !== "string") {
      return NextResponse.json(
        { error: "Template must be a string." },
        { status: 400 }
      );
    }

    if (botId && typeof botId !== "string") {
      return NextResponse.json(
        { error: "Bot ID must be a string." },
        { status: 400 }
      );
    }

    const cleanRoutingRules = routingRules ? sanitizeRoutingRules(routingRules) : null;

    // Upsert the channel
    const channel = await prisma.telegramChannel.upsert({
      where: { id },
      update: {
        name,
        isActive: typeof isActive === "boolean" ? isActive : true,
        template: template || null,
        routingRules: cleanRoutingRules ? JSON.parse(JSON.stringify(cleanRoutingRules)) : null,
        botId: botId || null,
      },
      create: {
        id,
        name,
        isActive: typeof isActive === "boolean" ? isActive : true,
        template: template || null,
        routingRules: cleanRoutingRules ? JSON.parse(JSON.stringify(cleanRoutingRules)) : null,
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
