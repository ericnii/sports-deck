"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import DashboardFeed from "../components/DashboardFeed";
import DailyDigestCard from "../components/DailyDigestCard";

export default function FeedPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading || (!isAuthenticated && !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-zinc-500 font-medium tracking-wide">Warming up the feed...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="relative min-h-screen text-zinc-950 dark:text-zinc-100">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-14 lg:px-10">
        <div className="mb-10 max-w-4xl border-b border-zinc-300 pb-7 dark:border-zinc-800">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-400">Matchday edition</p>
          <h1 className="text-4xl font-black tracking-[-0.04em] sm:text-6xl">Football, from every angle.</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-zinc-600 dark:text-zinc-300">The stories, standings and conversations shaping the league today.</p>
        </div>

        <div className="mx-auto max-w-4xl">
          {/* Daily Digest Mount */}
          <DailyDigestCard />
          <div className="mt-10">
            <div className="mb-5 flex items-end justify-between border-b border-zinc-300 pb-4 dark:border-zinc-800">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
                  The fan feed
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
                  Latest from your circle
                </h2>
              </div>
            </div>
            {/* Dashboard Feed Mount */}
            <DashboardFeed />
          </div>
        </div>
      </div>
    </main>
  );
}