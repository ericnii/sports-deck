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
        setPolls(Array.isArray(data) ? data : data.polls || []);
        setThreadTitle(data.threadTitle);
        if (userId && data.polls) {
          const votesObj: { [pollId: number]: number | null } = {};
          data.polls.forEach((poll: any) => {
            if (poll.votes && typeof poll.votes === "object") {
              for (const [optionIdx, voters] of Object.entries(poll.votes)) {
                if (Array.isArray(voters) && voters.includes(userId)) {
                  votesObj[poll.id] = Number(optionIdx);
                }
              }
            }
          });
          setUserVotes(votesObj);
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

    return (
      <div className="relative p-6 bg-white dark:bg-zinc-800 rounded-lg shadow border border-zinc-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-zinc-500 transition">
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
            className="cursor-pointer rounded border border-red-300 bg-white px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:bg-zinc-900"
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
              <div className="space-y-2 mt-4">
                {poll.options.map((option, idx) => (
                  <div
                    key={idx}
                    onClick={async () => {
                      if (pollExpired) return;
                      if (userVotes[poll.id] !== undefined) return;
                      await fetch(`/api/forums/threads/${thread_id}/polls/${poll.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ optionIndex: idx })
                      });
                      setUserVotes((prev) => ({ ...prev, [poll.id]: idx }));
                    }}
                    className={`p-3 rounded-lg transition-all cursor-pointer border ${pollExpired ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 cursor-not-allowed" : userVotes[poll.id] === idx ? "bg-blue-50 border-blue-400 dark:bg-blue-900/30 dark:border-blue-600 text-blue-800 dark:text-blue-200 shadow font-semibold" : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-zinc-500 hover:shadow-md"}`}
                    style={pollExpired ? { pointerEvents: "none" } : {}}
                  >
                    {option}
                    {userVotes[poll.id] === idx && <span className="ml-2 float-right text-blue-600 dark:text-blue-400 font-bold">✓ Voted</span>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  if (loading) return <div className="p-8 text-center flex justify-center"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>;
  if (error) return <div className="p-8 text-center text-red-500 bg-red-50 dark:bg-red-900/10 rounded-xl max-w-md mx-auto mt-10 border border-red-200">{error}</div>;

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <button onClick={() => window.history.back()} className="mb-4 px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 transition">Go Back</button>
      <h1 className="text-3xl font-extrabold mb-4 text-zinc-900 dark:text-zinc-100">Polls for <span className="text-blue-600 dark:text-blue-400">{threadTitle}</span></h1>
      <a
        href={`/forums/threads/${thread_id}`}
        className="inline-block mb-8 px-5 py-2.5 bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 font-bold rounded-lg shadow hover:opacity-90 transition"
      >
        Return to Thread
      </a>
      {isLoggedIn && (
        <>
          <button
            className="mb-6 px-5 py-2.5 ml-3 bg-green-600 text-white font-bold rounded-lg shadow hover:bg-green-700 transition"
            onClick={() => setShowPollForm((v) => !v)}
          >
            {showPollForm ? "Cancel Poll" : "Create New Poll"}
          </button>
          {showPollForm && (
            <form
              className="mb-8 p-6 bg-zinc-50 dark:bg-zinc-800/80 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700"
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
              <h3 className="text-lg font-bold mb-4">Create a New Poll</h3>
              <input
                className="block w-full mb-3 p-3 rounded-lg border focus:ring-2 focus:ring-green-500 bg-white dark:bg-zinc-900"
                placeholder="Poll Question"
                value={pollQuestion}
                onChange={e => setPollQuestion(e.target.value)}
                required
              />
              <textarea
                className="block w-full mb-3 p-3 rounded-lg border focus:ring-2 focus:ring-green-500 bg-white dark:bg-zinc-900"
                placeholder="Poll Options (one per line)"
                rows={4}
                value={pollOptions}
                onChange={e => setPollOptions(e.target.value)}
                required
              />
              <input
                className="block w-full mb-4 p-3 rounded-lg border focus:ring-2 focus:ring-green-500 bg-white dark:bg-zinc-900"
                type="datetime-local"
                placeholder="Poll Deadline"
                value={pollDeadline}
                onChange={e => setPollDeadline(e.target.value)}
                required
              />
              <button type="submit" className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg shadow hover:bg-green-700" disabled={creatingPoll}>
                {creatingPoll ? "Creating..." : "Publish Poll"}
              </button>
            </form>
          )}
        </>
      )}

      {polls.length === 0 ? (
        <div className="text-zinc-500 text-center py-12 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700">No polls have been created for this thread yet.</div>
      ) : (
        <div className="space-y-6 flex flex-col">
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
  );
}
