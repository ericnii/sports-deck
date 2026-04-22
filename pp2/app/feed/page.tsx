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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10 text-center sm:text-left">
          <h1 className="text-3xl font-extrabold text-indigo-700 dark:text-indigo-300 tracking-tight sm:text-5xl mb-4 drop-shadow-lg">
            Your Highlight Reel
          </h1>
          <p className="text-lg text-zinc-700 dark:text-zinc-300">
            The latest action from your favorite teams and the users you follow.
          </p>
        </div>

        {/* Daily Digest Mount */}
        <DailyDigestCard />

        {/* Dashboard Feed Mount */}
        <DashboardFeed />
      </div>
    </div>
  );
}