import { prisma } from "@/prisma/db.js";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function GET(req, { params }) {
    try {
        const { thread_id: threadIdParam, poll_Id: pollIdParam } = await params;
        const threadId = parseInt(threadIdParam, 10);
        const pollId = parseInt(pollIdParam, 10);
        
        if (!threadIdParam || isNaN(threadId)) {
            return NextResponse.json({ error: "Invalid thread ID" }, { status: 400 });
        }

        if (!pollIdParam || isNaN(pollId)) {
            return NextResponse.json({ error: "Invalid poll ID" }, { status: 400 });
        }

        const poll = await prisma.poll.findUnique({
            where: { id: pollId }
        });

        if (!poll || poll.threadId !== threadId) {
            return NextResponse.json({ error: "No polls found for this thread" }, { status: 404 });
        }

        const thread = await prisma.thread.findUnique({ where: { id: threadId }, select: { hidden: true } });

        if (!thread || thread.hidden || poll.hidden) {
            return NextResponse.json({ error: "Poll not found" }, { status: 404 });
        }

        return NextResponse.json(poll);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch polls" }, { status: 500 });
    }
}

export async function PUT(req, { params }) {
    try {
        const { thread_id: threadIdParam, poll_Id: pollIdParam } = await params;
        const threadId = parseInt(threadIdParam, 10);
        const pollId = parseInt(pollIdParam, 10);
        
        if (!threadIdParam || isNaN(threadId)) {
            return NextResponse.json({ error: "Invalid thread ID" }, { status: 400 });
        }

        if (!pollIdParam || isNaN(pollId)) {
            return NextResponse.json({ error: "Invalid poll ID" }, { status: 400 });
        }
        // Read authToken from request headers for client-side fetch compatibility
        const cookie = req.headers.get("cookie") || "";
        const match = cookie.match(/authToken=([^;]+)/);
        if (!match) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        let decoded;
        try {
            decoded = jwt.verify(match[1], process.env.JWT_SECRET);
        } catch (err) {
            return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
        }
        if (!decoded.userId) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }
        
        const { optionIndex } = await req.json();
        
        if (!optionIndex && optionIndex !== 0) {
            return NextResponse.json({ error: "Invalid poll option index" }, { status: 400 });
        }

        const poll = await prisma.poll.findUnique({
            where: { id: pollId }
        });

        if (!poll || poll.threadId !== threadId) {
            return NextResponse.json({ error: "Poll not found for this thread" }, { status: 404 });
        }

        const thread = await prisma.thread.findUnique({ where: { id: threadId }, select: { hidden: true } });

        if (!thread || thread.hidden || poll.hidden) {
            return NextResponse.json({ error: "Poll is no longer available" }, { status: 403 });
        }

        if (new Date() > poll.deadline) {
            return NextResponse.json({ error: "Poll voting is closed" }, { status: 403 });
        }

        // Check if user already voted for ANY option
        const hasVoted = Object.values(poll.votes).some(voters => voters.includes(decoded.userId));
        if (hasVoted) {
            return NextResponse.json({ error: "You already voted" }, { status: 400 });
        }

        const updatedVotes = {
            ...poll.votes,
            [optionIndex]: [...(poll.votes[optionIndex] || []), decoded.userId]
        };

        const updatedPoll = await prisma.poll.update({
            where: { id: pollId },
            data: {
                votes: updatedVotes
            }
        });

        return NextResponse.json(updatedPoll);
        

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
    }
}
