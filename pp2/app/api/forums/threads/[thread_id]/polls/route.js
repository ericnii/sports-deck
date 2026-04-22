
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
            select: { id: true, title: true, hidden: true },
        });

        if (!thread || thread.hidden) {
            return NextResponse.json({ error: "Thread not found" }, { status: 404 });
        }

        const polls = await prisma.poll.findMany({
            where: { threadId, hidden: false },
            include: {
                author: { select: { username: true } }
            }
        });

        return NextResponse.json({ threadTitle: thread.title, polls });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch polls" }, { status: 500 });
    }
}

export async function POST(req, { params }) {
    try {
        const { thread_id: threadIdParam } = await params;
        const threadId = parseInt(threadIdParam, 10);
        if (!threadIdParam || isNaN(threadId)) {
            return NextResponse.json({ error: "Invalid thread ID" }, { status: 400 });
        }

        const thread = await prisma.thread.findUnique({
            where: { id: threadId },
            select: { hidden: true },
        });

        if (!thread || thread.hidden) {
            return NextResponse.json({ error: "Thread not found" }, { status: 404 });
        }


        const { question, options, deadline } = await req.json();

        if (!question || typeof question !== "string" || question.trim() === "") {
            return NextResponse.json({ error: "Invalid poll question" }, { status: 400 });
        }

        if (!options || !Array.isArray(options)) {
            return NextResponse.json({ error: "Invalid poll options" }, { status: 400 });
        }

        if (!deadline || isNaN(Date.parse(deadline))) {
            return NextResponse.json({ error: "Invalid poll deadline" }, { status: 400 });
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

        const poll = await prisma.poll.create({
            data: {
                question,
                options,
                votes: {},
                threadId,
                authorId: decoded.userId,
                deadline: new Date(deadline)
            }
        });

        try {
            await createAutoReportIfToxic({
                targetType: "POLL",
                targetId: poll.id,
                content: `Question: ${question}\nOptions: ${options.join(" | ")}`,
                reporterId: decoded.userId,
            });
        } catch (moderationError) {
            console.error("Auto moderation failed for created poll:", moderationError);
        }

        return NextResponse.json(poll, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to create poll" }, { status: 500 });
    }
}
