"use client";

import React, { useState, useEffect } from "react";

export interface SentimentResponse {
  overallSentiment: "positive" | "negative" | "mixed" | "neutral";
  confidenceScore: number; // 0 to 100
  teamASentiment?: "positive" | "negative" | "mixed" | "neutral";
  teamBSentiment?: "positive" | "negative" | "mixed" | "neutral";
  summary?: string;
}

interface ThreadSentimentProps {
  threadId: string;
}

export default function ThreadSentiment({ threadId }: ThreadSentimentProps) {
  const [data, setData] = useState<SentimentResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!threadId) return;

    const fetchSentiment = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const res = await fetch(`/api/ai/sentiment/${threadId}`);
        
        if (!res.ok) {
          throw new Error("Failed to fetch sentiment data.");
        }
        
        const jsonData = await res.json();
        
        if (isMounted) {
          setData(jsonData.sentiment || jsonData.data || jsonData);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "An error occurred.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchSentiment();

    return () => {
      isMounted = false;
    };
  }, [threadId]);

  if (isLoading) {
    return (
      <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-5 shadow-sm mb-6 animate-pulse">
        <div className="flex items-center justify-between mb-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div className="h-5 w-40 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
          <div className="h-6 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-full"></div>
        </div>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-800 rounded"></div>
            <div className="h-4 w-4/5 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <div className="h-3 w-32 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
              <div className="h-3 w-8 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
            </div>
            <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden"></div>
          </div>
        </div>
      </div>
    );
  }

  // Graceful error fallback
  if (error || !data) {
    return (
      <div className="w-full bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-700/50 rounded-xl p-4 text-sm text-zinc-500 dark:text-zinc-600 text-center mb-6">
        <span className="flex items-center justify-center gap-2">
          <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Sentiment analysis unavailable
        </span>
      </div>
    );
  }

  const { overallSentiment, confidenceScore, summary } = data;

  // Determine colors based on overall sentiment
  let badgeColor = "bg-zinc-500 text-zinc-100";
  let barColor = "bg-zinc-500";
  let badgeLabel = "Mixed";

  if (overallSentiment === "positive") {
    badgeColor = "bg-emerald-500 text-white";
    barColor = "bg-emerald-500 dark:bg-emerald-400";
    badgeLabel = "Positive";
  } else if (overallSentiment === "negative") {
    badgeColor = "bg-red-500 text-white";
    barColor = "bg-red-500 dark:bg-red-500";
    badgeLabel = "Negative";
  } else if (overallSentiment === "neutral") {
    badgeColor = "bg-blue-500 text-white";
    barColor = "bg-blue-500 dark:bg-blue-400";
    badgeLabel = "Neutral";
  }

  return (
    <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors rounded-xl p-5 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 uppercase tracking-wide">
          <svg className="w-4 h-4 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Fan Sentiment
        </h3>
        <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${badgeColor}`}>
          {badgeLabel}
        </span>
      </div>

      <div className="space-y-4">
        {summary && (
          <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed italic border-l-2 border-zinc-200 dark:border-zinc-700 pl-3">
            "{summary}"
          </p>
        )}

        <div className="pt-2">
          <div className="flex justify-between items-center mb-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">
            <span>Confidence Score</span>
            <span>{confidenceScore}%</span>
          </div>
          <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className={`h-full ${barColor} transition-all duration-1000 ease-out`}
              style={{ width: `${confidenceScore}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
