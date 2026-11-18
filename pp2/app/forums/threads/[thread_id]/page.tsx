"use client"

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import ReportModal from "@/app/components/ReportModal";
import ThreadSentiment from "@/app/components/ThreadSentiment";
import TranslateButton from "@/app/components/TranslateButton";

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

export default function ThreadPage() {
  const { thread_id } = useParams();
  const { user: currentUser } = useAuth();
  const [thread, setThread] = useState<ThreadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);

  const fetchThread = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/forums/threads/${thread_id}/posts`);
      if (!res.ok) throw new Error("Failed to fetch thread");
      const data = await res.json();
      setThread(data);
    } catch (e) {
      setError("Could not load thread.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (thread_id) fetchThread();
  }, [thread_id]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!thread) return <div className="p-8 text-center text-zinc-500">Thread not found.</div>;

  function openReport(target: ReportTarget) {
    setReportTarget(target);
    setIsReportOpen(true);
  }

  // Recursive post renderer
  function RenderPost({ post, depth = 0 }: { post: Post; depth?: number }) {
    const [replyContent, setReplyContent] = useState("");
    const [replying, setReplying] = useState(false);
    const [showReplyForm, setShowReplyForm] = useState(false);
    const [localReplies, setLocalReplies] = useState(post.replies || []);

    async function handleReply(e: React.SyntheticEvent<HTMLFormElement>) {
      e.preventDefault();
      setReplying(true);
      try {
        const res = await fetch(`/api/forums/threads/${thread_id}/posts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ textContent: replyContent, parentPostId: post.id }),
        });
        if (!res.ok) throw new Error("Failed to reply");
        setReplyContent("");
        setShowReplyForm(false);
        const threadRes = await fetch(`/api/forums/threads/${thread_id}/posts`);
        const threadJson = await threadRes.json();
        setThread(threadJson);
      } catch {
        setError("Failed to reply.");
      } finally {
        setReplying(false);
      }
    }

    // Edit/Delete State
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(post.textContent);
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const isOwner = currentUser?.username && post.author?.username === currentUser.username;
    const isDeleted = post.textContent === "[DELETED]";

    async function handleEditSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
      e.preventDefault();
      setIsSavingEdit(true);
      setError("");
      try {
        const res = await fetch(`/api/posts/${currentUser?.username}/${post.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ textContent: editContent }),
        });
        if (!res.ok) throw new Error("Failed to update post");
        setIsEditing(false);
        fetchThread(true);
      } catch (err: any) {
        setError("Failed to edit post.");
      } finally {
        setIsSavingEdit(false);
      }
    }

    async function handleDelete() {
      if (!window.confirm("Are you sure you want to delete this?")) return;
      setIsDeleting(true);
      setError("");
      try {
        const res = await fetch(`/api/posts/${currentUser?.username}/${post.id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to delete post");
        fetchThread(true);
      } catch (err: any) {
        setError("Failed to delete post.");
      } finally {
        setIsDeleting(false);
      }
    }

    return (
      <div className={depth > 0 ? "ml-3 border-l border-zinc-300 pl-3 sm:ml-6 sm:pl-5 dark:border-zinc-700" : ""}>
        <article
          className={
            depth === 0
              ? "relative mb-5 border border-zinc-300 bg-white p-5 sm:p-6 dark:border-zinc-700 dark:bg-zinc-900"
              : "relative mb-3 bg-white px-2 py-3 dark:bg-zinc-900"
          }
        >
          <div className="absolute right-4 top-4 flex items-center gap-1.5">
            {!isDeleted && isOwner && (
              <>
                <button
                  type="button"
                  title="Edit post"
                  onClick={() => setIsEditing(!isEditing)}
                  disabled={isDeleting}
                  className="cursor-pointer rounded px-2 py-1 text-xs font-bold text-zinc-500 transition hover:text-zinc-950 disabled:opacity-50 dark:hover:text-white"
                >
                  {isEditing ? "Cancel Edit" : "Edit"}
                </button>
                <button
                  type="button"
                  title="Delete post"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="cursor-pointer rounded px-2 py-1 text-xs font-bold text-zinc-500 transition hover:text-red-600 disabled:opacity-50"
                >
                  {isDeleting ? "..." : "Delete"}
                </button>
              </>
            )}
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
              className="cursor-pointer rounded border border-red-300 bg-white px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:bg-zinc-900"
            >
              Flag
            </button>
          </div>

          {post.author?.username && (
            <div
              className={
                depth === 0
                  ? "mb-3 flex items-center gap-2 text-sm font-bold text-zinc-950 dark:text-zinc-100"
                  : "mb-2 flex items-center gap-2 text-xs font-bold text-zinc-700 dark:text-zinc-300"
              }
            >
              by <span className="font-bold">{post.author?.username || "Unknown"}</span>
              {isOwner && <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 uppercase tracking-widest font-bold">You</span>}
            </div>
          )}

          {isEditing ? (
            <form onSubmit={handleEditSubmit} className="mt-2 mb-4">
              <textarea
                className="block w-full mb-2 p-3 rounded-lg border border-indigo-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-zinc-900 shadow-inner"
                rows={4}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                required
              />
              <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow transition" disabled={isSavingEdit}>
                {isSavingEdit ? "Saving..." : "Save Edits"}
              </button>
            </form>
          ) : (
            <>
              <div
                className={
                  depth === 0
                    ? `text-xl font-medium text-gray-900 dark:text-gray-100 mb-2 whitespace-pre-wrap ${isDeleted && 'italic text-red-500 opacity-70'}`
                    : `whitespace-pre-wrap text-sm leading-6 text-zinc-800 dark:text-zinc-200 ${isDeleted && 'italic text-red-500 opacity-70'}`
                }
              >
                {post.textContent}
                {!isDeleted && <TranslateButton originalText={post.textContent} />}
              </div>
            </>
          )}
          <div className="clear-both" />
          {!isDeleted && currentUser && (
            <button
              className="mt-4 px-3 py-1.5 text-xs font-bold bg-zinc-100 dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 rounded-lg transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-600 hover:text-zinc-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-zinc-400"
              onClick={() => setShowReplyForm((v) => !v)}
            >
              {showReplyForm ? "Cancel Reply" : "Reply directly"}
            </button>
          )}
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
          {!isDeleted && !currentUser && (
            <a href="/login" className="mt-4 inline-block text-xs font-bold text-zinc-500 hover:text-zinc-950 dark:hover:text-white">
              Sign in to reply
            </a>
          )}
        </article>
        {post.replies && post.replies.length > 0 && (
          <div className="mt-4">
            {post.replies.map((reply) => (
              <RenderPost key={reply.id} post={reply} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f5f7] px-4 py-8 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 border-b border-zinc-300 pb-5 dark:border-zinc-800">
          <div className="mb-3 flex items-center justify-between gap-4">
            <a href="/forums" className="text-sm font-bold text-zinc-500 hover:text-zinc-950 dark:hover:text-white">← All discussions</a>
            <button
              type="button"
              onClick={() => openReport({ targetId: Number(thread_id), targetType: "THREAD", contentContext: `${thread.threadTitle}\n\n${thread.posts?.[0]?.textContent || ""}` })}
              className="text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-red-600"
            >Report</button>
          </div>
          <h1 className="wrap-break-word text-3xl font-black tracking-[-0.03em] sm:text-4xl">{thread.threadTitle}</h1>
          <div className="mt-5 flex items-center justify-between gap-4">
            {typeof thread_id === "string" && <ThreadSentiment threadId={thread_id} />}
            <a href={`/forums/threads/${thread_id}/polls`} className="shrink-0 border-b-2 border-zinc-950 pb-1 text-sm font-bold dark:border-white">View polls</a>
          </div>
        </header>

        {thread.posts?.length > 0 && <RenderPost post={thread.posts[0]} depth={0} />}

        <ReportModal
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          targetId={reportTarget?.targetId ?? null}
          targetType={reportTarget?.targetType ?? null}
          contentContext={reportTarget?.contentContext || ""}
          reporterId={currentUser?.id ? Number(currentUser.id) : null}
        />
      </div>
    </main>
  );
}
