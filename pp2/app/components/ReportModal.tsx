"use client";

import { useEffect, useState } from "react";

type ReportTargetType = "THREAD" | "POST" | "POLL";

type ReportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  targetId: number | null;
  targetType: ReportTargetType | null;
  contentContext: string;
  reporterId: number | null;
  onSubmitted?: () => void;
};

export default function ReportModal({
  isOpen,
  onClose,
  targetId,
  targetType,
  contentContext,
  reporterId,
  onSubmitted,
}: ReportModalProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setReason("");
      setSubmitting(false);
      setError("");
      setSuccessMessage("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const canSubmit =
    !submitting &&
    !!targetType &&
    typeof targetId === "number" &&
    !!reporterId &&
    reason.trim().length > 0 &&
    contentContext.trim().length > 0;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!targetType || typeof targetId !== "number") {
      setError("Invalid report target.");
      return;
    }

    if (!reporterId) {
      setError("Please log in to submit a report.");
      return;
    }

    if (!reason.trim()) {
      setError("Please provide a report reason.");
      return;
    }

    if (!contentContext.trim()) {
      setError("Unable to report: missing target context.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/moderation/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetId,
          targetType,
          reason: reason.trim(),
          content: contentContext,
          reporterId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to submit report.");
      }

      setSuccessMessage("Report submitted successfully.");
      onSubmitted?.();
      setTimeout(() => {
        onClose();
      }, 400);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to submit report.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Report {targetType || "item"}</h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            X
          </button>
        </div>

        <div className="mb-3 text-sm text-zinc-600 dark:text-zinc-300">
          <span className="font-semibold">Target ID:</span> {typeof targetId === "number" ? targetId : "N/A"}
        </div>

        <div className="mb-3">
          <div className="mb-1 text-sm font-semibold text-zinc-700 dark:text-zinc-200">Involved Context</div>
          <div className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
            {contentContext?.trim() ? contentContext : "No context available."}
          </div>
        </div>

        {!reporterId && (
          <div className="mb-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            You must be logged in to submit a report.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-200">
            Reason
          </label>
          <textarea
            className="mb-3 block min-h-28 w-full rounded border border-zinc-300 p-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            placeholder="Describe why this content should be reviewed"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />

          {error && <div className="mb-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          {successMessage && (
            <div className="mb-3 rounded border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700">
              {successMessage}
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded bg-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="cursor-pointer rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
            >
              {submitting ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
