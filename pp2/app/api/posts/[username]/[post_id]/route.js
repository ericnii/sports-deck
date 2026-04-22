import { prisma } from "@/prisma/db.js";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function GET(req, { params }) {
    try {
        const { username, post_id } = await params;
        const postId = parseInt(post_id, 10);

        if (!username || !post_id || isNaN(postId)) {
            return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { username }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const post = await prisma.post.findUnique({
            where: { id: postId },
            include: {
                thread: {
                    select: { hidden: true }
                }
            }
        });

        if (!post || post.authorId !== user.id || post.hidden || post.thread?.hidden) {
            return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }

        return NextResponse.json(post);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch post" }, { status: 500 });
    }
}

export async function PUT(req, { params }) {
    try {
        const { username, post_id } = await params;
        const postId = parseInt(post_id, 10);

        if (!username || !post_id || isNaN(postId)) {
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

        const user = await prisma.user.findUnique({
            where: { username }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (user.id !== decoded.userId) {
            return NextResponse.json({ error: "Cannot edit other users' posts" }, { status: 403 });
        }

        const post = await prisma.post.findUnique({
            where: { id: postId },
            include: {
                thread: {
                    select: { hidden: true }
                }
            }
        });

        if (!post || post.authorId !== user.id) {
            return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }

        if (post.hidden || post.thread?.hidden) {
            return NextResponse.json({ error: "Post is hidden and cannot be modified" }, { status: 403 });
        }

        const { textContent } = await req.json();

        if (!textContent || typeof textContent !== "string" || textContent.trim() === "") {
            return NextResponse.json({ error: "Post content cannot be empty" }, { status: 400 });
        }

        await prisma.postVersion.create({
            data: {
                postId: post.id,
                content: post.textContent,
                editedAt: new Date()
            }
        });

        const updatedPost = await prisma.post.update({
            where: { id: postId },
            data: {
                textContent,
                updatedAt: new Date()
            }
        });

        return NextResponse.json(updatedPost);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const { username, post_id } = await params;
        const postId = parseInt(post_id, 10);

        if (!username || !post_id || isNaN(postId)) {
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

        const user = await prisma.user.findUnique({
            where: { username }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (user.id !== decoded.userId) {
            return NextResponse.json({ error: "Cannot delete other users' posts" }, { status: 403 });
        }

        const post = await prisma.post.findUnique({
            where: { id: postId },
            include: {
                thread: {
                    select: { hidden: true }
                }
            }
        });

        if (!post || post.authorId !== user.id) {
            return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }

        if (post.hidden || post.thread?.hidden) {
            return NextResponse.json({ error: "Post is hidden and cannot be modified" }, { status: 403 });
        }

        // Soft delete: replace content with [DELETED]
        const deletedPost = await prisma.post.update({
            where: { id: postId },
            data: {
                textContent: "[DELETED]",
                updatedAt: new Date()
            }
        });

        return NextResponse.json({ message: "Post deleted successfully", post: deletedPost });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
    }
}
