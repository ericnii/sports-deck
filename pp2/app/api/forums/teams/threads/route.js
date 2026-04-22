import { prisma } from "@/prisma/db.js";
import { getTeams } from "@/lib/football-api.js";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { createAutoReportIfToxic } from "@/lib/moderation.js";

export async function GET(req) {
    try {
        const title = req.nextUrl.searchParams.get('title');
        const author = req.nextUrl.searchParams.get('author');
        const team = req.nextUrl.searchParams.get('team');
        const tags = req.nextUrl.searchParams.get('tags');

        let where = {
          forum: { teamId: { not: null } },  // Only team forum threads, exclude general forum
          hidden: false,
        };

        if (title) {
            where.title = { contains: title };
        }
        
        if (author) {
            where.author = { username: { contains: author } };
        }
        
        if (team) {
            where.forum = { teamId: parseInt(team) };
        }

        // Fetch threads with basic filters
        const threads = await prisma.thread.findMany({
            where
        });

        // Apply tag filtering in JavaScript (since tags is Json field)
        if (tags) {
            const tagsArray = tags.split(',').map(tag => tag.trim());
            const filteredThreads = threads.filter(thread => {
                if (!thread.tags) return false;
                return tagsArray.every(tag => thread.tags.includes(tag));
            });
            return NextResponse.json(filteredThreads);
        }

        return NextResponse.json(threads);

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch threads" }, { status: 500 });
    }
}

// create team forum threads
export async function POST(request) {
  try {
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

    // expects: { title: string, content: string, teamId: number, tags?: string[] }
    const body = await request.json();
    const { title, content, teamId, tags } = body;

    if (!teamId) {
      return NextResponse.json({error: "teamId is required"}, {status: 400});
    }

    const teamForum = await prisma.forum.findFirst({
      where: { teamId: parseInt(teamId) }
    });

    if (!teamForum) {
      return NextResponse.json({error: "Team forum not found"}, {status: 404});
    }

    const thread = await prisma.thread.create({
      data: {
        title,
        tags: tags,
        forumId: teamForum.id,
        authorId: decoded.userId  // ← authenticated user
      }
    });

    // Create the main post for the thread
    const post = await prisma.post.create({
      data: {
        textContent: content,
        authorId: decoded.userId,
        threadId: thread.id
      }
    });

    try {
      await createAutoReportIfToxic({
        targetType: "THREAD",
        targetId: thread.id,
        content: `Title: ${title}\nTags: ${(tags || []).join(", ")}\nContent: ${content}`,
        reporterId: decoded.userId,
      });

      await createAutoReportIfToxic({
        targetType: "POST",
        targetId: post.id,
        content,
        reporterId: decoded.userId,
      });
    } catch (moderationError) {
      console.error("Auto moderation failed for created team thread/post:", moderationError);
    }

    return NextResponse.json({ ...thread, mainPost: post }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create thread" }, { status: 500 });
  }
}

