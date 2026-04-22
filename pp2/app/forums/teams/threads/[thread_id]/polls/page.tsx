"use client"
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
  const [polls, setPolls] = useState<Poll[]>([]);
  const [threadTitle, setThreadTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Track which poll/option the user voted for
  const [userVotes, setUserVotes] = useState<{ [pollId: number]: number | null }>({});
  const [userId, setUserId] = useState<number | null>(null);

  const [showPollForm, setShowPollForm] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
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

  // Get userId and login status securely from /api/auth/me
  useEffect(() => {
    async function fetchUserId() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        setUserId(data?.user?.id ?? data?.user?.userId ?? null);
        setIsLoggedIn(!!data.user);
      } catch {
        setUserId(null);
        setIsLoggedIn(false);
      }
    }
    fetchUserId();
  }, []);

  useEffect(() => {
    async function fetchPolls() {
      setLoading(true);
      try {
        const res = await fetch(`/api/forums/teams/threads/${thread_id}/polls`);
        const data = await res.json();
        if (res.ok) {
          setPolls(Array.isArray(data) ? data : data.polls || []);
          setThreadTitle(data.threadTitle);
          // Set userVotes from poll.votes if userId is available
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
        setLoading(false);
      }
    }
    if (thread_id) fetchPolls();
  }, [thread_id, userId]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <button onClick={() => window.history.back()} className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">Go Back</button>
      <h1 className="text-2xl font-bold mb-4">Polls of {threadTitle}</h1>
      <a
        href={`/forums/teams/threads/${thread_id}`}
        className="inline-block mb-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        Go back to Thread
      </a>
      {isLoggedIn && (
        <>
          <button
            className="mb-6 px-4 py-2 ml-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
            onClick={() => setShowPollForm((v) => !v)}
          >
            {showPollForm ? "Cancel Poll" : "Create Poll"}
          </button>
          {showPollForm && (
            <form
              className="mb-6 p-4 bg-zinc-100 dark:bg-zinc-800 rounded shadow"
              onSubmit={async (e) => {
                e.preventDefault();
                setCreatingPoll(true);
                setError("");
                try {
                  const res = await fetch(`/api/forums/teams/threads/${thread_id}/polls`, {
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
                  // Optionally, refresh polls
                  const pollRes = await fetch(`/api/forums/teams/threads/${thread_id}/polls`);
                  const pollData = await pollRes.json();
                  setPolls(Array.isArray(pollData) ? pollData : pollData.polls || []);
                } catch {
                  setError("Failed to create poll.");
                } finally {
                  setCreatingPoll(false);
                }
              }}
            >
              <input
                className="block w-full mb-2 p-2 rounded border"
                placeholder="Poll Question"
                value={pollQuestion}
                onChange={e => setPollQuestion(e.target.value)}
                required
              />
              <textarea
                className="block w-full mb-2 p-2 rounded border"
                placeholder="Poll Options (one per line)"
                value={pollOptions}
                onChange={e => setPollOptions(e.target.value)}
                required
              />
              <input
                className="block w-full mb-2 p-2 rounded border"
                type="datetime-local"
                placeholder="Poll Deadline"
                value={pollDeadline}
                onChange={e => setPollDeadline(e.target.value)}
                required
              />
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded" disabled={creatingPoll}>
                {creatingPoll ? "Creating..." : "Create Poll"}
              </button>
            </form>
          )}
        </>
      )}
      {polls.length === 0 ? (
        <div className="text-zinc-500 text-center">No polls found for this thread.</div>
      ) : (
        <div className="space-y-4">
          {polls.map((poll) => {
            const pollExpired = new Date() > new Date(poll.deadline);
            return (
              <div key={poll.id} className="relative p-4 bg-white dark:bg-zinc-800 rounded shadow">
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
                  className="float-right ml-3 mb-2 cursor-pointer rounded border border-red-300 bg-white px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:bg-zinc-900"
                >
                  Flag
                </button>
                <div className="font-semibold mb-2">{poll.question}</div>
                { poll.author.username && (
                  <div className="text-sm text-zinc-500 mb-1">By {poll.author.username}</div>
                )}
                <div className="text-xs text-zinc-400 mb-2">Deadline: {new Date(poll.deadline).toLocaleString()}</div>
                {pollExpired && (
                  <div className="text-red-500 text-xs mb-2">Voting closed</div>
                )}
                <div className="clear-both" />
                <div className="space-y-2 mt-2">
                  {poll.options.map((option, idx) => (
                    <div
                      key={idx}
                      onClick={async () => {
                        if (pollExpired) return;
                        if (userVotes[poll.id] !== undefined) return;
                        await fetch(`/api/forums/teams/threads/${thread_id}/polls/${poll.id}`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ optionIndex: idx })
                        });
                        setUserVotes((prev) => ({ ...prev, [poll.id]: idx }));
                      }}
                      className={`p-2 rounded transition cursor-pointer ${pollExpired ? "bg-gray-200 text-gray-400 cursor-not-allowed" : userVotes[poll.id] === idx ? "bg-blue-400 text-white" : "bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600"}`}
                      style={pollExpired ? { pointerEvents: "none" } : {}}
                    >
                      {option}
                      {userVotes[poll.id] === idx && <span className="ml-2">(Voted)</span>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
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