"use client"
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ReportModal from "@/app/components/ReportModal";

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

type ReportTarget = {
  targetId: number;
  targetType: "THREAD" | "POST";
  contentContext: string;
};

export default function TeamThreadPage() {
  const { thread_id } = useParams();
  const [thread, setThread] = useState<ThreadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<number | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);

  useEffect(() => {
    async function fetchUserId() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        setUserId(data?.user?.id ?? null);
      } catch {
        setUserId(null);
      }
    }
    fetchUserId();
  }, []);

  useEffect(() => {
    async function fetchThread() {
      setLoading(true);
      try {
        const res = await fetch(`/api/forums/teams/threads/${thread_id}/posts`);
        console.log("Fetch response:", res);
        if (!res.ok) throw new Error("Failed to fetch thread");
        const data = await res.json();
        setThread(data);
      } catch (e) {
        setError("Could not load thread.");
      } finally {
        setLoading(false);
      }
    }
    if (thread_id) fetchThread();
  }, [thread_id]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!thread) return <div className="p-8 text-center text-zinc-500">Thread not found.</div>;

  function openReport(target: ReportTarget) {
    setReportTarget(target);
    setIsReportOpen(true);
  }

  function RenderPost({ post, depth = 0 }: { post: Post; depth?: number }) {
    const [replyContent, setReplyContent] = useState("");
    const [replying, setReplying] = useState(false);
    const [showReplyForm, setShowReplyForm] = useState(false);
    const [localReplies, setLocalReplies] = useState(post.replies || []);

    async function handleReply(e: React.SyntheticEvent<HTMLFormElement>) {
      e.preventDefault();
      setReplying(true);
      try {
        const res = await fetch(`/api/forums/teams/threads/${thread_id}/posts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ textContent: replyContent, parentPostId: post.id }),
        });
        if (!res.ok) throw new Error("Failed to reply");
        setReplyContent("");
        setShowReplyForm(false);
        // Refresh thread
        const threadRes = await fetch(`/api/forums/teams/threads/${thread_id}/posts`);
        const threadJson = await threadRes.json();
        setThread(threadJson);
      } catch {
        setError("Failed to reply.");
      } finally {
        setReplying(false);
      }
    }

    return (
      <div style={{ marginLeft: depth * 32 }} className={depth > 0 ? "mt-2" : ""}>
        <div
          className={
            depth === 0
              ? "relative mb-6 p-6 bg-white dark:bg-zinc-800 rounded-lg shadow border-2 border-indigo-500"
              : "relative mb-4 p-4 bg-white dark:bg-zinc-800 rounded-lg shadow"
          }
        >
          <button
            type="button"
            title="Report post"
            onClick={() =>
              openReport({
                targetId: post.id,
                targetType: "POST",
                contentContext: post.textContent,
              })
            }
            className="float-right ml-3 mb-2 cursor-pointer rounded border border-red-300 bg-white px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:bg-zinc-900"
          >
            Flag
          </button>
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
          <div className="clear-both" />
          <button
            className="mt-2 px-2 py-1 text-xs bg-blue-200 dark:bg-blue-800 rounded transition-colors duration-200 hover:bg-blue-400 hover:dark:bg-blue-600 hover:text-white hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400"
            onClick={() => setShowReplyForm((v) => !v)}
          >
            {showReplyForm ? "Cancel" : "Reply"}
          </button>
          {showReplyForm && (
            <form onSubmit={handleReply} className="mt-2">
              <textarea
                className="block w-full mb-2 p-2 rounded border"
                placeholder="Reply..."
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                required
              />
              <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded" disabled={replying}>
                {replying ? "Replying..." : "Reply"}
              </button>
            </form>
          )}
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

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <button onClick={() => window.history.back()} className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">Go Back</button>
      <div className="mb-4">
        <button
          type="button"
          title="Report thread"
          onClick={() =>
            openReport({
              targetId: Number(thread_id),
              targetType: "THREAD",
              contentContext: `${thread.threadTitle}\n\n${thread.posts?.[0]?.textContent || ""}`,
            })
          }
          className="float-right ml-3 mb-2 cursor-pointer rounded border border-red-300 bg-white px-3 py-1 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:bg-zinc-900"
        >
          Flag
        </button>
        <h1 className="text-2xl font-bold break-words">{thread.threadTitle}</h1>
        <div className="clear-both" />
      </div>
      <div className="flex gap-4 mb-6">
        <a
          href={`/forums/teams/threads/${thread_id}/polls`}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          View Polls
        </a>
      </div>
      {thread.posts && thread.posts.length > 0 && (
        <RenderPost post={thread.posts[0]} depth={0} />
      )}

      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        targetId={reportTarget?.targetId ?? null}
        targetType={reportTarget?.targetType ?? null}
        contentContext={reportTarget?.contentContext || ""}
        reporterId={userId}
      />
    </div>
  );
}
