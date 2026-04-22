import { NextResponse } from "next/server";
import { prisma } from "@/prisma/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = "1h";
const REFRESH_JWT_EXPIRY = "7d";

/**
 * POST /api/auth/login
 * Authenticates the user using email and password, and returns a JWT as an HTTP-only cookie.
 * Future Enhancement: Can be extended to support OAuth/SSO providers (Google, GitHub, etc.)
 */
export async function POST(request) {
  try {
    // Parse request body
    const body = await request.json();
    const { email, password } = body;

    // Validation: Check if required fields are present
    if (!email || !password) {
      return NextResponse.json(
        { error: "Missing required fields: email and password are required." },
        { status: 400 },
      );
    }

    // Find the user in the database by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        {
          error: "Invalid email or password.",
        },
        { status: 401 },
      );
    }

    // Compare the provided password with the hashed password in the database
    const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordMatch) {
      return NextResponse.json(
        {
          error: "Invalid email or password.",
        },
        { status: 401 },
      );
    }

    // Generate a short-lived JWT access token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        username: user.username,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY },
    );

    // Generate a long-lived JWT refresh token
    const refreshToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        username: user.username,
      },
      JWT_SECRET,
      { expiresIn: REFRESH_JWT_EXPIRY },
    );

    // Create the response and set the JWT as an HTTP-only, secure cookie
    const response = NextResponse.json(
      {
        message: "Login successful.",
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
        },
      },
      { status: 200 },
    );

    const isProd = process.env.NODE_ENV === "production";

    // Set the access token cookie
    response.cookies.set({
      name: "authToken",
      value: token,
      httpOnly: true,
      secure: isProd,
      sameSite: "strict",
      maxAge: 60 * 60, // 1 hour in seconds
      path: "/",
    });

    // Set the refresh token cookie
    response.cookies.set({
      name: "refreshToken",
      value: refreshToken,
      httpOnly: true,
      secure: isProd,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: "/",
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error: "An error occurred during login. Please try again later.",
      },
      { status: 500 },
    );
  }
}
