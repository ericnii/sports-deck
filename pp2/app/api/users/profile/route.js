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
 * PUT /api/users/profile
 * Allows an authenticated user to update their profile information (username, avatar, favorite team).
 * Requires a valid JWT in the HTTP-only cookie.
 */
export async function PUT(request) {
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
        {
          error: "Unauthorized. Please log in.",
        },
        { status: 401 },
      );
    }

    // Extract the user ID from the verified token
    const userId = decoded.userId;

    // Parse the request body
    const body = await request.json();
    const { username, avatar, favoriteTeamId } = body;

    // Validation: At least one field must be provided to update
    if (!username && !avatar && favoriteTeamId === undefined) {
      return NextResponse.json(
        {
          error:
            "At least one field (username, avatar, or favoriteTeamId) must be provided for update.",
        },
        { status: 400 },
      );
    }

    // Build the update data object dynamically
    const updateData = {};

    // Validate and add username to update data if provided
    if (username !== undefined && username !== null) {
      if (username.length < 3 || username.length > 30) {
        return NextResponse.json(
          {
            error: "Username must be between 3 and 30 characters long.",
          },
          { status: 400 },
        );
      }

      // Check if the new username is already taken by another user
      const existingUser = await prisma.user.findUnique({
        where: { username },
      });

      if (existingUser && existingUser.id !== userId) {
        return NextResponse.json(
          {
            error: "Username is already taken.",
          },
          { status: 400 },
        );
      }

      updateData.username = username;
    }

    // Validate and add avatar to update data if provided
    if (avatar !== undefined && avatar !== null) {
      if (typeof avatar !== "string" || avatar.length === 0) {
        return NextResponse.json(
          {
            error: "Avatar must be a non-empty string URL.",
          },
          { status: 400 },
        );
      }
      updateData.avatar = avatar;
    }

    // Add favoriteTeamId to update data if provided
    if (favoriteTeamId !== undefined) {
      if (favoriteTeamId !== null && typeof favoriteTeamId !== "string") {
        return NextResponse.json(
          {
            error: "favoriteTeamId must be a string or null.",
          },
          { status: 400 },
        );
      }
      updateData.favoriteTeamId = favoriteTeamId;
    }

    // Update the user record in the database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        favoriteTeamId: true,
        role: true,
        // Explicitly exclude password hash from response
      },
    });

    // Return 200 OK with the updated user profile
    return NextResponse.json(
      {
        message: "Profile updated successfully.",
        user: updatedUser,
      },
      { status: 200 },
    );
  } catch (error) {
    // Check if it's a JWT verification error
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return NextResponse.json(
        {
          error: "Unauthorized. Invalid or expired token.",
        },
        { status: 401 },
      );
    }

    return NextResponse.json(
      {
        error:
          "An error occurred while updating the profile. Please try again later.",
      },
      { status: 500 },
    );
  }
}
