"use client"
import { useEffect, useState } from "react";

type TeamForum = {
  id: number;
  teamId: number;
  name: string;
};

type Thread = {
  id: number;
  title: string;
  author?: { username?: string };
  tags?: string[];
};

type Post = {
  id: number;
  textContent: string;
  author?: { username?: string };
  replies?: Post[];
};

type ThreadData = {
  threadTitle: string;
  posts: Post[];
};


export default function ForumsPage() {
  // Track login status
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [teamForums, setTeamForums] = useState<TeamForum[]>([]);
  const [selectedForum, setSelectedForum] = useState<TeamForum | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [threadData, setThreadData] = useState<ThreadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Thread creation
  const [showThreadForm, setShowThreadForm] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [newThreadContent, setNewThreadContent] = useState("");
  const [newThreadTags, setNewThreadTags] = useState("");
  const [creatingThread, setCreatingThread] = useState(false);
  const [searchTitle, setSearchTitle] = useState("");
  const [searchAuthor, setSearchAuthor] = useState("");
  const [searchTags, setSearchTags] = useState("");

  // Load team forums on mount and check login status
  useEffect(() => {
    async function fetchTeams() {
      setLoading(true);
      try {
        // Check login status
        const resAuth = await fetch("/api/auth/me");
        const dataAuth = await resAuth.json();
        setIsLoggedIn(!!dataAuth.user);

        const res = await fetch("/api/forums/teams");
        const data = await res.json();
        setTeamForums(data);
      } catch (e) {
        setError("Failed to load team forums.");
      } finally {
        setLoading(false);
      }
    }
    fetchTeams();
  }, []);

  // Load threads for selected forum
  useEffect(() => {
    if (!selectedForum) return;
    async function fetchThreads() {
      setLoading(true);
      try {
        if (selectedForum) {
          const res = await fetch(`/api/forums/teams/threads?team=${selectedForum.teamId}`);
          const data = await res.json();
          setThreads(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        setError("Failed to load threads.");
      } finally {
        setLoading(false);
      }
    }
    fetchThreads();
  }, [selectedForum]);

  // Load thread data for selected thread
  useEffect(() => {
    if (!selectedThread) return;
    async function fetchThreadData() {
      setLoading(true);
      try {
        if (selectedThread) {
          const res = await fetch(`/api/forums/teams/threads/${selectedThread.id}/posts`);
          const data = await res.json();
          setThreadData(data);
        }
      } catch (e) {
        setError("Failed to load thread.");
      } finally {
        setLoading(false);
      }
    }
    fetchThreadData();
  }, [selectedThread]);

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
  const filteredThreads = threads.filter(filterThread);

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <button onClick={() => {
        if (selectedThread) {
          setSelectedThread(null);
          setThreadData(null);
        } else if (selectedForum) {
          setSelectedForum(null);
          setThreads([]);
        } else {
          window.history.back();
        }
      }} className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
        {selectedThread ? "Back to Threads" : selectedForum ? "Back to Forums" : "Go Back"}
      </button>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold mb-2 text-blue-700 dark:text-blue-300 drop-shadow-lg">Premier League Team Forums</h1>
        <p className="text-zinc-700 dark:text-zinc-300 text-lg">Discuss your favorite teams and connect with fellow fans!</p>
      </div>
      <div className="flex justify-center mb-8">
        <a href="/forums" className="px-6 py-3 rounded-lg bg-indigo-600 text-white font-semibold shadow hover:bg-indigo-700 transition flex items-center gap-2">
           View the General Forum
        </a>
      </div>
      <section className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-6">
        {!selectedForum && (
          <>
            <h2 className="text-2xl font-bold mb-6 text-center text-blue-600 dark:text-blue-300 flex items-center justify-center gap-2">
              Team Forums
            </h2>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : error ? (
              <div className="text-center text-red-500 py-8">{error}</div>
            ) : teamForums.length === 0 ? (
              <div className="text-center text-zinc-500 py-8">No team forums found.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {teamForums.map((forum) => (
                  <button
                    key={forum.id}
                    onClick={() => setSelectedForum(forum)}
                    className="block w-full text-left rounded-lg border border-zinc-200 dark:border-zinc-700 bg-blue-50 dark:bg-zinc-800 p-5 shadow hover:bg-blue-100 dark:hover:bg-zinc-700 transition"
                  >
                    <div className="font-bold text-lg text-blue-700 dark:text-blue-200 mb-1 truncate flex items-center gap-2">
                      {forum.name}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        {selectedForum && !selectedThread && (
          <>
            <h2 className="text-2xl font-bold mb-6 text-center text-blue-600 dark:text-blue-300 flex items-center justify-center gap-2">
              Threads in {selectedForum.name}
            </h2>
            <div className="mb-6 flex flex-col md:flex-row justify-center gap-4">
              <input 
                type="text" 
                placeholder="Search by title..." 
                className="w-full md:w-1/3 p-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition" 
                value={searchTitle} 
                onChange={(e) => setSearchTitle(e.target.value)} 
              />
              <input 
                type="text" 
                placeholder="Search by author..." 
                className="w-full md:w-1/3 p-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition" 
                value={searchAuthor} 
                onChange={(e) => setSearchAuthor(e.target.value)} 
              />
              <input 
                type="text" 
                placeholder="Search by tags..." 
                className="w-full md:w-1/3 p-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition" 
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
                        const res = await fetch("/api/forums/teams/threads", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            title: newThreadTitle,
                            content: newThreadContent,
                            teamId: selectedForum.teamId,
                            tags: newThreadTags ? newThreadTags.split(",").map((t) => t.trim()) : undefined,
                          }),
                        });
                        if (!res.ok) throw new Error("Failed to create thread");
                        setShowThreadForm(false);
                        setNewThreadTitle("");
                        setNewThreadContent("");
                        setNewThreadTags("");
                        // Refresh threads
                        const threadsRes = await fetch(`/api/forums/teams/threads`);
                        const threadsData = await threadsRes.json();
                        setThreads(Array.isArray(threadsData) ? threadsData : []);
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
            ) : filteredThreads.length === 0 ? (
              <div className="text-center text-zinc-500 py-8">No matching threads found.</div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {filteredThreads.map((thread) => (
                  <a
                    key={thread.id}
                    href={`/forums/teams/threads/${thread.id}`}
                    className="block w-full text-left rounded-lg border border-zinc-200 dark:border-zinc-700 bg-blue-100 dark:bg-zinc-800 p-5 shadow hover:bg-blue-200 dark:hover:bg-zinc-700 transition"
                  >
                    <div className="font-bold text-lg text-blue-700 dark:text-blue-200 mb-1 truncate flex items-center gap-2">
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
          </>
        )}
        {selectedThread && threadData && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">{threadData.threadTitle}</h2>
            {threadData.posts && threadData.posts.length > 0 && (
              <RenderPost post={threadData.posts[0]} depth={0} />
            )}
          </div>
        )}
      </section>
    </div>
  );

  // Recursive post renderer
  function RenderPost({ post, depth = 0 }: { post: Post; depth?: number }) {
    return (
      <div style={{ marginLeft: depth * 32 }} className={depth > 0 ? "mt-2" : ""}>
        <div
          className={
            depth === 0
              ? "mb-6 p-6 bg-white dark:bg-zinc-800 rounded-lg shadow border-2 border-indigo-500"
              : "mb-4 p-4 bg-white dark:bg-zinc-800 rounded-lg shadow"
          }
        >
          {post.author?.username && (
            <div
              className={
                depth === 0
                  ? "text-lg font-semibold text-indigo-700 dark:text-indigo-200 mb-2"
                  : "text-sm text-zinc-600 dark:text-zinc-300 mb-2"
              }
            >
              by {post.author?.username || "Unknown"}
            </div>
          )}
          <div
            className={
              depth === 0
                ? "text-xl font-bold text-gray-900 dark:text-gray-100 mb-2"
                : "text-gray-800 dark:text-gray-200"
            }
          >
            {post.textContent}
          </div>
        </div>
        {post.replies && post.replies.length > 0 && (
          <div>
            {post.replies.map((reply) => (
              <RenderPost key={reply.id} post={reply} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }
}