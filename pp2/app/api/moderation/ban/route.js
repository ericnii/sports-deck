/**
 * POST /api/moderation/ban: 
 * Admin-only endpoint to approve or dismiss reports that ban users, restricting their ability to post, follow, or vote.
 */
import { prisma } from "../../../../prisma/db.js"
import { NextResponse } from "next/server"
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

        // Checking if user is admin
        const verifyUser = await prisma.user.findUnique({
            where: { id: decoded.userId }
        });
        if (!verifyUser) {
            return NextResponse.json({ error: "Appeal user id does not exist.", appealId: appealId }, { status: 400 });
        } else if (verifyUser.role !== 'ADMIN') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // conclusion must be one of "APPROVED", "HIDE_ONLY", and "DISMISSED"
        const { reportId, conclusion } = await request.json();

        if (!reportId || typeof reportId !== "number") {
            return NextResponse.json({ error: "Invalid reportId." }, { status: 400 });
        }

        if (!conclusion || typeof conclusion !== "string" || (conclusion !== "APPROVED" && conclusion !== "HIDE_ONLY" && conclusion !== "DISMISSED")) {
            return NextResponse.json({ error: "Invalid conclusion." })
        }

        const report = await prisma.report.findUnique({ where: { id: reportId } });

        // Reports already dismissed cannot be changed.
        if (report.status !== "PENDING") {
            return NextResponse.json({ error: "Report has already been resolved." }, { status: 400 })
        }

        if (conclusion === "DISMISSED") {
            await prisma.report.update({ where: { id: reportId }, data: { status: "DISMISSED" } });
            return NextResponse.json({ message: "Report successfully dismissed.", reportId: reportId }, { status: 200 });
        }

        let userToBan = null;

        if (report.postId) {
            const post = await prisma.post.findUnique({ where: { id: report.postId } });
            if (post) {
                userToBan = post.authorId;
                await prisma.post.update({
                    where: { id: report.postId },
                    data: { hidden: true }
                });
            }

        }

        if (report.threadId) {
            const thread = await prisma.thread.findUnique({ where: { id: report.threadId } });
            if (thread) {
                userToBan = thread.authorId;
                await prisma.thread.update({
                    where: { id: report.threadId },
                    data: { hidden: true }
                });
            }
        }

        if (report.pollId) {
            const poll = await prisma.poll.findUnique({ where: { id: report.pollId } });
            if (poll) {
                userToBan = poll.authorId;
                await prisma.poll.update({
                    where: { id: report.pollId },
                    data: { hidden: true }
                });
            }
        }

        await prisma.report.update({
            where: { id: reportId },
            data: { status: "APPROVED" }
        });

        if (conclusion === "APPROVED" && userToBan) {
            await prisma.user.update({
                where: { id: userToBan },
                data: { isBanned: true }
            })
        }

        if (conclusion === "HIDE_ONLY") {
            return NextResponse.json({ message: "Report approved. Content hidden without banning user.", reportId: reportId, userId: userToBan }, { status: 200 });
        }

        return NextResponse.json({ message: "Report successfully approved and user banned.", reportId: reportId, userId: userToBan }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}