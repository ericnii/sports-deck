import { prisma } from "@/prisma/db.js";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { createAutoReportIfToxic } from "@/lib/moderation.js";

export async function GET(req, { params }) {
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
        console.error(error);
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

    const { textContent, parentPostId } = await request.json();

    if (!textContent || typeof textContent !== "string" || textContent.trim() === "") {
      return NextResponse.json({ error: "Invalid post content" }, { status: 400 });
    }

    if (!parentPostId || isNaN(parseInt(parentPostId))) {
      return NextResponse.json({ error: "Invalid parent post ID" }, { status: 400 });
    }

    const thread = await prisma.thread.findUnique({
      where: { id: threadId }
    });

    if (!thread || thread.hidden) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    const parentPost = await prisma.post.findUnique({
      where: { id: parseInt(parentPostId) }
    });
    
    if (!parentPost || parentPost.threadId !== threadId || parentPost.hidden) {
      return NextResponse.json({ error: "Parent post not found in this thread" }, { status: 404 });
    }

    const post = await prisma.post.create({
      data: {
        textContent,
        authorId: decoded.userId,
        threadId: threadId,
        parentPostId: parseInt(parentPostId)
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
    console.error("Error:", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}