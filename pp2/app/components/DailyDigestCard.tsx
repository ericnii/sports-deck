"use client";

import React, { useState, useEffect, useCallback } from "react";

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
    <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow duration-300 mb-8 relative overflow-hidden group">
      {/* Premium subtle gradient background wash */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-80" />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-white flex items-center gap-2 tracking-tight">
          <svg
            className="w-6 h-6 text-indigo-500 dark:text-indigo-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15"
            />
          </svg>
          Daily Digest
        </h2>
        
        <div className="flex items-center gap-3">
          {date && (
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              {new Date(date).toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
              })}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-bold border border-purple-200 dark:border-purple-800/50 shadow-sm">
            <svg
              className="w-3.5 h-3.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0z" />
              <path d="M8 9.5a1.5 1.5 0 113 0v4.73A1.493 1.493 0 0110.151 15h-.302A1.493 1.493 0 018 14.23V9.5zM10 5a4.5 4.5 0 00-4.5 4.5v4.5A2.5 2.5 0 008 16.5h4a2.5 2.5 0 002.5-2.5v-4.5A4.5 4.5 0 0010 5z" />
            </svg>
            AI Generated
          </span>
        </div>
      </div>

      <div className="relative min-h-[120px]">
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
            <svg
              className="w-10 h-10 text-red-500 mb-3 opacity-80"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
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
          <div className="prose prose-zinc dark:prose-invert max-w-none text-slate-800 dark:text-slate-300 text-lg leading-relaxed whitespace-pre-wrap">
            {digest}
          </div>
        )}
      </div>
    </div>
  );
}
