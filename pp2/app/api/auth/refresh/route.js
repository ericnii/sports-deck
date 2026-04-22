import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "@/prisma/db";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = "1h";

/**
 * POST /api/auth/refresh
 * Validates a refresh token and issues a new access token
 */
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refreshToken")?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: "No refresh token provided." },
        { status: 401 }
      );
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_SECRET);
    } catch (err) {
      return NextResponse.json(
        { error: "Invalid or expired refresh token." },
        { status: 401 }
      );
    }

    const { userId } = decoded;

    // Verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User no longer exists." },
        { status: 401 }
      );
    }

    // Generate a new short-lived access token
    const newAuthToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        username: user.username,
        role: user.role, // role might be used so it's good to include
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    const isProd = process.env.NODE_ENV === "production";
    const response = NextResponse.json(
      { message: "Token refreshed successfully." },
      { status: 200 }
    );

    response.cookies.set({
      name: "authToken",
      value: newAuthToken,
      httpOnly: true,
      secure: isProd,
      sameSite: "strict",
      maxAge: 60 * 60, // 1 hour
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[Refresh Token Error]:", error.message);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
