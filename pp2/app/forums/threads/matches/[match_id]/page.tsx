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

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-4">Match Threads</h1>
      {threads.length === 0 ? (
        <div className="text-zinc-500 text-center">No threads found for this match.</div>
      ) : (
        <div className="space-y-4">
          {threads.map((thread: any) => (
            <a
              key={thread.id}
              href={`/forums/threads/matches/${thread.externalMatchId}`}
              className="block p-4 bg-white dark:bg-zinc-800 rounded shadow hover:bg-blue-50 dark:hover:bg-zinc-700 transition"
            >
              <div className="font-semibold">{thread.title}</div>
              <div className="text-xs text-zinc-400">Created: {new Date(thread.createdAt).toLocaleString()}</div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
