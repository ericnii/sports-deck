import { prisma } from "@/prisma/db.js";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
    try {
        const { match_id } = await params;
        const matchId = parseInt(match_id, 10);
        if (!match_id || isNaN(matchId)) {
            return NextResponse.json({ error: "Invalid match ID" }, { status: 400 });
        }
        // Only threads that are linked to this match
        const threads = await prisma.thread.findMany({
            where: {
                externalMatchId: matchId,
                hidden: false,
            },
            orderBy: { createdAt: "desc" }
        });
        return NextResponse.json({ threads });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch threads" }, { status: 500 });
    }
}
