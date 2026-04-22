"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function BannedUserInterceptor({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [appealMessage, setAppealMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"IDLE" | "SUCCESS" | "ERROR">("IDLE");
  const [errorMsg, setErrorMsg] = useState("");

  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (mounted) {
          setUser(data.user);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [pathname]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950 dark:text-white">Loading...</div>;
  }

  if (user && user.isBanned && pathname !== "/logout") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-100 dark:bg-zinc-950 px-4">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-red-600 dark:text-red-500 mb-2">Account Banned</h2>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm">
              Your account has been suspended due to violations of our community guidelines.
              {!(user.appeals && user.appeals.length > 0) && " You may submit an appeal below."}
            </p>
          </div>

          {submitStatus === "SUCCESS" || (user.appeals && user.appeals.length > 0) ? (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 p-5 rounded-xl text-center shadow-sm">
              <div className="mb-3 font-semibold text-lg flex items-center justify-center gap-2">
                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Appeal Pending
              </div>
              <p className="text-sm dark:text-indigo-200/80 mb-5 leading-relaxed">
                You already have an appeal under review by our moderation team. You will be notified once a decision has been reached.
              </p>
              {user.appeals?.[0]?.message && (
                <div className="bg-white/60 dark:bg-black/20 p-3 rounded text-left text-sm italic border border-indigo-100 dark:border-indigo-900/50 mb-5 text-indigo-900 dark:text-indigo-200">
                  "{user.appeals[0].message}"
                </div>
              )}
              <div className="pt-2 border-t border-indigo-200 dark:border-indigo-800/50">
                <a href="/logout" className="text-sm font-medium hover:text-indigo-700 dark:hover:text-indigo-300 underline transition underline-offset-2">Log Out</a>
              </div>
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setSubmitting(true);
                setErrorMsg("");
                try {
                  const res = await fetch("/api/moderation/appeal", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId: user.id, message: appealMessage })
                  });
                  const data = await res.json();
                  if (!res.ok) {
                    throw new Error(data.error || "Failed to submit appeal");
                  }
                  setSubmitStatus("SUCCESS");
                } catch (err: any) {
                  // If they already have a pending appeal, it might throw 409
                  if (err.message.includes("already have a pending appeal")) {
                    setSubmitStatus("SUCCESS"); // Show success UI so they know it's pending
                  } else {
                    setErrorMsg(err.message);
                    setSubmitStatus("ERROR");
                  }
                } finally {
                  setSubmitting(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Appeal Message
                </label>
                <textarea
                  required
                  rows={4}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  placeholder="Explain why your ban should be lifted..."
                  value={appealMessage}
                  onChange={(e) => setAppealMessage(e.target.value)}
                />
              </div>

              {submitStatus === "ERROR" && (
                <p className="text-red-500 text-sm">{errorMsg}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition disabled:opacity-50 cursor-pointer"
              >
                {submitting ? "Submitting..." : "Submit Appeal"}
              </button>

              <div className="text-center pt-2">
                <a href="/logout" className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition">
                  Log out of this account
                </a>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
