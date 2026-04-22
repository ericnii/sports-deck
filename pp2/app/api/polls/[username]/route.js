import { prisma } from "@/prisma/db.js";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
    try {
        const { username } = await params;

        if (!username) {
            return NextResponse.json({ error: "Username required" }, { status: 400 });
        }

        // Get user by username
        const user = await prisma.user.findUnique({
            where: { username }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Get all polls by this user
        const polls = await prisma.poll.findMany({
            where: { authorId: user.id, hidden: false },
            include: {
                thread: true,
                author: {
                    select: {
                        id: true,
                        username: true,
                        avatar: true
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        const visiblePolls = polls.filter((poll) => !poll.thread?.hidden);

        return NextResponse.json(visiblePolls);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch polls" }, { status: 500 });
    }
}
