import { prisma } from "@/prisma/db.js";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function GET(req, { params }) {
    try {
        const { username, poll_id: pollIdParam } = await params;
        const pollId = parseInt(pollIdParam, 10);

        if (!username || !pollIdParam || isNaN(pollId)) {
            return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
        }

        // Get user by username
        const user = await prisma.user.findUnique({
            where: { username }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Get the poll
        const poll = await prisma.poll.findUnique({
            where: { id: pollId },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        avatar: true
                    }
                },
                thread: true,
                versions: {
                    orderBy: { editedAt: "desc" }
                }
            }
        });

        if (!poll || poll.authorId !== user.id || poll.thread?.hidden || poll.hidden) {
            return NextResponse.json({ error: "Poll not found" }, { status: 404 });
        }

        return NextResponse.json(poll);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch poll" }, { status: 500 });
    }
}

export async function PUT(req, { params }) {
    try {
        const { username, poll_id: pollIdParam } = await params;
        const pollId = parseInt(pollIdParam, 10);

        if (!username || !pollIdParam || isNaN(pollId)) {
            return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
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

        // Get user by username
        const user = await prisma.user.findUnique({
            where: { username }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Verify ownership
        if (user.id !== decoded.userId) {
            return NextResponse.json({ error: "Cannot edit other users' polls" }, { status: 403 });
        }

        // Get the poll
        const poll = await prisma.poll.findUnique({
            where: { id: pollId },
            include: {
                thread: {
                    select: { hidden: true }
                }
            }
        });

        if (!poll || poll.authorId !== user.id) {
            return NextResponse.json({ error: "Poll not found" }, { status: 404 });
        }

        if (poll.thread?.hidden || poll.hidden) {
            return NextResponse.json({ error: "Poll is hidden and cannot be modified" }, { status: 403 });
        }

        const { question, options } = await req.json();

        if (!question || typeof question !== "string" || question.trim() === "") {
            return NextResponse.json({ error: "Poll question cannot be empty" }, { status: 400 });
        }

        if (!options || !Array.isArray(options) || options.length === 0) {
            return NextResponse.json({ error: "Poll must have at least one option" }, { status: 400 });
        }

        // Save version BEFORE updating
        await prisma.pollVersion.create({
            data: {
                pollId: poll.id,
                question: poll.question,
                options: poll.options,
                editedAt: new Date()
            }
        });

        // Update poll
        const updatedPoll = await prisma.poll.update({
            where: { id: pollId },
            data: {
                question,
                options
            },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        avatar: true
                    }
                },
                versions: {
                    orderBy: { editedAt: "desc" }
                }
            }
        });

        return NextResponse.json(updatedPoll);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to update poll" }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const { username, poll_id: pollIdParam } = await params;
        const pollId = parseInt(pollIdParam, 10);

        if (!username || !pollIdParam || isNaN(pollId)) {
            return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
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

        // Get user by username
        const user = await prisma.user.findUnique({
            where: { username }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Verify ownership
        if (user.id !== decoded.userId) {
            return NextResponse.json({ error: "Cannot delete other users' polls" }, { status: 403 });
        }

        // Get the poll
        const poll = await prisma.poll.findUnique({
            where: { id: pollId },
            include: {
                thread: {
                    select: { hidden: true }
                }
            }
        });

        if (!poll || poll.authorId !== user.id) {
            return NextResponse.json({ error: "Poll not found" }, { status: 404 });
        }

        if (poll.thread?.hidden || poll.hidden) {
            return NextResponse.json({ error: "Poll is hidden and cannot be modified" }, { status: 403 });
        }

        // Soft delete: replace question with [DELETED]
        const deletedPoll = await prisma.poll.update({
            where: { id: pollId },
            data: {
                question: "[DELETED]"
            }
        });

        return NextResponse.json({ message: "Poll deleted successfully", poll: deletedPoll });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to delete poll" }, { status: 500 });
    }
}
