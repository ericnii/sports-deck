/**
 * GET /api/moderation/queue: 
 * Admin-only endpoint to view reported items, sorted by the number of user reports and AI-generated verdicts.
 */
import { prisma } from "../../../../prisma/db.js"
import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"

export async function GET(request) {
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

        const queue = await prisma.report.findMany({
            where: { status: "PENDING" },
            orderBy: [
                { toxicityScore: 'desc' },
                { createdAt: 'asc' }
            ],
            include: { reporter: true }
        });

        const threadIds = [...new Set(queue.map((r) => r.threadId).filter(Boolean))];
        const postIds = [...new Set(queue.map((r) => r.postId).filter(Boolean))];
        const pollIds = [...new Set(queue.map((r) => r.pollId).filter(Boolean))];

        const [threads, posts, polls] = await Promise.all([
            threadIds.length
                ? prisma.thread.findMany({
                    where: { id: { in: threadIds } },
                    select: { id: true, authorId: true, forum: { select: { teamId: true } } }
                })
                : Promise.resolve([]),
            postIds.length
                ? prisma.post.findMany({
                    where: { id: { in: postIds } },
                    select: { id: true, authorId: true, threadId: true, thread: { select: { forum: { select: { teamId: true } } } } }
                })
                : Promise.resolve([]),
            pollIds.length
                ? prisma.poll.findMany({
                    where: { id: { in: pollIds } },
                    select: { id: true, authorId: true, threadId: true, thread: { select: { forum: { select: { teamId: true } } } } }
                })
                : Promise.resolve([]),
        ]);

        const threadAuthorMap = new Map(threads.map((t) => [t.id, t.authorId]));
        const postAuthorMap = new Map(posts.map((p) => [p.id, p.authorId]));
        const pollAuthorMap = new Map(polls.map((p) => [p.id, p.authorId]));

        const allReports = await prisma.report.findMany({
            select: { threadId: true, postId: true, pollId: true },
        });

        const allThreadIds = [...new Set(allReports.map((r) => r.threadId).filter(Boolean))];
        const allPostIds = [...new Set(allReports.map((r) => r.postId).filter(Boolean))];
        const allPollIds = [...new Set(allReports.map((r) => r.pollId).filter(Boolean))];

        const [allThreadsForCounts, allPostsForCounts, allPollsForCounts] = await Promise.all([
            allThreadIds.length
                ? prisma.thread.findMany({ where: { id: { in: allThreadIds } }, select: { id: true, authorId: true } })
                : Promise.resolve([]),
            allPostIds.length
                ? prisma.post.findMany({ where: { id: { in: allPostIds } }, select: { id: true, authorId: true } })
                : Promise.resolve([]),
            allPollIds.length
                ? prisma.poll.findMany({ where: { id: { in: allPollIds } }, select: { id: true, authorId: true } })
                : Promise.resolve([]),
        ]);

        const threadAuthorCountMap = new Map(allThreadsForCounts.map((t) => [t.id, t.authorId]));
        const postAuthorCountMap = new Map(allPostsForCounts.map((p) => [p.id, p.authorId]));
        const pollAuthorCountMap = new Map(allPollsForCounts.map((p) => [p.id, p.authorId]));

        const totalReportsByUserId = new Map();
        for (const report of allReports) {
            let targetUserId = null;
            if (report.threadId) {
                targetUserId = threadAuthorCountMap.get(report.threadId) ?? null;
            } else if (report.postId) {
                targetUserId = postAuthorCountMap.get(report.postId) ?? null;
            } else if (report.pollId) {
                targetUserId = pollAuthorCountMap.get(report.pollId) ?? null;
            }
            if (targetUserId) {
                totalReportsByUserId.set(targetUserId, (totalReportsByUserId.get(targetUserId) || 0) + 1);
            }
        }

        const targetUserIds = [...new Set(queue.map((report) => {
            if (report.threadId) return threadAuthorMap.get(report.threadId) || null;
            if (report.postId) return postAuthorMap.get(report.postId) || null;
            if (report.pollId) return pollAuthorMap.get(report.pollId) || null;
            return null;
        }).filter(Boolean))];

        const targetUsers = targetUserIds.length
            ? await prisma.user.findMany({ where: { id: { in: targetUserIds } }, select: { id: true, username: true } })
            : [];
        const targetUserMap = new Map(targetUsers.map((u) => [u.id, u]));

        const threadRouteMap = new Map(
            threads.map((thread) => {
                const base = thread.forum?.teamId ? `/forums/teams/threads/${thread.id}` : `/forums/threads/${thread.id}`;
                return [thread.id, base];
            })
        );

        const postRouteMap = new Map(
            posts.map((post) => {
                const base = post.thread?.forum?.teamId
                    ? `/forums/teams/threads/${post.threadId}`
                    : `/forums/threads/${post.threadId}`;
                return [post.id, `${base}#post-${post.id}`];
            })
        );

        const pollRouteMap = new Map(
            polls.map((poll) => {
                const base = poll.thread?.forum?.teamId
                    ? `/forums/teams/threads/${poll.threadId}/polls`
                    : `/forums/threads/${poll.threadId}/polls`;
                return [poll.id, `${base}#poll-${poll.id}`];
            })
        );

        const enrichedQueue = queue.map((report) => {
            const contextRoute = report.threadId
                ? threadRouteMap.get(report.threadId)
                : report.postId
                    ? postRouteMap.get(report.postId)
                    : report.pollId
                        ? pollRouteMap.get(report.pollId)
                        : null;

            const targetUserId = report.threadId
                ? threadAuthorMap.get(report.threadId) || null
                : report.postId
                    ? postAuthorMap.get(report.postId) || null
                    : report.pollId
                        ? pollAuthorMap.get(report.pollId) || null
                        : null;

            const targetUser = targetUserId ? targetUserMap.get(targetUserId) : null;
            return {
                ...report,
                contextRoute: contextRoute || null,
                targetUser: targetUser
                    ? { id: targetUser.id, username: targetUser.username }
                    : null,
                totalReportsOnUser: targetUserId ? (totalReportsByUserId.get(targetUserId) || 0) : 0,
            };
        });

        return NextResponse.json({ reports: enrichedQueue }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}