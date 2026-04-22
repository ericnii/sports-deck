"use client";

import React, { useState } from "react";

interface TranslateButtonProps {
  originalText: string;
}

export default function TranslateButton({
  originalText,
}: TranslateButtonProps) {
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTranslate = async () => {
    if (!originalText || originalText.trim().length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: originalText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Translation failed.");
      }

      setTranslatedText(data.translatedText);
    } catch (err: any) {
      setError(err.message || "An error occurred.");
      // Hide error after 4 seconds
      setTimeout(() => {
        setError(null);
      }, 4000);
    } finally {
      setIsLoading(false);
    }
  };

  // If translation is successful, hide the button and show the translated text softly
  if (translatedText) {
    return (
      <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-300 border-l-2 border-indigo-400 dark:border-indigo-500 pl-3">
        <span className="text-xs font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5 opacity-80">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
            />
          </svg>
          Translated Sequence
        </span>
        <p className="whitespace-pre-wrap leading-relaxed">
          {translatedText}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-2 flex items-center gap-3">
      <button
        onClick={handleTranslate}
        disabled={isLoading}
        title="Translate to English"
        className="group flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <svg
            className="w-3.5 h-3.5 animate-spin text-indigo-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        ) : (
          <svg
            className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
        <span>{isLoading ? "Translating..." : "Translate to English"}</span>
      </button>

      {error && (
        <span className="text-xs text-red-500 font-medium transition-opacity animate-pulse">
          {error}
        </span>
      )}
    </div>
  );
}
