import { prisma } from "@/prisma/db.js";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { createAutoReportIfToxic } from "@/lib/moderation.js";

export async function GET(request, { params }) {
  try {
    const { thread_id: threadIdParam } = await params;
    const threadId = parseInt(threadIdParam, 10);

    if (!threadIdParam || isNaN(threadId)) {
      return NextResponse.json({ error: "Invalid thread ID" }, { status: 400 });
    }

    const thread = await prisma.thread.findUnique({
      where: { id: threadId },
      select: { title: true, hidden: true }
    });

    if (!thread || thread.hidden) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Fetch all posts for the thread
    const allPosts = await prisma.post.findMany({
      where: { threadId, hidden: false },
      include: { author: { select: { id: true, username: true } } },
      orderBy: { id: 'asc' }
    });
    console.log("allPosts count:", allPosts.length); // if 0, it's the query


    // Helper to build a nested post tree
    function buildPostTree(posts, parentId = null) {
      return posts
        .filter(post => (post.parentPostId ?? null) === parentId)
        .map(post => ({
          ...post,
          replies: buildPostTree(posts, post.id)
        }));
    }

    // Main post(s) have parentPostId === null
    const nestedPosts = buildPostTree(allPosts, null);

    return NextResponse.json({
      threadTitle: thread.title,
      posts: nestedPosts
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { thread_id: threadIdParam } = await params;
    const threadId = parseInt(threadIdParam, 10);

    if (!threadIdParam || isNaN(threadId)) {
      return NextResponse.json({ error: "Invalid thread ID" }, { status: 400 });
    }

    const thread = await prisma.thread.findUnique({
      where: { id: threadId },
    });

    if (!thread || thread.hidden) {
      return NextResponse.json(
        { error: "Thread not found" },
        { status: 404 }
      );
    }

    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }
    if (!decoded.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = await request.json();
    const { textContent, parentPostId } = body;

    if (!textContent || textContent.trim() === "") {
      return NextResponse.json(
        { error: "textContent is required" },
        { status: 400 }
      );
    }
let parentPostIdInt = null;
if (parentPostId !== undefined && parentPostId !== null) {
  parentPostIdInt = parseInt(parentPostId);
  if (isNaN(parentPostIdInt)) {
    return NextResponse.json(
      { error: "Invalid parentPostId" },
      { status: 400 }
    );
  }
  const parentPost = await prisma.post.findUnique({
    where: { id: parentPostIdInt },
  });
  if (!parentPost || parentPost.threadId !== threadId || parentPost.hidden) {
    return NextResponse.json(
      { error: "Parent post not found in this thread" },
      { status: 404 }
    );
  }
}

    const post = await prisma.post.create({
      data: {
        textContent,
        authorId: decoded.userId,
        threadId,
        parentPostId: parentPostIdInt,
      }
    });

    try {
      await createAutoReportIfToxic({
        targetType: "POST",
        targetId: post.id,
        content: textContent,
        reporterId: decoded.userId,
      });
    } catch (moderationError) {
      console.error("Auto moderation failed for created post:", moderationError);
    }

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create post" },
      { status: 500 }
    );
  }
}
