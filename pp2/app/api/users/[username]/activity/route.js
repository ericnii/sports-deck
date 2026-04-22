import { NextResponse } from "next/server";
import { prisma } from "@/prisma/db";

/**
 * GET /api/users/:username/activity
 * Retrieves data to power the user's activity chart based on
 * their post and comment authoring history over a specific period.
 *
 * Query Parameters:
 * - days: Number of days to include in the activity chart (default: 30)
 */
export async function GET(request, { params }) {
  try {
    const { username } = await params;
    const searchParams = request.nextUrl.searchParams;
    const daysParam = searchParams.get("days");
    const days = daysParam ? parseInt(daysParam) : 30;

    // Validation: Check if username is provided
    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 },
      );
    }

    // Validate days parameter
    if (isNaN(days) || days <= 0) {
      return NextResponse.json(
        { error: "Days must be a positive number" },
        { status: 400 },
      );
    }

    // Calculate the date range
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Fetch user by username
    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    // Return 404 if user not found
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch all posts (including replies) for the user within the date range
    const posts = await prisma.post.findMany({
      where: {
        authorId: user.id,
        createdAt: {
          gte: startDate,
          lte: now,
        },
      },
      select: {
        createdAt: true,
        parentPostId: true,
      },
    });

    // Group posts by date and count activity
    const activityMap = new Map();

    posts.forEach((post) => {
      // Format date as YYYY-MM-DD
      const date = post.createdAt.toISOString().split("T")[0];

      if (!activityMap.has(date)) {
        activityMap.set(date, { posts: 0, comments: 0 });
      }
      
      const counts = activityMap.get(date);
      if (post.parentPostId === null) {
        counts.posts += 1;
      } else {
        counts.comments += 1;
      }
    });

    // Convert map to sorted array
    const activityData = Array.from(activityMap.entries())
      .map(([date, counts]) => ({
        date,
        posts: counts.posts,
        comments: counts.comments,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Build the response
    const response = {
      username,
      period: {
        startDate: startDate.toISOString().split("T")[0],
        endDate: now.toISOString().split("T")[0],
        days,
      },
      totalActivity: posts.length,
      activityByDate: activityData,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
