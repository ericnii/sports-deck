import { NextResponse } from "next/server";
import { prisma } from "@/prisma/db";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

// In-memory cache for daily digest
// Cache structure: { dateKey: digest_text }
const digestCache = new Map();

// Google Gemini API configuration
const GOOGLE_GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Helper function to get today's date key for caching
 * Format: YYYY-MM-DD (e.g., "2026-03-06")
 */
function getTodaysCacheKey() {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

/**
 * Helper function to send the data prompt to Google Gemini API
 * Generates a readable, summarized digest
 */
async function generateDigestWithGemini(prompt) {
  if (!GOOGLE_GEMINI_API_KEY) {
    throw new Error("GOOGLE_GEMINI_API_KEY environment variable is not set");
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    console.log(response.text);

    // Return only the digest text string
    return response.text.trim();
  } catch (error) {
    console.error("[Google Gemini Digest Error]:", error.message);
    throw error;
  }
}

/**
 * GET /api/ai/digest
 * Generates an AI-powered daily digest summarizing league standings, recent matches, and top discussions.
 * The digest is cached for the entire day to avoid excessive API calls and rate limiting.
 */
export async function GET(request) {
  try {
    // Get today's cache key
    const cacheKey = getTodaysCacheKey();

    // Check if digest is already cached for today
    if (digestCache.has(cacheKey)) {
      console.log(`[Digest] Cache hit for date ${cacheKey}`);
      return NextResponse.json(
        {
          message: "Daily digest retrieved.",
          digest: digestCache.get(cacheKey),
          date: cacheKey,
          cached: true,
        },
        { status: 200 },
      );
    }

    // Fetch league standings
    let standingsData = [];
    try {
      const standings = await prisma.standing.findMany({
        where: { type: "TOTAL" }, // Assuming standings have a 'type' field
        include: {
          team: {
            select: {
              name: true,
              tla: true,
            },
          },
        },
        orderBy: {
          position: "asc",
        },
        take: 10, // Top 10 teams only
      });

      standingsData = standings.map((s) => ({
        position: s.position,
        team: s.team.name,
        points: s.points,
        played: s.playedGames,
        won: s.won,
        draw: s.draw,
        lost: s.lost,
        goalDiff: s.goalDifference,
      }));
    } catch (error) {
      console.error("[Digest] Error fetching standings:", error.message);
      standingsData = [];
    }

    // Fetch matches from the past 24 hours
    let matchesData = [];
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const recentMatches = await prisma.match.findMany({
        where: {
          utcDate: {
            gte: oneDayAgo,
          },
          status: { in: ["completed", "live"] },
        },
        include: {
          homeTeam: {
            select: {
              name: true,
            },
          },
          awayTeam: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          utcDate: "desc",
        },
        take: 10, // Limit to 10 recent matches
      });

      matchesData = recentMatches.map((m) => ({
        homeTeam: m.homeTeam.name,
        awayTeam: m.awayTeam.name,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        status: m.status,
        date: m.utcDate,
      }));
    } catch (error) {
      console.error("[Digest] Error fetching matches:", error.message);
      matchesData = [];
    }

    // Fetch the most active discussion threads
    let threadsData = [];
    try {
      const activeThreads = await prisma.thread.findMany({
        include: {
          posts: {
            select: {
              id: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10, // Top 10 most recent threads
      });

      threadsData = activeThreads
        .map((t) => ({
          title: t.title,
          content: t.content.substring(0, 200), // Preview of first 200 chars
          postCount: t.posts.length,
          createdAt: t.createdAt,
        }))
        .sort((a, b) => b.postCount - a.postCount) // Sort by post count
        .slice(0, 5); // Take top 5 by activity
    } catch (error) {
      console.error("[Digest] Error fetching threads:", error.message);
      threadsData = [];
    }

    // Format the data into a readable prompt for Gemini
    const digestPrompt = `Generate a professional and engaging daily sports forum digest summarizing the following information. Make it concise, readable, and suitable for posting as a forum digest. Be enthusiastic but maintain professionalism.

TODAY'S DATE: ${new Date().toLocaleDateString()}

TOP LEAGUE STANDINGS (Top 10):
${
  standingsData.length > 0
    ? standingsData
        .map(
          (s) =>
            `${s.position}. ${s.team} - ${s.points}pts (${s.played}GP: ${s.won}W-${s.draw}D-${s.lost}L, GD: ${s.goalDiff})`,
        )
        .join("\n")
    : "No standings data available."
}

RECENT MATCHES (Past 24 Hours):
${
  matchesData.length > 0
    ? matchesData
        .map(
          (m) =>
            `${m.homeTeam} vs ${m.awayTeam}: ${m.homeScore}-${m.awayScore} (${m.status})`,
        )
        .join("\n")
    : "No recent matches."
}

TOP DISCUSSION THREADS:
${
  threadsData.length > 0
    ? threadsData
        .map(
          (t) =>
            `"${t.title}" (${t.postCount} posts) - ${t.content.substring(0, 100)}...`,
        )
        .join("\n")
    : "No active discussions."
}

Please create a well-formatted, engaging digest that summarizes this information in 2-3 paragraphs. Use relevant emojis sparingly. Focus on key highlights and interesting trends.`;

    // Call Gemini API to generate the digest
    let digestText;
    try {
      digestText = await generateDigestWithGemini(digestPrompt);
    } catch (error) {
      return NextResponse.json(
        {
          error: "Failed to generate digest. AI service is unavailable.",
          details: error.message,
        },
        { status: 503 },
      );
    }

    // Cache the digest for the entire day
    digestCache.set(cacheKey, digestText);

    // Clean up old cache entries (keep only today and yesterday)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    for (const key of digestCache.keys()) {
      if (key !== cacheKey && key !== yesterday) {
        digestCache.delete(key);
      }
    }

    // Return 200 OK with the generated digest
    return NextResponse.json(
      {
        message: "Daily digest generated successfully.",
        digest: digestText,
        date: cacheKey,
        cached: false,
      },
      { status: 200 },
    );
  } catch (error) {
    // Log the error for debugging
    console.error("[Daily Digest Error]:", error.message);

    // Return 500 Internal Server Error for unexpected errors
    return NextResponse.json(
      {
        error:
          "An error occurred while generating the daily digest. Please try again later.",
      },
      { status: 500 },
    );
  }
}
