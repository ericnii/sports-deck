/**
 * GET /api/league/standings: 
 * Retrieves the league standings and tables with relevant details.
 */
import { prisma } from "../../../../prisma/db.js"
import { NextResponse } from 'next/server';
const { getStandings } = require("@/lib/football-api");

export async function GET(request) {
    try {
        const now = Date.now();

        let localStandings = await prisma.standing.findMany({
            where: { type: 'TOTAL' },
            include: { team: true },
            orderBy: { position: 'asc' }
        });

        const isDbEmpty = localStandings.length === 0;
        const isDbStale = !isDbEmpty && (new Date() - new Date(localStandings[0].updatedAt) > 3600000);

        if (isDbEmpty || isDbStale) {
            await getStandings("PL");
            
            const standings = await prisma.standing.findMany({
            where: { type: 'TOTAL' },
            include: { team: true },
            orderBy: { position: 'asc' }
            });
            console.log("Standings in DB stale, updated via API call.");
            return NextResponse.json(standings, {status: 200});
        }
        console.log("Standings read from local DB");
        return NextResponse.json(localStandings, {status: 200});
    } catch(error) {
        return Response.json({
        success: false,
        error: error.message,
        }, { status: 500 });
    }
}