"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface ConnectionUser {
  id: string;
  username: string;
  avatar: string | null;
  followDate: string;
}

export default function ConnectionsManager() {
  const [activeTab, setActiveTab] = useState<"followers" | "following">("followers");
  
  const [followers, setFollowers] = useState<ConnectionUser[]>([]);
  const [following, setFollowing] = useState<ConnectionUser[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [followersRes, followingRes] = await Promise.all([
        fetch("/api/social/followers"),
        fetch("/api/social/following")
      ]);

      if (!followersRes.ok || !followingRes.ok) {
        throw new Error("Failed to load connections.");
      }

      const followersData = await followersRes.json();
      const followingData = await followingRes.json();

      setFollowers(followersData.followers || followersData.data || []);
      setFollowing(followingData.following || followingData.data || []);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred while fetching connections.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRemoveFollower = async (userId: string) => {
    setRemovingId(userId);
    setConfirmingId(null); // Close the confirmation inline-tooltip
    
    try {
      const res = await fetch(`/api/social/followers/${userId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to remove follower.");
      }

      // Success: Remove user from local state smoothly
      setFollowers((prev) => prev.filter((user) => user.id !== userId));
    } catch (err: any) {
      alert(err.message || "Could not remove follower.");
    } finally {
      setRemovingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-zinc-500 font-medium">Loading network...</p>
        </div>
      </div>
    );
  }

  const currentList = activeTab === "followers" ? followers : following;

  return (
    <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg overflow-hidden font-sans">
      
      {/* Header and Tabs */}
      <div className="p-6 border-b border-zinc-200 dark:border-zinc-700">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">Connections</h2>
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
            {errorMsg}
          </div>
        )}
        <div className="flex gap-4">
          <button
            onClick={() => {
              setActiveTab("followers");
              setConfirmingId(null);
            }}
            className={`relative px-4 py-2 text-sm font-semibold transition-colors duration-200 outline-none ${
              activeTab === "followers" ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            Followers ({followers.length})
            {activeTab === "followers" && (
              <span className="absolute bottom-[-1.6rem] left-0 w-full h-[2px] bg-indigo-500 rounded-t-md animate-in slide-in-from-left-2"></span>
            )}
          </button>
          
          <button
            onClick={() => {
              setActiveTab("following");
              setConfirmingId(null);
            }}
            className={`relative px-4 py-2 text-sm font-semibold transition-colors duration-200 outline-none ${
              activeTab === "following" ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            Following ({following.length})
            {activeTab === "following" && (
              <span className="absolute bottom-[-1.6rem] left-0 w-full h-[2px] bg-indigo-500 rounded-t-md animate-in slide-in-from-right-2"></span>
            )}
          </button>
        </div>
      </div>

      {/* List Content */}
      <div className="p-4 sm:p-6 min-h-[300px]">
        {currentList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 border-dashed">
            <svg className="w-12 h-12 text-zinc-400 dark:text-zinc-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p className="text-zinc-500 dark:text-zinc-400 font-medium">
              No {activeTab} to show.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {currentList.map((user) => (
              <li 
                key={user.id} 
                className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:border-blue-400 transition-colors group"
              >
                {/* User Info */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center border border-transparent group-hover:border-blue-300 transition-colors">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-zinc-500 uppercase">
                        {user.username[0]}
                      </span>
                    )}
                  </div>
                  <div>
                    <Link href={`/users/${user.username}`}>
                      <p className="font-semibold text-zinc-800 dark:text-zinc-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer text-lg">
                        {user.username}
                      </p>
                    </Link>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium tracking-wide">
                      Since {new Date(user.followDate || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                {/* Actions (Only on Followers tab) */}
                {activeTab === "followers" && (
                  <div className="relative">
                    {confirmingId === user.id ? (
                      <div className="flex items-center gap-2 animate-in zoom-in-95 fade-in duration-200">
                        <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 hidden sm:inline-block mr-2">
                          Are you sure?
                        </span>
                        <button
                          onClick={() => setConfirmingId(null)}
                          className="px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 rounded-lg transition-colors border border-zinc-300 dark:border-zinc-600"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleRemoveFollower(user.id)}
                          disabled={removingId === user.id}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 shadow"
                        >
                          {removingId === user.id ? (
                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          ) : (
                            "Remove"
                          )}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmingId(user.id)}
                        disabled={removingId !== null} // Disable other actions if one is removing
                        className="px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-400 bg-transparent border border-zinc-200 dark:border-zinc-700 hover:bg-red-50 dark:hover:bg-red-900/40 hover:border-red-500/50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed opacity-0 group-hover:opacity-100 sm:opacity-100 focus:opacity-100"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
