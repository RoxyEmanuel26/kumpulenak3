import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db/prisma";
import { verifyPassword } from "../../../../lib/auth/crypto";
import { signJWT } from "../../../../lib/auth/jwt";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
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

    // Sign JWT (session expires in 24 hours)
    const token = await signJWT({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      exp: Date.now() + 24 * 60 * 60 * 1000,
    });

    // Set secure HttpOnly cookie
    const cookieStore = await cookies();
    cookieStore.set({
      name: "admin_session",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 1 day in seconds
      path: "/",
    });

    return NextResponse.json({ success: true, name: admin.name });
  } catch (err) { const error = err as Error;
    console.error("Login API error:", error);
    return NextResponse.json(
      { error: "An internal server error occurred." },
      { status: 500 }
    );
  }
}
