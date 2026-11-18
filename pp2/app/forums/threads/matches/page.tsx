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
    <main className="min-h-screen text-zinc-950 dark:text-zinc-100">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8 border-b border-zinc-300 pb-5 dark:border-zinc-800">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">Matchday community</p>
          <h1 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl">Match Threads</h1>
        </header>

        <nav className="mb-6 flex gap-6 border-b border-zinc-300 dark:border-zinc-800">
          <a href="/forums" className="border-b-2 border-transparent px-1 py-3 text-sm font-bold text-zinc-500 hover:text-zinc-950 dark:hover:text-white">General</a>
          <a href="/forums/teams/threads" className="border-b-2 border-transparent px-1 py-3 text-sm font-bold text-zinc-500 hover:text-zinc-950 dark:hover:text-white">Teams</a>
          <span className="border-b-2 border-zinc-950 px-1 py-3 text-sm font-bold text-zinc-950 dark:border-white dark:text-white">Matches</span>
        </nav>

        {loading && <p className="border border-zinc-300 py-16 text-center text-zinc-500 dark:border-zinc-800">Loading match discussions…</p>}
        {error && <p className="border border-red-200 py-16 text-center text-red-600 dark:border-red-900/40">{error}</p>}

        {!loading && !error && (
          <section className="border border-zinc-300 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            {recentThreads.length === 0 ? (
              <p className="py-16 text-center text-zinc-500">No recent match threads found.</p>
            ) : (
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {recentThreads.map((thread) => (
                  <Link key={thread.id} href={`/forums/threads/${thread.id}`} className="group flex items-start gap-4 px-5 py-5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 sm:px-6">
                    <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center border border-zinc-300 text-xs font-black text-zinc-500 dark:border-zinc-700">VS</div>
                    <div className="min-w-0 flex-1">
                      <p className="font-black leading-snug group-hover:text-emerald-700 dark:group-hover:text-emerald-400">{thread.title}</p>
                      <p className="mt-1 text-sm text-zinc-500">Match discussion{thread.author?.username ? ` · Posted by ${thread.author.username}` : ""} · {new Date(thread.createdAt).toLocaleDateString()}</p>
                      {thread.tags && thread.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {thread.tags.slice(0, 4).map((tag) => (
                            <span key={tag} className="border border-zinc-300 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:border-zinc-700">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-zinc-400 transition group-hover:translate-x-1">›</span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}