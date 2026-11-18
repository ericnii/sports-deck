"use client";

import React, { useState, useEffect, useCallback, ReactNode } from "react";

function renderInlineText(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-bold text-zinc-950 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

function DigestContent({ digest }: { digest: string }) {
  const lines = digest
    .replace(/\\n/g, "\n")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line, index, allLines) => line.length > 0 || allLines[index - 1]?.length > 0);

  const rendered: ReactNode[] = [];
  let bulletItems: string[] = [];

  const flushBullets = () => {
    if (bulletItems.length === 0) return;

    rendered.push(
      <ul key={`bullets-${rendered.length}`} className="my-4 space-y-3">
        {bulletItems.map((item, index) => (
          <li key={index} className="flex gap-3 leading-relaxed">
            <span className="mt-[0.65em] h-1.5 w-1.5 flex-none rounded-full bg-indigo-500 dark:bg-indigo-400" />
            <span>{renderInlineText(item)}</span>
          </li>
        ))}
      </ul>
    );
    bulletItems = [];
  };

  lines.forEach((line, index) => {
    const bulletMatch = line.match(/^(?:[*-]\s+)(.+)$/);
    if (bulletMatch) {
      bulletItems.push(bulletMatch[1]);
      return;
    }

    flushBullets();

    if (!line) return;

    const headingText = line
      .replace(/^#{1,6}\s*/, "")
      .replace(/^\*\*/, "")
      .replace(/\*\*$/, "")
      .replace(/:$/, "")
      .trim();

    const isMarkdownHeading = /^#{1,6}\s/.test(line);
    const isBoldHeading = /^\*\*[^*]+\*\*$/.test(line);
    const isLookingAhead = /^\*{0,2}Looking Ahead:/i.test(line);

    if (isMarkdownHeading || isBoldHeading || isLookingAhead) {
      rendered.push(
        <h3
          key={`heading-${index}`}
          className="mt-6 mb-3 text-xl font-extrabold tracking-tight text-zinc-950 dark:text-white"
        >
          {renderInlineText(headingText)}
        </h3>
      );
      return;
    }

    rendered.push(
      <p key={`paragraph-${index}`} className="mb-4 leading-7 text-zinc-900 dark:text-zinc-100 drop-shadow-sm">
        {renderInlineText(line)}
      </p>
    );
  });

  flushBullets();

  return <div className="max-w-none">{rendered}</div>;
}

export default function DailyDigestCard() {
  const [digest, setDigest] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDigest = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/digest");
      if (!response.ok) {
        throw new Error("Failed to load your daily digest.");
      }
      const data = await response.json();
      setDigest(data.digest);
      setDate(data.date);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDigest();
  }, [fetchDigest]);

  return (
    <div className="mb-8 w-full overflow-hidden border border-white/70 bg-white/82 shadow-[0_12px_36px_rgba(24,24,27,0.16)] backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/78">
      <div className="flex flex-col gap-5 border-b border-zinc-900/10 px-6 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-8 dark:border-white/10">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-400">
            Today&apos;s briefing
          </p>
          <h2 className="text-3xl font-black tracking-[-0.03em] text-zinc-950 dark:text-white">
            Daily Digest
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {date && (
            <time className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
              {new Date(date).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </time>
          )}
        </div>
      </div>

      <div className="relative px-6 py-7 sm:px-8 sm:py-8">
        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4 animate-pulse pt-2">
            <div className="flex gap-4 mb-2">
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4"></div>
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4"></div>
            </div>
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full"></div>
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full"></div>
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-5/6"></div>
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-11/12 mt-6"></div>
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full"></div>
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4"></div>
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="py-6 flex flex-col items-center justify-center text-center bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-900/30">
            <p className="text-red-700 dark:text-red-400 font-medium mb-4 max-w-sm">
              {error}
            </p>
            <button
              onClick={fetchDigest}
              className="px-5 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 shadow-sm text-zinc-700 dark:text-zinc-300 rounded-lg text-sm font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry
            </button>
          </div>
        )}

        {/* Success State */}
        {!isLoading && !error && digest && (
          <div className="border-l-2 border-zinc-300 pl-5 sm:pl-7 dark:border-zinc-700">
            <DigestContent digest={digest} />
          </div>
        )}
      </div>
    </div>
  );
}
