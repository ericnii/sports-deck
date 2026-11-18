"use client"
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function MatchThreadPage() {
  const { match_id } = useParams();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchThreads() {
      setLoading(true);
      try {
        const res = await fetch(`/api/forums/threads/matches/${match_id}`);
        const data = await res.json();
        if (res.ok) {
          setThreads(Array.isArray(data) ? data : data.threads || []);
        } else {
          setError(data.error || "Failed to load threads.");
        }
      } catch (e) {
        setError("Failed to load threads.");
      } finally {
        setLoading(false);
      }
    }
    if (match_id) fetchThreads();
  }, [match_id]);

  if (loading) return <main className="min-h-screen px-4 py-16 text-center"><div className="mx-auto h-8 w-8 animate-spin border-2 border-zinc-400 border-t-zinc-950 dark:border-t-white" /></main>;
  if (error) return <main className="min-h-screen px-4 py-16 text-center text-red-600">{error}</main>;

  return (
    <main className="min-h-screen text-zinc-950 dark:text-zinc-100">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <header className="mb-8 border-b border-zinc-300 pb-5 dark:border-zinc-800">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">Match discussion</p>
          <h1 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl">Match Threads</h1>
        </header>

        <a href="/forums/threads/matches" className="mb-5 inline-block text-sm font-bold text-zinc-500 hover:text-zinc-950 dark:hover:text-white">← All match threads</a>

        {threads.length === 0 ? (
          <section className="border border-zinc-300 py-16 text-center text-zinc-500 dark:border-zinc-800">No threads found for this match.</section>
        ) : (
          <section className="border border-zinc-300 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {threads.map((thread: any) => (
                <a key={thread.id} href={`/forums/threads/${thread.id}`} className="group flex items-start gap-4 px-5 py-5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 sm:px-6">
                  <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center border border-zinc-300 text-xs font-black text-zinc-500 dark:border-zinc-700">VS</div>
                  <div className="min-w-0 flex-1">
                    <p className="font-black leading-snug group-hover:text-emerald-700 dark:group-hover:text-emerald-400">{thread.title}</p>
                    <p className="mt-1 text-sm text-zinc-500">{new Date(thread.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className="text-zinc-400 transition group-hover:translate-x-1">›</span>
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
