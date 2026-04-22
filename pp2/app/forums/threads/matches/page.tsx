"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type Thread = {
  id: number;
  externalMatchId: number;
  title: string;
  createdAt: string;
  author?: { username?: string };
  tags?: string[];
};

export default function MatchThreadsPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchThreads() {
      setLoading(true);
      setError(null);
      try {
        // Fetch all threads with an externalMatchId (i.e., all match threads)
        const res = await fetch("/api/forums/threads/matches");
        if (!res.ok) {
          throw new Error("Failed to fetch match threads");
        }
        const data = await res.json();
        setThreads(data.threads || []);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Unknown error");
        }
      } finally {
        setLoading(false);
      }
    }
    fetchThreads();
  }, []);

  // Filter out threads older than 14 days
  const now = new Date();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const recentThreads = threads.filter((thread) => {
    const created = new Date(thread.createdAt);
    return created >= twoWeeksAgo;
  });

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <button onClick={() => window.history.back()} className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">Go Back</button>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold mb-2 text-indigo-700 dark:text-indigo-300 drop-shadow-lg">All Match Threads</h1>
        <p className="text-zinc-700 dark:text-zinc-300 text-lg">Join the discussion for each match!</p>
      </div>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && !error && (
        <div className="space-y-4">
          {recentThreads.length === 0 ? (
            <div className="text-zinc-500 text-center">No match threads found.</div>
          ) : (
            recentThreads.map((thread) => (
              <Link
                key={thread.id}
                href={`/forums/threads/${thread.id}`}
                className="block p-6 bg-white dark:bg-zinc-800 rounded-lg shadow border-2 border-indigo-500 hover:bg-blue-50 dark:hover:bg-zinc-700 transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-lg">{thread.title}</div>
                    <div className="text-xs text-zinc-400">Created: {new Date(thread.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="text-xs text-zinc-500">{thread.author?.username ? `by ${thread.author.username}` : ''}</div>
                </div>
                {thread.tags && thread.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {thread.tags.map((tag, i) => (
                      <span key={i} className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs">{tag}</span>
                    ))}
                  </div>
                )}
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}