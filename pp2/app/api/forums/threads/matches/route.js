import { prisma } from "@/prisma/db.js";
import { getMatches } from "@/lib/football-api.js";
import { NextResponse } from "next/server";
import { createAutoReportIfToxic } from "@/lib/moderation.js";

export async function GET() {
  try {
        const threads = await prisma.thread.findMany({
            where: {
                externalMatchId: {
                    not: null,
                },
                hidden: false,
            },
            orderBy: { createdAt: "desc" },
        });
        return NextResponse.json({ threads });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch match threads" }, { status: 500 });
  }
}

export async function POST(req) {
    try {
        console.log("Fetching matches from API..."); 
        const matches = await getMatches();
        console.log("Matches fetched:", matches.length); 
        if (!Array.isArray(matches)) {
            return NextResponse.json({ error: "No matches found" }, { status: 404 });
        }

        const generalForum = await prisma.forum.findFirst({
            where: { teamId: null }
        });

        if (!generalForum) {
            return NextResponse.json({ error: "General forum not found" }, { status: 500 });
        }

        let createdCount = 0;
        const results = [];

        for (const match of matches) {
            const externalId = match.externalId ?? match.id;
            const existingThread = await prisma.thread.findFirst({
                where: { externalMatchId: externalId }
            });
            if (!existingThread) {
                const homeTeam = await prisma.team.findUnique({ where: { id: match.homeTeamId } });
                const awayTeam = await prisma.team.findUnique({ where: { id: match.awayTeamId } });
                const title = `${homeTeam.name} vs ${awayTeam.name} on ${new Date(match.utcDate).toISOString().split('T')[0]}`;
                const thread = await prisma.thread.create({
                    data: {
                        title,
                        tags: ["match-thread"],
                        forumId: generalForum.id,
                        externalMatchId: externalId
                    }
                });
                const post = await prisma.post.create({
                    data: {
                        textContent: `Talk about ${title}`,
                        authorId: null,
                        threadId: thread.id
                    }
                });

                try {
                    await createAutoReportIfToxic({
                        targetType: "THREAD",
                        targetId: thread.id,
                        content: `Title: ${title}\nTags: match-thread`,
                        reporterId: null,
                    });

                    await createAutoReportIfToxic({
                        targetType: "POST",
                        targetId: post.id,
                        content: post.textContent,
                        reporterId: null,
                    });
                } catch (moderationError) {
                    console.error("Auto moderation failed for match-created thread/post:", moderationError);
                }

                createdCount++;
                results.push(thread);
            }
        }

        return NextResponse.json(results, { status: 201 });

    } catch (error) {
        console.error("Error creating match threads:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
