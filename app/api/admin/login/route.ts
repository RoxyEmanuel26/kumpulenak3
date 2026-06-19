import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db/prisma";
import { verifyPassword } from "../../../../lib/auth/crypto";
import { signJWT } from "../../../../lib/auth/jwt";
import { cookies } from "next/headers";

/**
 * Fix #10: In-memory rate limiter for login attempts.
 * Tracks failed attempts per IP. Allows 5 attempts per 15-minute window.
 */
const LOGIN_ATTEMPTS = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = LOGIN_ATTEMPTS.get(ip);

  if (!record || now > record.resetAt) {
    // Window expired or first attempt — reset
    LOGIN_ATTEMPTS.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  record.count++;
  if (record.count > MAX_ATTEMPTS) {
    return true;
  }

  return false;
}

function getRemainingSeconds(ip: string): number {
  const record = LOGIN_ATTEMPTS.get(ip);
  if (!record) return 0;
  return Math.ceil((record.resetAt - Date.now()) / 1000);
}

// Periodically clean up expired entries to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of LOGIN_ATTEMPTS) {
    if (now > record.resetAt) {
      LOGIN_ATTEMPTS.delete(ip);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes

export async function POST(request: NextRequest) {
  try {
    // Fix #10: Rate limiting
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "unknown";

    if (isRateLimited(ip)) {
      const retryAfter = getRemainingSeconds(ip);
      return NextResponse.json(
        { error: `Too many login attempts. Try again in ${Math.ceil(retryAfter / 60)} minutes.` },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfter) },
        }
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    // Find admin user in database
    const admin = await prisma.adminUser.findUnique({
      where: { email },
    });

    if (!admin) {
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = verifyPassword(password, admin.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 401 }
      );
    }

    // Sign JWT (session expires in 8 hours — Fix #9: reduced from 24h)
    const token = await signJWT({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      exp: Date.now() + 8 * 60 * 60 * 1000,
    });

    // Fix #9: Hardened session cookie
    const cookieStore = await cookies();
    cookieStore.set({
      name: "admin_session",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict", // Fix #9: upgraded from "lax" to "strict"
      maxAge: 60 * 60 * 8, // 8 hours in seconds
      path: "/",
    });

    return NextResponse.json({ success: true, name: admin.name });
  } catch (err) { const error = err as Error;
    console.error("Login API error:", error.message);
    // Fix #14: Don't expose internal error details
    return NextResponse.json(
      { error: "An internal server error occurred." },
      { status: 500 }
    );
  }
}
