import { prisma } from "@/prisma/db.js";
import { getTeams } from "@/lib/football-api.js";
import { NextResponse } from "next/server";

export async function GET(req) {
    try {
        const teamsData = await getTeams();
        if (teamsData.error) {
            return NextResponse.json({ error: teamsData.error }, { status: 500 });
        }
        for (const team of teamsData.teams) {
            const existingTeam = await prisma.team.findFirst({
                where: { externalId: team.id },
            });
            
            if (!existingTeam) {
                await prisma.team.create({
                    data: {
                        name: team.name,
                        externalId: team.id,
                    },
                });
            }

            const teamWithForum = await prisma.team.findUnique({
                where: { externalId: team.id },
                include: { forum: true }
            });

            if (!teamWithForum.forum) {
                await prisma.team.update({
                    where: { externalId: team.id },
                    data: {
                        forum: {
                            create: {
                                name: `${team.name} Forum`,
                            },
                        }
                    }
                });
            }
        }

        const teamForums = await prisma.forum.findMany({
            where: {
                teamId: { not: null }
            }
        });

        return NextResponse.json(teamForums);
    } catch (error) {
        console.error("Team forums error:", error);
        return NextResponse.json({ error: "Failed to fetch team forums" }, { status: 500 });
    }
}