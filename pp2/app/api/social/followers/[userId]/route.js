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
 * DELETE /api/social/followers/:userId:
 * Removes a specific follower from the authenticated user's follower list.
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

    // Validation: User cannot remove themselves as a follower
    if (parseInt(userId) === authenticatedUserId) {
      return NextResponse.json(
        { error: "You cannot remove yourself." },
        { status: 400 },
      );
    }

    // Check if the follower user exists
    const followerUser = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: { id: true },
    });

    if (!followerUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Check if the follower user is actually following the authenticated user
    const isFollowing = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: {
        following: {
          where: { id: authenticatedUserId },
        },
      },
    });

    if (isFollowing.following.length === 0) {
      return NextResponse.json(
        { error: "This user is not following you." },
        { status: 400 },
      );
    }

    // Remove the follower by disconnecting the following relationship from their side
    await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        following: {
          disconnect: { id: authenticatedUserId },
        },
      },
    });

    return NextResponse.json(
      { message: "Successfully removed follower." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error removing follower:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
