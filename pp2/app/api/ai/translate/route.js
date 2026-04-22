import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// Google Gemini API configuration
const ai = new GoogleGenAI({});
const GOOGLE_GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Helper function to send text to Google Gemini API for translation
 * Translates the provided text into English
 */
async function translateTextWithGemini(text) {
  if (!GOOGLE_GEMINI_API_KEY) {
    throw new Error("GOOGLE_GEMINI_API_KEY environment variable is not set");
  }

  const prompt = `Translate the following text into English. Return ONLY the translated text, nothing else.\n\nText to translate:\n${text}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    console.log(response.text);



    return {
      success: true,
      translatedText: response.text.trim(),
    };
  

  } catch (error) {
    console.error("[Google Gemini Translation Error]:", error.message);
    throw error;
  }
}

/**
 * POST /api/ai/translate
 * Translates a provided post or comment into English using Google Gemini
 * Useful for forums with international users to make content accessible to English speakers
 */
export async function POST(request) {
  try {
    // Parse request body
    const body = await request.json();
    const { text } = body;

    // Validation: Check if text is provided
    if (!text) {
      return NextResponse.json(
        {
          error: "Missing required field: text is required.",
        },
        { status: 400 },
      );
    }

    // Validation: Check if text is a string
    if (typeof text !== "string") {
      return NextResponse.json(
        {
          error: "Invalid field type: text must be a string.",
        },
        { status: 400 },
      );
    }

    // Validation: Check if text is not empty
    const trimmedText = text.trim();
    if (trimmedText.length === 0) {
      return NextResponse.json(
        {
          error: "Invalid field value: text cannot be empty.",
        },
        { status: 400 },
      );
    }

    // Validation: Check reasonable text length (e.g., max 5000 characters)
    if (trimmedText.length > 5000) {
      return NextResponse.json(
        {
          error: "Text exceeds maximum length of 5000 characters.",
        },
        { status: 400 },
      );
    }

    // Call Gemini API to translate the text
    let translationResult;
    try {
      translationResult = await translateTextWithGemini(trimmedText);
    } catch (error) {
      // Return 503 Service Unavailable if the external AI service is down
      return NextResponse.json(
        {
          error:
            "Translation service is currently unavailable. Please try again later.",
          details: error.message,
        },
        { status: 503 },
      );
    }

    // Return 200 OK with the translated text
    return NextResponse.json(
      {
        message: "Text translated successfully.",
        originalText: trimmedText,
        translatedText: translationResult.translatedText,
      },
      { status: 200 },
    );
  } catch (error) {
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          error: "Invalid JSON in request body.",
        },
        { status: 400 },
      );
    }

    // Log the error for debugging
    console.error("[Translation Error]:", error.message);

    // Return 500 Internal Server Error for unexpected errors
    return NextResponse.json(
      {
        error: "An error occurred during translation. Please try again later.",
      },
      { status: 500 },
    );
  }
}
