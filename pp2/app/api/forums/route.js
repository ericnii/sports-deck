import { prisma } from "@/prisma/db.js";
import { NextResponse } from "next/server";

export async function GET(req) {
    // This route fetches forums and creates general forum if it doesn't exist
    // For match thread creation, use GET /api/forums/matches

    try {
        // Ensure general forum exists
        let generalForum = await prisma.forum.findFirst({
            where: { 
                teamId: null,
                name: "General Discussion"
            }
        });
        
        if (!generalForum) {
            generalForum = await prisma.forum.create({
                data: {
                    name: "General Discussion",
                },
            });
        }

        const forums = await prisma.forum.findMany({
            where: { teamId: null },
        });

        return NextResponse.json(forums);
    } catch (error) {
        console.error("Forum error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}