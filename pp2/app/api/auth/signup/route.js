import { NextResponse } from "next/server";
import { prisma } from "@/prisma/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

/**
 * POST /api/auth/signup
 * Handles user registration using an email and password.
 */
export async function POST(request) {
  try {
    // Parse request body
    const body = await request.json();
    const { email, password, username } = body;

    if (!email || !password || !username) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: email, password, and username are required.",
        },
        { status: 400 },
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          error: "Invalid email format.",
        },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          error: "Password must be at least 8 characters long.",
        },
        { status: 400 },
      );
    }

    if (username.length < 3 || username.length > 30) {
      return NextResponse.json(
        {
          error: "Username must be between 3 and 30 characters long.",
        },
        { status: 400 },
      );
    }

    const existingEmailUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmailUser) {
      return NextResponse.json(
        {
          error: "An account with this email already exists.",
        },
        { status: 400 },
      );
    }

    const existingUsernameUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUsernameUser) {
      return NextResponse.json(
        {
          error: "An account with this username already exists.",
        },
        { status: 400 },
      );
    }

    // Hash the password using bcrypt
    // The salt rounds determine the computational cost of hashing (higher = more secure but slower)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const newUser = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
      },
    });

    const JWT_SECRET = process.env.JWT_SECRET;
    const isProd = process.env.NODE_ENV === "production";

    // Generate short-lived JWT access token for the new user
    const token = jwt.sign(
      {
        userId: newUser.id, // Using userId consistently with login
        email: newUser.email,
        username: newUser.username,
        role: newUser.role,
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Generate long-lived JWT refresh token
    const refreshToken = jwt.sign(
      {
        userId: newUser.id,
        email: newUser.email,
        username: newUser.username,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Create the response and set the tokens as HTTP-only cookies
    const response = NextResponse.json(
      {
        message: "User created successfully.",
        user: newUser,
      },
      { status: 201 },
    );

    // Set the access token cookie
    response.cookies.set({
      name: "authToken",
      value: token,
      httpOnly: true,
      secure: isProd,
      sameSite: "strict",
      maxAge: 60 * 60, // 1 hour
      path: "/",
    });

    // Set the refresh token cookie
    response.cookies.set({
      name: "refreshToken",
      value: refreshToken,
      httpOnly: true,
      secure: isProd,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error: "An error occurred during signup. Please try again later.",
      },
      { status: 500 },
    );
  }
}
