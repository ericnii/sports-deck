/**
 * POST /api/moderation/report: 
 * Submits a user report for an inappropriate post or thread with a provided reason.
 */
import { NextResponse } from 'next/server'
import { prisma } from '../../../../prisma/db.js'
import jwt from "jsonwebtoken"
import { getAiAnalysis } from "@/lib/moderation.js";

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

        const { targetId, targetType, reason, content, reporterId } = await request.json();

        // Validation Checks
        if (!targetId || !reason || !content || !reporterId || !targetType) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (targetType !== 'THREAD' && targetType !== 'POST' && targetType !== 'POLL') {
            return NextResponse.json({ error: "Invalid targetType." }, { status: 400 });
        }

        if (typeof targetId !== "number" || typeof targetType !== "string" || typeof reason !== "string" || typeof content !== "string" || typeof reporterId !== "number") {
            return NextResponse.json({ error: "Invalid Field Types." }, { status: 400 });
        }

        if (targetType === 'THREAD') {
            const thread = await prisma.thread.findUnique({
                where: { id: targetId }
            });

            if (!thread) {
                return NextResponse.json({ error: "Thread does not exist.", threadId: targetId }, { status: 400 });
            }
        }

        if (targetType === 'POST') {
            const post = await prisma.post.findUnique({
                where: { id: targetId }
            });

            if (!post) {
                return NextResponse.json({ error: "Post does not exist.", post: targetId }, { status: 400 });
            }
        }

        if (targetType === 'POLL') {
            const post = await prisma.poll.findUnique({
                where: { id: targetId }
            });

            if (!post) {
                return NextResponse.json({ error: "Poll does not exist.", poll: targetId }, { status: 400 });
            }
        }
        
        const reporter = await prisma.user.findUnique({
            where: { id: reporterId }
        });
        if (!reporter) {
            return NextResponse.json({ error: "Invalid reporterId" }, { status: 400 });
        }

        const aiAnalysis = await getAiAnalysis(content, reason);
        const report = await prisma.report.create({
            data: {
                reason: reason,
                reporterId: reporterId,
                // depending on targetType, set thread / post id
                threadId: targetType === 'THREAD' ? targetId : null,
                postId: targetType === 'POST' ? targetId : null,
                pollId: targetType === 'POLL' ? targetId : null,
                status: "PENDING",

                // AI data
                aiVerdict: aiAnalysis?.verdict,
                aiExplanation: aiAnalysis?.explanation,
                toxicityScore: aiAnalysis?.toxicityScore
            }
        });

        return NextResponse.json({ message: "Report submitted successfully", reportId: report.id }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}