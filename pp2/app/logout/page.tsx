"use client";
import { useEffect } from "react";

export default function LogoutPage() {
  useEffect(() => {
    fetch("/api/auth/logout", { method: "POST" }).then(() => {
      window.location.href = "/";
    });
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f5f7] text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="flex items-center gap-3 border-y border-zinc-300 px-6 py-4 dark:border-zinc-800">
        <div className="h-4 w-4 animate-spin border-2 border-zinc-400 border-t-zinc-950 dark:border-t-white" />
        <p className="text-sm font-bold uppercase tracking-wider">Signing out</p>
      </div>
    </main>
  );
}
