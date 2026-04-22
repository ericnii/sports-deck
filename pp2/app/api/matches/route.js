/**
 * GET /api/matches:
 * Returns information about upcoming and recent matches, 
 * including teams, logos, date, venue, and scores. 
 * All communication with the external sports API must go through your backend server
 * acting as a proxy to protect your API key.
 */
import { prisma } from "../../../prisma/db.js"
import { NextResponse } from 'next/server';
const { getAllMatches } = require("@/lib/football-api");

export async function GET(req) {
    const { searchParams } = new URL(req.url);

    const matchday = searchParams.get('matchday');
    const stage = searchParams.get('stage');

    try {
        // Check for all matches (not restricted by date)
        const localMatches = await prisma.match.findMany({
            where: {
                ...(matchday && { matchDay: parseInt(matchday) }),
                ...(stage && { stage: stage })
            },
            orderBy: {
                utcDate: 'asc'
            },
            include: {
                homeTeam: true,
                awayTeam: true
            }
        });

        // Allows isDbEmpty check after to function properly
        if (localMatches.length === 0 && (matchday || stage)) {
            return NextResponse.json([]);
        }

        // If the db is empty OR matches have been last updated more than an hour ago
        const isDbEmpty = localMatches.length === 0;
        const isDbStale = !isDbEmpty && (new Date() - new Date(localMatches[0].updatedAt) > 3600000);

        if (isDbEmpty || isDbStale) {
            console.log("DB matches are stale, updating via API call.");
            await getAllMatches();

            const matches = await prisma.match.findMany({
                where: {
                    ...(matchday && { matchDay: parseInt(matchday) }),
                    ...(stage && { stage: stage })
                },
                orderBy: { utcDate: 'asc' },
                include: {
                    homeTeam: true,
                    awayTeam: true
                }
            });

            return NextResponse.json(matches, { status: 200 });
        }

        console.log("Matches read from db.");
        return NextResponse.json(localMatches, { status: 200 });
    } catch (error) {
        return Response.json({
            success: false,
            error: error.message,
        }, { status: 500 });
    }
}

module.exports = { GET };
