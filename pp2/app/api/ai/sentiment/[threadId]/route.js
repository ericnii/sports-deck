import { NextResponse } from "next/server";
import { prisma } from "@/prisma/db";
import { GoogleGenAI } from "@google/genai";

// In-memory cache for sentiment analysis results
// Cache structure: { threadId: { result, timestamp } }
const sentimentCache = new Map();

// Cache expiration time in milliseconds (1 hour)
const CACHE_EXPIRATION = 60 * 60 * 1000;

// Google Gemini API configuration
const ai = new GoogleGenAI({});
const GOOGLE_GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Helper function to send text to Google Gemini API for sentiment analysis
 * Returns a sentiment label and score based on Gemini's analysis
 */
async function analyzeSentimentWithGemini(text) {
  if (!GOOGLE_GEMINI_API_KEY) {
    throw new Error("GOOGLE_GEMINI_API_KEY environment variable is not set");
  }

  // Truncate text if it's too long to avoid token limit issues
  const maxLength = 5000;
  const truncatedText =
    text.length > maxLength ? text.substring(0, maxLength) : text;

  const prompt = `Analyze the sentiment of the following text and respond ONLY with a JSON object in this exact format:
{
  "sentiment": "POSITIVE" or "NEGATIVE" or "MIXED",
  "score": (a number between 0 and 1 where 1 is most positive)
}

Text to analyze:
${truncatedText}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    console.log(response.text);


    // Extract the text content from Gemini's response

    const responseText = response.text.trim().toString();

    // Parse the JSON response from Gemini
    // Remove markdown code blocks if present
    const jsonMatch = responseText.match(/\{[^}]+\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : responseText;

    const sentimentData = JSON.parse(jsonString);

    // Validate the response
    if (
      sentimentData.sentiment &&
      ["POSITIVE", "NEGATIVE", "MIXED"].includes(sentimentData.sentiment) &&
      typeof sentimentData.score === "number"
    ) {
      return {
        sentiment: sentimentData.sentiment,
        score: Math.min(1, Math.max(0, sentimentData.score)), // Ensure score is between 0 and 1
      };
    }

    // Fallback response if parsing fails
    return { sentiment: "NEUTRAL", score: 0.5 };
  } catch (error) {
    console.error("[Google Gemini API Error]:", error.message);
    throw error;
  }
}

/**
 * Helper function to check if cached result is still valid
 */
function isCacheValid(cacheEntry) {
  const now = Date.now();
  return now - cacheEntry.timestamp < CACHE_EXPIRATION;
}

/**
 * Helper function to aggregate sentiment scores
 */
function aggregateSentimentScores(scores) {
  if (scores.length === 0) {
    return { sentiment: "NEUTRAL", score: 0.5 };
  }

  const avgScore =
    scores.reduce((sum, score) => sum + score, 0) / scores.length;

  if (avgScore > 0.65) {
    return { sentiment: "POSITIVE", score: avgScore };
  } else if (avgScore < 0.35) {
    return { sentiment: "NEGATIVE", score: avgScore };
  } else {
    return { sentiment: "MIXED", score: avgScore };
  }
}

/**
 * GET /api/ai/sentiment/[threadId]
 * Analyzes the sentiment of all comments in a thread using AI
 * Groups sentiments by team and returns overall sentiment
 */
export async function GET(request, { params }) {
  try {
    const { threadId } = await params;

    // Validate threadId
    if (!threadId || isNaN(parseInt(threadId))) {
      return NextResponse.json(
        {
          error: "Invalid threadId. Must be a valid number.",
        },
        { status: 400 },
      );
    }

    const threadIdNum = parseInt(threadId);

    // Check in-memory cache first
    if (sentimentCache.has(threadIdNum)) {
      const cacheEntry = sentimentCache.get(threadIdNum);
      if (isCacheValid(cacheEntry)) {
        console.log(`[Sentiment] Cache hit for threadId ${threadIdNum}`);
        return NextResponse.json(cacheEntry.result, { status: 200 });
      } else {
        // Cache expired, remove it
        sentimentCache.delete(threadIdNum);
      }
    }

    // Fetch thread with all associated posts and authors
    const thread = await prisma.thread.findUnique({
      where: { id: threadIdNum },
      include: {
        posts: {
          include: {
            author: {
              select: {
                username: true,
                favoriteTeamId: true,
              },
            },
          },
        },
        match: {
          include: {
            homeTeam: {
              select: {
                id: true,
                name: true,
              },
            },
            awayTeam: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // If thread doesn't exist, return 404
    if (!thread) {
      return NextResponse.json(
        {
          error: "Thread not found.",
        },
        { status: 404 },
      );
    }

    // If no posts in thread, return neutral sentiment
    if (thread.posts.length === 0) {
      const emptyResult = {
        threadId: threadIdNum,
        threadTitle: thread.title,
        overallSentiment: {
          sentiment: "NEUTRAL",
          score: 0.5,
          message: "No comments to analyze.",
        },
        teamSentiments: [],
        totalComments: 0,
        cachedAt: new Date(),
      };

      // Cache the result
      sentimentCache.set(threadIdNum, {
        result: emptyResult,
        timestamp: Date.now(),
      });

      return NextResponse.json(emptyResult, { status: 200 });
    }

    // Aggregate comments by team
    const teamComments = new Map();
    const allCommentTexts = [];

    for (const post of thread.posts) {
      allCommentTexts.push(post.textContent);

      const teamId = post.author?.favoriteTeamId || "neutral";

      if (!teamComments.has(teamId)) {
        teamComments.set(teamId, []);
      }
      teamComments.get(teamId).push(post.textContent);
    }

    // Analyze overall sentiment
    const overallText = allCommentTexts.join(" ");
    let overallSentiment;
    try {
      overallSentiment = await analyzeSentimentWithGemini(overallText);
    } catch (error) {
      return NextResponse.json(
        {
          error: "Failed to analyze sentiment. AI service is unavailable.",
          details: error.message,
        },
        { status: 503 },
      );
    }

    // Analyze team-specific sentiments
    const teamSentiments = [];
    for (const [teamId, comments] of teamComments) {
      try {
        const teamText = comments.join(" ");
        const teamSentiment = await analyzeSentimentWithGemini(teamText);

        // Find team details if this is a valid team ID
        let teamName = "Unknown Team";
        if (teamId !== "neutral") {
          const team = thread.match
            ? [thread.match.homeTeam, thread.match.awayTeam].find(
                (t) => t.id.toString() === teamId,
              )
            : null;
          if (team) {
            teamName = team.name;
          }
        } else {
          teamName = "Other/Unknown Teams";
        }

        teamSentiments.push({
          teamId: teamId === "neutral" ? null : teamId,
          teamName,
          sentiment: teamSentiment.sentiment,
          score: teamSentiment.score,
          commentCount: comments.length,
        });
      } catch (error) {
        console.error(
          `[Sentiment] Error analyzing team ${teamId}:`,
          error.message,
        );
        // Continue with other teams if one fails
      }
    }

    // Build response
    const response = {
      threadId: threadIdNum,
      threadTitle: thread.title,
      overallSentiment: {
        sentiment: overallSentiment.sentiment,
        score: overallSentiment.score,
      },
      teamSentiments: teamSentiments.sort(
        (a, b) => b.commentCount - a.commentCount,
      ),
      totalComments: thread.posts.length,
      matchInfo: thread.match
        ? {
            externalMatchId: thread.match.externalId,
            homeTeam: thread.match.homeTeam.name,
            awayTeam: thread.match.awayTeam.name,
          }
        : null,
      cachedAt: new Date(),
    };

    // Store result in cache
    sentimentCache.set(threadIdNum, {
      result: response,
      timestamp: Date.now(),
    });

    // Optionally, update the Match record with sentiment data (if thread is associated with a match)
    if (thread.match) {
      const homeTeamData = teamSentiments.find(
        (t) => t.teamId === thread.match.homeTeamId.toString(),
      );
      const awayTeamData = teamSentiments.find(
        (t) => t.teamId === thread.match.awayTeamId.toString(),
      );

      try {
        await prisma.match.update({
          where: { id: thread.match.id },
          data: {
            sentiment: overallSentiment.sentiment,
            homeSentiment: homeTeamData ? homeTeamData.score : null,
            awaySentiment: awayTeamData ? awayTeamData.score : null,
          },
        });
      } catch (error) {
        console.error(
          "[Sentiment] Error updating Match record:",
          error.message,
        );
        // Don't fail the request if database update fails
      }
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("[Sentiment API 500 Error]:", error);
    return NextResponse.json(
      {
        error:
          "An error occurred during sentiment analysis. Please try again later.",
      },
      { status: 500 },
    );
  }
}
