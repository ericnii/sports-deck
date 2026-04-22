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
 * GET /api/feed
 * Generates a personalized dashboard feed for the authenticated user.
 * Includes:
 * - Activity on the user's own posts (replies and comments)
 * - Recent posts from users they follow
 * - Recent updates for their favorite team (threads in team forum)
 * Requires a valid JWT in the HTTP-only cookie.
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

    // Fetch the user's information including favorite team and following
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        favoriteTeamId: true,
        following: {
          select: { id: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const followingIds = user.following.map((f) => f.id);

    // 1. Fetch activity on user's own posts (replies to their posts)
    const postActivity = await prisma.post.findMany({
      where: {
        thread: {
          posts: {
            some: {
              authorId: userId,
            },
          },
        },
        authorId: { not: userId }, // Exclude the user's own posts
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      select: {
        id: true,
        textContent: true,
        createdAt: true,
        author: {
          select: { id: true, username: true, avatar: true },
        },
        thread: {
          select: { id: true, title: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // 2. Fetch recent posts from followed users
    const followingPosts = await prisma.post.findMany({
      where: {
        authorId: { in: followingIds },
        parentPostId: null, // Only main posts, not replies
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      select: {
        id: true,
        textContent: true,
        createdAt: true,
        author: {
          select: { id: true, username: true, avatar: true },
        },
        thread: {
          select: { id: true, title: true },
        },
        replies: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // 3. Fetch team forum updates if user has a favorite team
    let teamThreads = [];
    if (user.favoriteTeamId) {
      const teamIdInt = parseInt(user.favoriteTeamId, 10);
      let team;
      
      // Some users have the explicit string name saved, others have IDs. Handle both safely.
      if (!isNaN(teamIdInt)) {
        team = await prisma.team.findUnique({
          where: { externalId: teamIdInt },
          select: { id: true, name: true, forum: { select: { id: true } } },
        });
      } else {
        team = await prisma.team.findFirst({
          where: { name: user.favoriteTeamId },
          select: { id: true, name: true, forum: { select: { id: true } } },
        });
      }

      if (team && team.forum) {
        teamThreads = await prisma.thread.findMany({
          where: {
            forumId: team.forum.id,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
          select: {
            id: true,
            title: true,
            content: true,
            createdAt: true,
            author: {
              select: { id: true, username: true, avatar: true },
            },
            posts: {
              select: { id: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        });
      }
    }

    // 4. Group the feed items
    const feedItems = [];

    // Add post activity (grouped by thread)
    const postActivityByThread = new Map();
    postActivity.forEach((post) => {
      const threadId = post.thread.id;
      if (!postActivityByThread.has(threadId)) {
        postActivityByThread.set(threadId, {
          type: "post_activity",
          thread: post.thread,
          activity: [],
          createdAt: new Date(0),
        });
      }
      const group = postActivityByThread.get(threadId);
      group.activity.push({
        id: post.id,
        textContent: post.textContent,
        author: post.author,
        createdAt: post.createdAt,
      });
      // Update group's createdAt to the most recent activity
      if (post.createdAt > group.createdAt) {
        group.createdAt = post.createdAt;
      }
    });

    postActivityByThread.forEach((item) => {
      feedItems.push(item);
    });

    // Add following posts
    followingPosts.forEach((post) => {
      feedItems.push({
        type: "following_post",
        id: post.id,
        textContent: post.textContent,
        author: post.author,
        thread: post.thread,
        replyCount: post.replies.length,
        createdAt: post.createdAt,
      });
    });

    // Add team threads
    teamThreads.forEach((thread) => {
      feedItems.push({
        type: "team_update",
        id: thread.id,
        title: thread.title,
        content: thread.content,
        author: thread.author,
        postCount: thread.posts.length,
        createdAt: thread.createdAt,
      });
    });

    // 5. Sort all items by creation date (most recent first)
    feedItems.sort((a, b) => b.createdAt - a.createdAt);

    // 6. Limit to 50 items to avoid overwhelming the frontend
    const limitedFeed = feedItems.slice(0, 50);

    return NextResponse.json(
      {
        feed: limitedFeed,
        totalItems: limitedFeed.length,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching feed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
