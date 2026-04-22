/**
 * POST /api/moderation/appeal: 
 * Allows a banned user to submit an appeal request to have restrictions lifted.
 */
import { NextResponse } from 'next/server';
import { prisma } from '../../../../prisma/db.js';
import jwt from "jsonwebtoken"

export async function POST(request) {
    try {
        // Checking if user logged in
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

        const { userId, message } = await request.json();

        if (!userId || typeof userId !== "number") {
            return NextResponse.json({ error: "Invalid userId type." }, { status: 400 });
        }

        if (!message || typeof message !== "string") {
            return NextResponse.json({ error: "Invalid message type." }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.isBanned) {
            return NextResponse.json({ error: "Only banned users can appeal.", userId: userId }, { status: 400 });
        }

        const existingAppeal = await prisma.appeal.findFirst({
            where: { userId: userId, status: "PENDING" }
        });
        if (existingAppeal) {
            return NextResponse.json({ error: "You already have a pending appeal.", userId: userId }, { status: 409 });
        }

        const appeal = await prisma.appeal.create({
            data: {
                userId: userId,
                message: message,
                status: "PENDING"
            }
        });

        return NextResponse.json({ message: "Appeal Successfully Submitted.", appealId: appeal.id, userId: userId }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(request) {
    try {
        // Checking if user logged in
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        const token = cookieStore.get("authToken")?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
        }
        
        // Checking if user is admin
        const verifyUser = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!verifyUser || verifyUser.role !== 'ADMIN') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const appeals = await prisma.appeal.findMany({
            include: { user: true },
            orderBy: { id: 'desc' }
        });

        // Add context to each appeal
        const appealsWithContext = await Promise.all(appeals.map(async (appeal) => {
            const hiddenThreads = await prisma.thread.findMany({
                where: { authorId: appeal.userId, hidden: true },
                select: { id: true, title: true, createdAt: true }
            });
            const hiddenPosts = await prisma.post.findMany({
                where: { authorId: appeal.userId, hidden: true },
                select: { id: true, textContent: true, createdAt: true }
            });

            return {
                ...appeal,
                bannedThreads: hiddenThreads,
                bannedPosts: hiddenPosts
            };
        }));

        return NextResponse.json({ appeals: appealsWithContext }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}