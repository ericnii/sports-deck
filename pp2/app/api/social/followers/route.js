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
 * GET /api/social/followers
 * Retrieves a list of users who are following the authenticated user.
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

    // Fetch the authenticated user's followers
    const followers = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        followers: {
          select: {
            id: true,
            username: true,
            avatar: true,
            role: true,
          },
          // Sort followers by ID (can be updated to sort by relationship timestamp
          // once schema is updated with explicit join table)
          orderBy: { id: "asc" },
        },
      },
    });

    if (!followers) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json(
      {
        followers: followers.followers,
        totalFollowers: followers.followers.length,
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
