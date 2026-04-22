"use client";
import { useState, useEffect, useMemo } from "react";

interface Report {
  id: number;
  reason: string;
  aiVerdict?: string;
  aiExplanation?: string;
  toxicityScore?: number;
  status: string;
  threadId?: number;
  postId?: number;
  pollId?: number;
  contextRoute?: string | null;
  targetUser?: { id: number; username: string } | null;
  totalReportsOnUser?: number;
  reporter?: { id: number; username: string; avatar?: string; };
  createdAt: string;
}

interface Group {
  targetId: number;
  type: "THREAD" | "POST" | "POLL";
  reports: Report[];
  count: number;
  maxToxicity: number;
  aiVerdict: string;
  firstReportId: number;
  contextRoute: string | null;
}

interface Appeal {
  id: number;
  message: string;
  status: string;
  user: { id: number; username: string; email: string; avatar?: string; };
  bannedThreads: any[];
  bannedPosts: any[];
}

export default function ModerationDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"THREADS" | "POSTS" | "POLLS" | "APPEALS">("THREADS");
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [qRes, aRes] = await Promise.all([
        fetch("/api/moderation/queue"),
        fetch("/api/moderation/appeal")
      ]);
      const [qData, aData] = await Promise.all([
        qRes.ok ? qRes.json() : Promise.reject(`Queue error: ${qRes.status}`),
        aRes.ok ? aRes.json() : Promise.reject(`Appeal error: ${aRes.status}`)
      ]);
      const pendingReports = Array.isArray(qData.reports) ? qData.reports.filter((r: any) => r.status === "PENDING") : [];
      setReports(pendingReports);
      const pendingAppeals = Array.isArray(aData.appeals) ? aData.appeals.filter((a: any) => a.status === "PENDING") : [];
      setAppeals(pendingAppeals);
    } catch (e: any) {
      setError(e.message || "Failed to load moderation data");
    } finally {
      setLoading(false);
    }
  };

  const groupedThreads = useMemo(() => {
    const map = new Map<number, Group>();
    reports.filter(r => r.threadId).forEach(r => {
      const tid = r.threadId!;
      if (!map.has(tid)) {
        map.set(tid, {
          targetId: tid,
          type: "THREAD",
          reports: [],
          count: 0,
          maxToxicity: 0,
          aiVerdict: "SAFE",
          firstReportId: r.id,
          contextRoute: r.contextRoute || null,
        });
      }
      const g = map.get(tid)!;
      g.reports.push(r);
      g.count++;
      if (r.toxicityScore && r.toxicityScore > g.maxToxicity) g.maxToxicity = r.toxicityScore;
      if (r.aiVerdict === "INAPPROPRIATE") g.aiVerdict = "INAPPROPRIATE";
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count || b.maxToxicity - a.maxToxicity);
  }, [reports]);

  const groupedPosts = useMemo(() => {
    const map = new Map<number, Group>();
    reports.filter(r => r.postId).forEach(r => {
      const pid = r.postId!;
      if (!map.has(pid)) {
        map.set(pid, {
          targetId: pid,
          type: "POST",
          reports: [],
          count: 0,
          maxToxicity: 0,
          aiVerdict: "SAFE",
          firstReportId: r.id,
          contextRoute: r.contextRoute || null,
        });
      }
      const g = map.get(pid)!;
      g.reports.push(r);
      g.count++;
      if (r.toxicityScore && r.toxicityScore > g.maxToxicity) g.maxToxicity = r.toxicityScore;
      if (r.aiVerdict === "INAPPROPRIATE") g.aiVerdict = "INAPPROPRIATE";
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count || b.maxToxicity - a.maxToxicity);
  }, [reports]);

  const groupedPolls = useMemo(() => {
    const map = new Map<number, Group>();
    reports.filter(r => r.pollId).forEach(r => {
      const pollId = r.pollId!;
      if (!map.has(pollId)) {
        map.set(pollId, {
          targetId: pollId,
          type: "POLL",
          reports: [],
          count: 0,
          maxToxicity: 0,
          aiVerdict: "SAFE",
          firstReportId: r.id,
          contextRoute: r.contextRoute || null,
        });
      }
      const g = map.get(pollId)!;
      g.reports.push(r);
      g.count++;
      if (r.toxicityScore && r.toxicityScore > g.maxToxicity) g.maxToxicity = r.toxicityScore;
      if (r.aiVerdict === "INAPPROPRIATE") g.aiVerdict = "INAPPROPRIATE";
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count || b.maxToxicity - a.maxToxicity);
  }, [reports]);

  const handleReportAction = async (reportId: number, targetId: number, type: "THREAD" | "POST" | "POLL", conclusion: "APPROVED" | "HIDE_ONLY" | "DISMISSED") => {
    const actionLabel = conclusion === "APPROVED"
      ? "Approve this report, hide content, and ban the user"
      : conclusion === "HIDE_ONLY"
        ? "Approve this report and hide content only"
        : "Dismiss this report";
    if (!confirm(`Are you sure you want to ${actionLabel}?`)) return;
    setProcessing(`report-${targetId}`);
    try {
      const res = await fetch("/api/moderation/ban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, conclusion })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Action failed");
      }
      setReports(prev => prev.filter(r => {
        if (type === "THREAD") return r.threadId !== targetId;
        if (type === "POST") return r.postId !== targetId;
        return r.pollId !== targetId;
      }));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleAppealAction = async (appealId: number, action: "APPROVE" | "REJECT") => {
    if (!confirm(`Are you sure you want to ${action === "APPROVE" ? "Approve this appeal & Unban user" : "Reject this appeal"}?`)) return;
    setProcessing(`appeal-${appealId}`);
    try {
      const res = await fetch(`/api/moderation/appeal/${appealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Action failed");
      }
      setAppeals(prev => prev.filter(a => a.id !== appealId));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleViewContext = async (targetId: number, type: "THREAD" | "POST" | "POLL", contextRoute: string | null) => {
    if (contextRoute) {
      window.open(contextRoute, "_blank");
      return;
    }
    alert(`Context route is unavailable for ${type} ID ${targetId}.`);
  };

  const renderGroup = (g: Group) => (
    <div key={g.targetId} className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm p-5 hover:shadow-md transition">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">{g.type} #{g.targetId}</h3>
          <p className="text-zinc-500 text-sm">{g.count} Reports</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`px-2.5 py-1 text-xs font-bold uppercase rounded-full ${g.aiVerdict === 'INAPPROPRIATE' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
            {g.aiVerdict}
          </span>
          {g.maxToxicity > 0 && (
            <span className="text-xs text-zinc-500 font-medium">Toxicity: {(g.maxToxicity * 100).toFixed(0)}%</span>
          )}
        </div>
      </div>
      
      <div className="bg-zinc-50 dark:bg-zinc-900 rounded p-3 text-sm space-y-2 mb-4 border border-zinc-100 dark:border-zinc-800 max-h-40 overflow-y-auto">
        <p className="font-semibold text-zinc-700 dark:text-zinc-300 mb-1 border-b border-zinc-200 dark:border-zinc-700 pb-1">Report Reasons:</p>
        {g.reports.map(r => (
          <div key={r.id} className="text-zinc-600 dark:text-zinc-400">
            <span className="font-medium text-indigo-600 dark:text-indigo-400">{r.reporter?.username || 'Unknown'}:</span> {r.reason}
          </div>
        ))}
        {g.reports[0]?.aiExplanation && (
          <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700 text-zinc-500 italic">
            <strong>AI Note:</strong> {g.reports[0].aiExplanation}
          </div>
        )}
      </div>

      <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded p-3 text-sm mb-4 border border-indigo-100 dark:border-indigo-900/40">
        <p className="font-semibold text-indigo-700 dark:text-indigo-300 mb-1">Total Number Of Reports On This User</p>
        {g.reports[0]?.targetUser ? (
          <p className="text-zinc-700 dark:text-zinc-300">
            User ID: <span className="font-semibold">{g.reports[0].targetUser?.id}</span>, Username: <span className="font-semibold">{g.reports[0].targetUser?.username}</span>, Total Reports: <span className="font-semibold">{g.reports[0].totalReportsOnUser ?? 0}</span>
          </p>
        ) : (
          <p className="text-zinc-500 dark:text-zinc-400">No associated user found for this content.</p>
        )}
      </div>

      <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
        <button 
          onClick={() => handleViewContext(g.targetId, g.type, g.contextRoute)}
          disabled={processing === `context-${g.targetId}`}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition cursor-pointer disabled:opacity-50"
        >
          {processing === `context-${g.targetId}` ? "Loading..." : "View Content"}
        </button>
        <button 
          onClick={() => handleReportAction(g.firstReportId, g.targetId, g.type, "DISMISSED")}
          disabled={processing === `report-${g.targetId}`}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition cursor-pointer disabled:opacity-50"
        >
          Dismiss All
        </button>
        <button 
          onClick={() => handleReportAction(g.firstReportId, g.targetId, g.type, "HIDE_ONLY")}
          disabled={processing === `report-${g.targetId}`}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white transition shadow-sm cursor-pointer disabled:opacity-50"
        >
          Approve (Hide Only)
        </button>
        <button 
          onClick={() => handleReportAction(g.firstReportId, g.targetId, g.type, "APPROVED")}
          disabled={processing === `report-${g.targetId}`}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition shadow-sm cursor-pointer disabled:opacity-50"
        >
          Approve (Hide & Ban)
        </button>
      </div>
    </div>
  );

  return (
    <div className="py-2 max-w-5xl mx-auto px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold mb-2 text-indigo-700 dark:text-indigo-300 drop-shadow-md">Moderation Dashboard</h1>
        <p className="text-zinc-600 dark:text-zinc-400 text-lg">Review Reports and Manage Appeals</p>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
          {(["THREADS", "POSTS", "POLLS", "APPEALS"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-4 px-6 text-sm font-bold uppercase tracking-wider text-center transition-colors cursor-pointer ${activeTab === tab 
                ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400' 
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
            >
              {tab} 
              <span className="ml-2 px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-xs text-zinc-600 dark:text-zinc-300">
                {tab === "THREADS" ? groupedThreads.length : tab === "POSTS" ? groupedPosts.length : tab === "POLLS" ? groupedPolls.length : appeals.length}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 bg-zinc-50/50 dark:bg-zinc-900/50 min-h-[400px]">
          {loading && <div className="text-center py-10 text-zinc-500">Loading data...</div>}
          {error && <div className="text-center py-10 text-red-500 font-medium">{error}</div>}
          
          {!loading && !error && activeTab === "THREADS" && (
            <div className="space-y-4">
              {groupedThreads.length === 0 ? (
                <p className="text-center py-10 text-zinc-500">No pending thread reports.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">{groupedThreads.map(renderGroup)}</div>
              )}
            </div>
          )}

          {!loading && !error && activeTab === "POSTS" && (
            <div className="space-y-4">
              {groupedPosts.length === 0 ? (
                <p className="text-center py-10 text-zinc-500">No pending post reports.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">{groupedPosts.map(renderGroup)}</div>
              )}
            </div>
          )}

          {!loading && !error && activeTab === "POLLS" && (
            <div className="space-y-4">
              {groupedPolls.length === 0 ? (
                <p className="text-center py-10 text-zinc-500">No pending poll reports.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">{groupedPolls.map(renderGroup)}</div>
              )}
            </div>
          )}

          {!loading && !error && activeTab === "APPEALS" && (
            <div className="space-y-4">
              {appeals.length === 0 ? (
                <p className="text-center py-10 text-zinc-500">No pending appeals.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                  {appeals.map(appeal => (
                    <div key={appeal.id} className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm p-5 hover:shadow-md transition">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          {appeal.user?.avatar ? (
                            <img src={appeal.user.avatar} className="w-10 h-10 rounded-full bg-zinc-200" alt="avatar" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                              {appeal.user?.username?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{appeal.user?.username}</h3>
                            <p className="text-zinc-500 text-xs">Appeal #{appeal.id}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-zinc-50 dark:bg-zinc-900 rounded p-3 text-sm space-y-2 mb-4 border border-zinc-100 dark:border-zinc-800">
                        <p className="font-semibold text-zinc-700 dark:text-zinc-300">Message from user:</p>
                        <p className="text-zinc-600 dark:text-zinc-400 italic">"{appeal.message}"</p>
                      </div>

                      {/* Context */}
                      <div className="bg-red-50 dark:bg-red-900/10 rounded p-3 text-sm space-y-2 mb-4 border border-red-100 dark:border-red-900/30 max-h-32 overflow-y-auto">
                        <p className="font-semibold text-red-800 dark:text-red-400 text-xs uppercase tracking-wide">Ban Context (Hidden Content)</p>
                        {appeal.bannedThreads?.length === 0 && appeal.bannedPosts?.length === 0 ? (
                          <p className="text-zinc-500 text-xs">No hidden recent posts/threads found.</p>
                        ) : (
                          <>
                            {appeal.bannedThreads?.map((t: any) => (
                              <div key={t.id} className="text-red-700 dark:text-red-300 text-xs">
                                <strong>Thread #{t.id}:</strong> {t.title}
                              </div>
                            ))}
                            {appeal.bannedPosts?.map((p: any) => (
                              <div key={p.id} className="text-red-700 dark:text-red-300 text-xs">
                                <strong>Post #{p.id}:</strong> {p.textContent}
                              </div>
                            ))}
                          </>
                        )}
                      </div>

                      <div className="flex justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                         <button 
                          onClick={() => handleAppealAction(appeal.id, "REJECT")}
                          disabled={processing === `appeal-${appeal.id}`}
                          className="px-4 py-2 rounded-lg text-sm font-semibold bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition cursor-pointer disabled:opacity-50"
                        >
                          Reject
                        </button>
                        <button 
                          onClick={() => handleAppealAction(appeal.id, "APPROVE")}
                          disabled={processing === `appeal-${appeal.id}`}
                          className="px-4 py-2 rounded-lg text-sm font-semibold bg-green-600 hover:bg-green-700 text-white transition shadow-sm cursor-pointer disabled:opacity-50"
                        >
                          Approve (Unban)
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
