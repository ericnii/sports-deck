import { NextResponse } from "next/server";
import { prisma } from "@/prisma/db";

/**
 * GET /api/users/search
 * Fetches users matching the given username query. 
 * Expected query parameter: ?q=string
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ users: [] }, { status: 200 });
    }

    // Perform a case-insensitive search for users containing the query string in their username
    const users = await prisma.user.findMany({
      where: {
        username: {
          contains: query.trim(),
        },
      },
      select: {
        id: true,
        username: true,
        avatar: true,
        role: true,
      },
      take: 5, // Limit results to max 5 for snappy dropdown rendering
      orderBy: {
        username: "asc", // Alphabetical tie-breaker
      },
    });

    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    console.error("[User Search API Error]:", error);
    return NextResponse.json(
      { error: "Internal server error occurred." },
      { status: 500 }
    );
  }
}
