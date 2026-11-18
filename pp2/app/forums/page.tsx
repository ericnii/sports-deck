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
    <main className="min-h-screen text-zinc-950 dark:text-zinc-100">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8 border-b border-zinc-300 pb-5 dark:border-zinc-800">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">Community</p>
          <h1 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl">Matchday conversations</h1>
        </header>

        <div className="mb-8 flex gap-6 border-b border-zinc-300 dark:border-zinc-800">
          <a href="/forums/teams/threads" className="border-b-2 border-zinc-950 px-1 py-2 text-sm font-bold text-zinc-950 dark:border-white dark:text-white">Team forums</a>
          <a href="/forums/threads/matches" className="border-b-2 border-transparent px-1 py-3 text-sm font-bold text-zinc-500 hover:border-zinc-400 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white">Match threads</a>
        </div>
        <section className="mb-10 border border-zinc-300 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800 sm:px-6">
            <h2 className="text-lg font-black tracking-tight">General discussions</h2>
          </div>
          <div className="p-6">
            <div className="mb-5 grid gap-2 sm:grid-cols-3">
              <input
                type="text"
                placeholder="Search title"
                className="w-full border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
                value={searchTitle}
                onChange={(e) => setSearchTitle(e.target.value)}
              />
              <input
                type="text"
                placeholder="Search author"
                className="w-full border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
                value={searchAuthor}
                onChange={(e) => setSearchAuthor(e.target.value)}
              />
              <input
                type="text"
                placeholder="Search tags"
                className="w-full border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
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
                    className="mb-6 border border-zinc-300 bg-zinc-50 p-5 dark:border-zinc-700 dark:bg-zinc-900 sm:p-6"
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
                      className="mb-3 block w-full border border-zinc-300 bg-white px-4 py-3 text-lg font-bold outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
                      placeholder="Thread title"
                      value={newThreadTitle}
                      onChange={e => setNewThreadTitle(e.target.value)}
                      required
                    />
                    <textarea
                      className="mb-3 block min-h-36 w-full resize-y border border-zinc-300 bg-white px-4 py-3 leading-7 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
                      placeholder="What do you want to discuss?"
                      value={newThreadContent}
                      onChange={e => setNewThreadContent(e.target.value)}
                      required
                    />
                    <input
                      className="mb-4 block w-full border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
                      placeholder="Tags, separated by commas"
                      value={newThreadTags}
                      onChange={e => setNewThreadTags(e.target.value)}
                    />
                    <div className="flex justify-end">
                      <button type="submit" className="border-b-2 border-zinc-950 px-1 py-2 text-sm font-bold text-zinc-950 disabled:opacity-50 dark:border-white dark:text-white" disabled={creatingThread}>
                        {creatingThread ? "Publishing…" : "Publish thread"}
                      </button>
                    </div>
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
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredRecentMatchThreads.map((thread) => (
                  <a
                    key={`match-${thread.id}`}
                    href={`/forums/threads/${thread.id}`}
                    className="group flex items-start gap-4 px-5 py-5 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50 sm:px-6"
                  >
                    <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center border border-zinc-300 text-xs font-black text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">M</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-bold leading-snug text-zinc-950 group-hover:text-emerald-700 dark:text-zinc-100 dark:group-hover:text-emerald-400">{thread.title}</p>
                      <p className="mt-1 text-sm text-zinc-500">
                        Match discussion{thread.author?.username ? ` · Posted by ${thread.author.username}` : ""}
                      </p>
                      {thread.tags && thread.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {thread.tags.slice(0, 4).map((tag) => (
                            <span key={tag} className="border border-zinc-300 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:border-zinc-700">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-zinc-400 transition group-hover:translate-x-1">›</span>
                  </a>
                ))}
                {filteredGeneralThreads.map((thread) => (
                  <a
                    key={`general-${thread.id}`}
                    href={`/forums/threads/${thread.id}`}
                    className="group flex items-start gap-4 px-5 py-5 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50 sm:px-6"
                  >
                    <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center border border-zinc-300 text-xs font-black text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">F</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-bold leading-snug text-zinc-950 group-hover:text-emerald-700 dark:text-zinc-100 dark:group-hover:text-emerald-400">{thread.title}</p>
                      <p className="mt-1 text-sm text-zinc-500">
                        General discussion{thread.author?.username ? ` · Posted by ${thread.author.username}` : ""}
                      </p>
                      {thread.tags && thread.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {thread.tags.slice(0, 4).map((tag) => (
                            <span key={tag} className="border border-zinc-300 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:border-zinc-700">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-zinc-400 transition group-hover:translate-x-1">›</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}