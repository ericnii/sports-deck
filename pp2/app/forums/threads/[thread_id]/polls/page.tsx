"use client"
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import ReportModal from "@/app/components/ReportModal";

type Poll = {
    id: number;
    author: { username?: string };
    question: string;
    options: string[];
    deadline: string;
    votes?: Record<string, number[]>;
}

type ReportTarget = {
  targetId: number;
  targetType: "POLL";
  contentContext: string;
};

export default function ThreadPollsPage() {
  const { thread_id } = useParams();
  const { user: currentUser, isAuthenticated: isLoggedIn } = useAuth();
  const userId = currentUser?.id ? Number(currentUser.id) : null;

  const [polls, setPolls] = useState<Poll[]>([]);
  const [threadTitle, setThreadTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Track which poll/option the user voted for
  const [userVotes, setUserVotes] = useState<{ [pollId: number]: number | null }>({});

  const [showPollForm, setShowPollForm] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState("");
  const [pollDeadline, setPollDeadline] = useState("");
  const [creatingPoll, setCreatingPoll] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);

  function openReport(target: ReportTarget) {
    setReportTarget(target);
    setIsReportOpen(true);
  }

  const fetchPolls = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/forums/threads/${thread_id}/polls`);
      const data = await res.json();
      if (res.ok) {
        const pollsData = Array.isArray(data) ? data : data.polls || [];
        setPolls(pollsData);
        setThreadTitle(Array.isArray(data) ? "" : data.threadTitle || "");

        if (userId) {
          const votesObj: { [pollId: number]: number | null } = {};
          pollsData.forEach((poll: any) => {
            if (!poll.votes || typeof poll.votes !== "object") return;

            for (const [optionIdx, voters] of Object.entries(poll.votes)) {
              if (Array.isArray(voters) && voters.includes(userId)) {
                votesObj[poll.id] = Number(optionIdx);
              }
            }
          });
          setUserVotes(votesObj);
        } else {
          setUserVotes({});
        }
      } else {
        setError(data.error || "Failed to load polls.");
      }
    } catch (e) {
      setError("Failed to load polls.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (thread_id) fetchPolls();
  }, [thread_id, userId]);

  function RenderPoll({ poll }: { poll: Poll }) {
    const pollExpired = new Date() > new Date(poll.deadline);
    const isOwner = currentUser?.username && poll.author?.username === currentUser.username;
    const isDeleted = poll.question === "[DELETED]";

    const [isEditing, setIsEditing] = useState(false);
    const [editQuestion, setEditQuestion] = useState(poll.question);
    const [editOptions, setEditOptions] = useState(poll.options.join("\n"));
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    async function handleEditSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
      e.preventDefault();
      setIsSavingEdit(true);
      try {
        const res = await fetch(`/api/polls/${currentUser?.username}/${poll.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: editQuestion,
            options: editOptions.split("\n").map(o => o.trim()).filter(Boolean)
          })
        });
        if (!res.ok) throw new Error("Failed to edit poll");
        setIsEditing(false);
        fetchPolls(true);
      } catch (err) {
        alert("Failed to edit poll");
      } finally {
        setIsSavingEdit(false);
      }
    }

    async function handleDelete() {
      if (!window.confirm("Are you sure you want to delete this poll?")) return;
      setIsDeleting(true);
      try {
         const res = await fetch(`/api/polls/${currentUser?.username}/${poll.id}`, {
           method: "DELETE"
         });
         if (!res.ok) throw new Error("Failed to delete poll");
         fetchPolls(true);
      } catch (err) {
         alert("Failed to delete poll");
      } finally {
         setIsDeleting(false);
      }
    }

    const showResults = pollExpired || userVotes[poll.id] !== undefined;

    return (
      <article className="relative border border-zinc-300 bg-white p-5 sm:p-6 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="float-right ml-3 mb-2 flex flex-col sm:flex-row gap-2">
          {!isDeleted && isOwner && (
            <>
              <button
                type="button"
                title="Edit poll"
                onClick={() => setIsEditing(!isEditing)}
                disabled={isDeleting}
                className="cursor-pointer rounded border border-blue-300 bg-white px-2 py-1 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 dark:bg-zinc-900 disabled:opacity-50"
              >
                {isEditing ? "Cancel Edit" : "Edit"}
              </button>
              <button
                type="button"
                title="Delete poll"
                onClick={handleDelete}
                disabled={isDeleting}
                className="cursor-pointer rounded border border-red-300 bg-white px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:bg-zinc-900 disabled:opacity-50"
              >
                {isDeleting ? "..." : "Delete"}
              </button>
            </>
          )}
          <button
            type="button"
            title="Report poll"
            onClick={() =>
              openReport({
                targetId: poll.id,
                targetType: "POLL",
                contentContext: `${poll.question}\nOptions: ${poll.options.join(" | ")}`,
              })
            }
            className="cursor-pointer rounded px-2 py-1 text-xs font-bold text-zinc-500 transition hover:text-red-600"
          >
            Flag
          </button>
        </div>

        {isEditing ? (
          <form onSubmit={handleEditSubmit} className="mt-2 mb-4">
            <input
              className="block w-full mb-3 p-3 rounded-lg border border-blue-300 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 shadow-inner font-semibold"
              value={editQuestion}
              onChange={(e) => setEditQuestion(e.target.value)}
              required
            />
            <textarea
              className="block w-full mb-4 p-3 rounded-lg border border-blue-300 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 shadow-inner text-sm"
              rows={4}
              value={editOptions}
              onChange={(e) => setEditOptions(e.target.value)}
              placeholder="Options (one per line)"
              required
            />
            <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow transition" disabled={isSavingEdit}>
              {isSavingEdit ? "Saving..." : "Save Edits"}
            </button>
          </form>
        ) : (
          <>
            <div className={`font-bold text-lg mb-2 ${isDeleted ? 'italic text-red-500 opacity-70' : 'text-gray-900 dark:text-gray-100'}`}>
              {poll.question}
            </div>
            { poll.author.username && (
              <div className="text-sm text-zinc-500 mb-1 flex items-center gap-2">
                By <span className="font-bold">{poll.author.username}</span>
                {isOwner && <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 uppercase tracking-widest font-bold">You</span>}
              </div>
            )}
            <div className="text-xs text-zinc-400 mb-2">Deadline: {new Date(poll.deadline).toLocaleString()}</div>
            {pollExpired && !isDeleted && (
              <div className="text-red-500 text-xs mb-2 font-bold uppercase tracking-wider">Voting closed</div>
            )}
            <div className="clear-both" />
            
            {!isDeleted && (
              <div className="mt-4 space-y-2">
                {poll.options.map((option, idx) => {
                  const voteCount = Array.isArray(poll.votes?.[String(idx)])
                    ? poll.votes[String(idx)].length
                    : 0;

                  return (
                    <div
                      key={idx}
                      onClick={async () => {
                        if (pollExpired) return;
                        if (userVotes[poll.id] !== undefined) return;

                        try {
                          const response = await fetch(
                            `/api/forums/threads/${thread_id}/polls/${poll.id}`,
                            { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ optionIndex: idx }) },
                          );
                          if (!response.ok) {
                            const data = await response.json().catch(() => ({}));
                            throw new Error(data.error || "Failed to submit vote");
                          }
                          setUserVotes((prev) => ({ ...prev, [poll.id]: idx }));
                          await fetchPolls(true);
                        } catch (voteError) {
                          setError(voteError instanceof Error ? voteError.message : "Failed to submit vote");
                        }
                      }}
                      className={`flex items-center justify-between border px-4 py-3 text-sm font-semibold transition ${
                        pollExpired || userVotes[poll.id] !== undefined
                          ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
                          : userVotes[poll.id] === idx
                            ? "border-emerald-600 bg-emerald-50 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950/30 dark:text-emerald-300"
                            : "cursor-pointer border-zinc-300 bg-white hover:border-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500"
                      }`}
                      style={pollExpired || userVotes[poll.id] !== undefined || !isLoggedIn ? { pointerEvents: "none" } : {}}
                    >
                      <span>{option}</span>
                      {showResults && (
                        <span className="ml-3 shrink-0 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          {voteCount} {voteCount === 1 ? "vote" : "votes"}
                          {userVotes[poll.id] === idx ? " · ✓ Voted" : ""}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {!isLoggedIn && !isDeleted && (
              <a href="/login" className="mt-4 inline-block text-xs font-bold text-zinc-500 hover:text-zinc-950 dark:hover:text-white">
                Sign in to vote
              </a>
            )}
          </>
        )}
      </article>
    );
  }

  if (loading) return <main className="min-h-screen bg-[#f4f5f7] px-4 py-16 text-center dark:bg-zinc-950"><div className="mx-auto h-8 w-8 animate-spin border-2 border-zinc-400 border-t-zinc-950 dark:border-t-white" /></main>;
  if (error) return <main className="min-h-screen bg-[#f4f5f7] px-4 py-16 text-center text-red-600 dark:bg-zinc-950"><p>{error}</p></main>;

  return (
    <main className="min-h-screen bg-[#f4f5f7] px-4 py-8 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-7 border-b border-zinc-300 pb-5 dark:border-zinc-800">
          <a href={`/forums/threads/${thread_id}`} className="mb-4 inline-block text-sm font-bold text-zinc-500 hover:text-zinc-950 dark:hover:text-white">← Back to discussion</a>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">Fan poll</p>
          <h1 className="wrap-break-word text-3xl font-black tracking-[-0.03em] sm:text-4xl">{threadTitle}</h1>

          <div className="mt-5 flex items-center justify-between gap-4">
            <p className="text-sm text-zinc-500">Vote and see what the community thinks.</p>
            {isLoggedIn && (
              <button
                className="shrink-0 border-b-2 border-zinc-950 px-1 py-2 text-sm font-bold text-zinc-950 dark:border-white dark:text-white"
                onClick={() => setShowPollForm((v) => !v)}
              >
                {showPollForm ? "Cancel" : "Create poll"}
              </button>
            )}
          </div>
        </header>

        {showPollForm && (
          <form
            className="mb-8 border border-zinc-300 bg-zinc-50 p-5 dark:border-zinc-700 dark:bg-zinc-900 sm:p-6"
            onSubmit={async (e) => {
              e.preventDefault();
              setCreatingPoll(true);
              setError("");
              try {
                const res = await fetch(`/api/forums/threads/${thread_id}/polls`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    question: pollQuestion,
                    options: pollOptions.split("\n").map((o) => o.trim()).filter(Boolean),
                    deadline: pollDeadline,
                  }),
                });
                if (!res.ok) throw new Error("Failed to create poll");
                setShowPollForm(false);
                setPollQuestion("");
                setPollOptions("");
                setPollDeadline("");
                fetchPolls(true);
              } catch {
                setError("Failed to create poll.");
              } finally {
                setCreatingPoll(false);
              }
            }}
          >
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">New poll</p>
            <h3 className="mb-5 text-xl font-black tracking-tight">Ask the community</h3>
            <input
              className="mb-3 block w-full border border-zinc-300 bg-white px-4 py-3 text-lg font-bold outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
              placeholder="Poll question"
              value={pollQuestion}
              onChange={e => setPollQuestion(e.target.value)}
              required
            />
            <textarea
              className="mb-3 block min-h-28 w-full resize-y border border-zinc-300 bg-white px-4 py-3 leading-7 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
              placeholder="Add one option per line"
              rows={4}
              value={pollOptions}
              onChange={e => setPollOptions(e.target.value)}
              required
            />
            <input
              className="mb-4 block w-full border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
              type="datetime-local"
              value={pollDeadline}
              onChange={e => setPollDeadline(e.target.value)}
              required
            />
            <div className="flex justify-end">
              <button type="submit" className="border-b-2 border-zinc-950 px-1 py-2 text-sm font-bold text-zinc-950 disabled:opacity-50 dark:border-white dark:text-white" disabled={creatingPoll}>
                {creatingPoll ? "Publishing…" : "Publish poll"}
              </button>
            </div>
          </form>
        )}

        {polls.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 py-12 text-center dark:border-zinc-700 dark:bg-zinc-800/50">
            <p className="text-zinc-500">No polls have been created for this thread yet.</p>
          </div>
        ) : (
          <div className="flex flex-col space-y-6">
            {polls.map((poll) => (
              <RenderPoll key={poll.id} poll={poll} />
            ))}
          </div>
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
    </main>
  );
}
