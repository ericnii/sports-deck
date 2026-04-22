"use client"
import { useEffect, useState } from "react";



export default function ForumsPage() {
  // Track login status
  const [isLoggedIn, setIsLoggedIn] = useState(false);


  type Thread = {
    id: number;
    title: string;
    author?: { username?: string };
    tags?: string[];
  };

  const [matchThreads, setMatchThreads] = useState<Thread[]>([]);
  const [generalThreads, setGeneralThreads] = useState<Thread[]>([]);
  const [showTeamForums, setShowTeamForums] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTitle, setSearchTitle] = useState("");
  const [searchAuthor, setSearchAuthor] = useState("");
  const [searchTags, setSearchTags] = useState("");
  // Thread creation (general only)
  const [showThreadForm, setShowThreadForm] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [newThreadContent, setNewThreadContent] = useState("");
  const [newThreadTags, setNewThreadTags] = useState("");
  const [creatingThread, setCreatingThread] = useState(false);

  useEffect(() => {
    async function fetchThreads() {
      setLoading(true);
      try {
        // Check login status
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        setIsLoggedIn(!!data.user);

        // Ensure general forums is made
        await fetch("/api/forums/", { method: "GET" });

        // Ensure match threads are created (POST), then fetch them (GET)
        await fetch("/api/forums/threads/matches", { method: "POST" });
        const matchRes = await fetch("/api/forums/threads/matches");
        const matchData = await matchRes.json();
        setMatchThreads(Array.isArray(matchData) ? matchData : []);

        const generalRes = await fetch("/api/forums/threads");
        const generalData = await generalRes.json();
        setGeneralThreads(Array.isArray(generalData) ? generalData : []);

      } catch (e) {
        setError("Failed to load forum threads.");
      } finally {
        setLoading(false);
      }
    }
    fetchThreads();
  }, []);

  // Filter out match threads older than 14 days based on match date in title
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
  // Helper to extract match date from thread title (expects 'on YYYY-MM-DD' at end)
  function getMatchDateFromTitle(title?: string): Date | null {
    if (!title) return null;
    const match = title.match(/on (\d{4}-\d{2}-\d{2})$/);
    if (!match) return null;
    return new Date(match[1]);
  }
  const recentMatchThreads = matchThreads.filter((thread) => {
    if (!thread || !thread.title) return false;
    const matchDate = getMatchDateFromTitle(thread.title);
    if (!matchDate) return false;
    // Compare only the date part
    const matchDay = new Date(matchDate.getFullYear(), matchDate.getMonth(), matchDate.getDate());
    return matchDay >= twoWeeksAgo;
  });

  // Helper to filter a thread based on search queries
  const filterThread = (thread: Thread) => {
    let matches = true;
    if (searchTitle) {
      matches = matches && (thread.title?.toLowerCase().includes(searchTitle.toLowerCase()) || false);
    }
    if (searchAuthor) {
      matches = matches && (thread.author?.username?.toLowerCase().includes(searchAuthor.toLowerCase()) || false);
    }
    if (searchTags) {
      matches = matches && (thread.tags?.some(tag => tag.toLowerCase().includes(searchTags.toLowerCase())) || false);
    }
    return matches;
  };

  const filteredRecentMatchThreads = recentMatchThreads.filter(filterThread);
  const filteredGeneralThreads = generalThreads.filter(filterThread);

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <button onClick={() => window.history.back()} className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">Go Back</button>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold mb-2 text-indigo-700 dark:text-indigo-300 drop-shadow-lg">Welcome to the Forums</h1>
        <p className="text-zinc-700 dark:text-zinc-300 text-lg">Join discussions, share your thoughts, and connect with fans!</p>
      </div>
      <div className="flex justify-center mb-8 gap-4">
        <a href="/forums/teams/threads" className="px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition flex items-center gap-2">
            View Team Forums
        </a>
        <a href="/forums/threads/matches" className="px-6 py-3 rounded-lg bg-green-600 text-white font-semibold shadow hover:bg-green-700 transition flex items-center gap-2">
            View Match Threads
        </a>
      </div>
      <section className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-6 mb-10">
        <h2 className="text-2xl font-bold mb-6 text-center text-indigo-600 dark:text-indigo-300 flex items-center justify-center gap-2">
           General Forum Threads
        </h2>
        <div className="mb-6 flex flex-col md:flex-row justify-center gap-4">
          <input 
            type="text" 
            placeholder="Search by title..." 
            className="w-full md:w-1/3 p-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition" 
            value={searchTitle} 
            onChange={(e) => setSearchTitle(e.target.value)} 
          />
          <input 
            type="text" 
            placeholder="Search by author..." 
            className="w-full md:w-1/3 p-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition" 
            value={searchAuthor} 
            onChange={(e) => setSearchAuthor(e.target.value)} 
          />
          <input 
            type="text" 
            placeholder="Search by tags..." 
            className="w-full md:w-1/3 p-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition" 
            value={searchTags} 
            onChange={(e) => setSearchTags(e.target.value)} 
          />
        </div>
        {isLoggedIn && (
          <>
            <button
              className="mb-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
              onClick={() => setShowThreadForm((v) => !v)}
            >
              {showThreadForm ? "Cancel" : "Create New Thread"}
            </button>
            {showThreadForm && (
              <form
                className="mb-6 p-4 bg-zinc-100 dark:bg-zinc-800 rounded shadow"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setCreatingThread(true);
                  setError("");
                  try {
                    const res = await fetch("/api/forums/threads", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        title: newThreadTitle,
                        content: newThreadContent,
                        tags: newThreadTags ? newThreadTags.split(",").map((t) => t.trim()) : undefined,
                      }),
                    });
                    if (!res.ok) throw new Error("Failed to create thread");
                    setShowThreadForm(false);
                    setNewThreadTitle("");
                    setNewThreadContent("");
                    setNewThreadTags("");
                    // Refresh threads
                    const generalRes = await fetch("/api/forums/threads");
                    const generalData = await generalRes.json();
                    setGeneralThreads(Array.isArray(generalData) ? generalData : []);
                  } catch {
                    setError("Failed to create thread.");
                  } finally {
                    setCreatingThread(false);
                  }
                }}
              >
                <input
                  className="block w-full mb-2 p-2 rounded border"
                  placeholder="Thread Title"
                  value={newThreadTitle}
                  onChange={e => setNewThreadTitle(e.target.value)}
                  required
                />
                <textarea
                  className="block w-full mb-2 p-2 rounded border"
                  placeholder="Main Post Content"
                  value={newThreadContent}
                  onChange={e => setNewThreadContent(e.target.value)}
                  required
                />
                <input
                  className="block w-full mb-2 p-2 rounded border"
                  placeholder="Tags (comma separated, optional)"
                  value={newThreadTags}
                  onChange={e => setNewThreadTags(e.target.value)}
                />
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded" disabled={creatingThread}>
                  {creatingThread ? "Creating..." : "Create Thread"}
                </button>
              </form>
            )}
          </>
        )}
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : error ? (
          <div className="text-center text-red-500 py-8">{error}</div>
        ) : (filteredGeneralThreads.length === 0 && filteredRecentMatchThreads.length === 0) ? (
          <div className="text-center text-zinc-500 py-8">No matching threads found.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {filteredRecentMatchThreads.map((thread) => (
              <a
                key={thread.id}
                href={`/forums/threads/${thread.id}`}
                className="block rounded-lg border border-zinc-200 dark:border-zinc-700 bg-indigo-50 dark:bg-zinc-800 p-5 shadow hover:bg-indigo-100 dark:hover:bg-zinc-700 transition"
              >
                <div className="font-bold text-lg text-indigo-700 dark:text-indigo-200 mb-1 truncate flex items-center gap-2">
                    {thread.title}
                </div>
                {thread.author && <div className="text-zinc-600 dark:text-zinc-300 text-sm mb-1">by {thread.author.username}</div>}
                {thread.tags && thread.tags.length > 0 && (
                  <div className="text-xs text-zinc-500 mt-1">Tags: {thread.tags.join(", ")}</div>
                )}
              </a>
            ))}
            {filteredGeneralThreads.map((thread) => (
              <a
                key={thread.id}
                href={`/forums/threads/${thread.id}`}
                className="block rounded-lg border border-zinc-200 dark:border-zinc-700 bg-indigo-50 dark:bg-zinc-800 p-5 shadow hover:bg-indigo-100 dark:hover:bg-zinc-700 transition"
              >
                <div className="font-bold text-lg text-indigo-700 dark:text-indigo-200 mb-1 truncate flex items-center gap-2">
                    {thread.title}
                </div>
                {thread.author && <div className="text-zinc-600 dark:text-zinc-300 text-sm mb-1">by {thread.author.username}</div>}
                {thread.tags && thread.tags.length > 0 && (
                  <div className="text-xs text-zinc-500 mt-1">Tags: {thread.tags.join(", ")}</div>
                )}
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}