import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "@/prisma/db";

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Helper function to verify JWT from cookies
 * Returns the decoded token if valid, throws an error if invalid or missing
 */
function verifyToken(token) {
  if (!token) {
    throw new Error("No token provided");
  }
  return jwt.verify(token, JWT_SECRET);
}

/**
 * POST /api/social/follow/:userId:
 * Follows another user and updates the follower relationship.
 * Requires a valid JWT in the HTTP-only cookie.
 */
export async function POST(request, { params }) {
  try {
    const { userId } = await params;

    // Read the JWT from the HTTP-only cookie
    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;

    // Verify the JWT token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 },
      );
    }

    // Extract the authenticated user ID from the token
    const authenticatedUserId = decoded.userId;

    // Validation: User cannot follow themselves
    if (parseInt(userId) === authenticatedUserId) {
      return NextResponse.json(
        { error: "You cannot follow yourself." },
        { status: 400 },
      );
    }

    // Check if the target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: { id: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Check if already following
    const existingFollow = await prisma.user.findUnique({
      where: { id: authenticatedUserId },
      select: {
        following: {
          where: { id: parseInt(userId) },
        },
      },
    });

    if (existingFollow.following.length > 0) {
      return NextResponse.json(
        { error: "You are already following this user." },
        { status: 400 },
      );
    }

    // Follow the user by updating the following relationship
    await prisma.user.update({
      where: { id: authenticatedUserId },
      data: {
        following: {
          connect: { id: parseInt(userId) },
        },
      },
    });

    return NextResponse.json(
      { message: "Successfully followed user." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error following user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/social/follow/:userId:
 * Unfollows another user and removes the following relationship.
 * Requires a valid JWT in the HTTP-only cookie.
 */
export async function DELETE(request, { params }) {
  try {
    const { userId } = await params;

    // Read the JWT from the HTTP-only cookie
    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;

    // Verify the JWT token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 },
      );
    }

    // Extract the authenticated user ID from the token
    const authenticatedUserId = decoded.userId;

    // Validation: User cannot unfollow themselves
    if (parseInt(userId) === authenticatedUserId) {
      return NextResponse.json(
        { error: "You cannot unfollow yourself." },
        { status: 400 },
      );
    }

    // Check if the target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: { id: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Check if currently following
    const currentFollow = await prisma.user.findUnique({
      where: { id: authenticatedUserId },
      select: {
        following: {
          where: { id: parseInt(userId) },
        },
      },
    });

    if (currentFollow.following.length === 0) {
      return NextResponse.json(
        { error: "You are not following this user." },
        { status: 400 },
      );
    }

    // Unfollow the user by removing the following relationship
    await prisma.user.update({
      where: { id: authenticatedUserId },
      data: {
        following: {
          disconnect: { id: parseInt(userId) },
        },
      },
    });

    return NextResponse.json(
      { message: "Successfully unfollowed user." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error unfollowing user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
