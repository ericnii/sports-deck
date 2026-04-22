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

        // Get all posts by this user
        const posts = await prisma.post.findMany({
            where: {
                authorId: user.id,
                hidden: false,
                thread: {
                    hidden: false,
                },
            }
        });

        return NextResponse.json(posts);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
    }
}
