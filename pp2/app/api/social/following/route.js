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
 * GET /api/social/following
 * Retrieves a list of users that the authenticated user is following.
 * Requires a valid JWT in the HTTP-only cookie.
 * Note: Results are sorted by user ID. For sorting by follow time,
 * the schema should be updated to use an explicit join table with timestamps.
 */
export async function GET(request) {
  try {
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
    const userId = decoded.userId;

    // Fetch the authenticated user's following
    const following = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        following: {
          select: {
            id: true,
            username: true,
            avatar: true,
            role: true,
          },
          // Sort following by ID (can be updated to sort by relationship timestamp
          // once schema is updated with explicit join table)
          orderBy: { id: "asc" },
        },
      },
    });

    if (!following) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json(
      {
        following: following.following,
        totalFollowing: following.following.length,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
