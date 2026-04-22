"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "../../../contexts/AuthContext";
import UserActivityChart from "../../components/UserActivityChart";

// --- TypeScript Interfaces ---
interface Thread {
  id: string;
  title: string;
  createdAt: string;
}

interface Post {
  id: string;
  content: string;
  createdAt: string;
  threadId: string;
}

export interface PublicProfileData {
  id: string;
  username: string;
  avatar: string | null;
  favoriteTeamId: string | null;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  createdAt: string;
  threads: Thread[];
  posts: Post[];
}

export default function PublicProfilePage() {
  const params = useParams();
  const rawUsername = params?.username;
  const username = Array.isArray(rawUsername) ? rawUsername[0] : rawUsername;

  const { user: currentUser } = useAuth();
  
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [polls, setPolls] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Optimistic UI state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  // Fetch the profile data
  const fetchProfile = useCallback(async () => {
    if (!username) return;
    try {
      setIsLoading(true);
      setErrorMsg(null);
      
      const [res, pollsRes] = await Promise.all([
        fetch(`/api/users/${username}/profile`),
        fetch(`/api/polls/${username}`)
      ]);
      
      if (!res.ok) {
        throw new Error(`Profile not found (Error ${res.status})`);
      }
      const data = await res.json();
      
      const pData: PublicProfileData = data.profile || data.user || data;
      setProfile(pData);
      setIsFollowing(pData.isFollowing);
      setFollowersCount(pData.followersCount);

      if (pollsRes.ok) {
        setPolls(await pollsRes.json());
      } else {
        setPolls([]);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load profile.");
    } finally {
      setIsLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Handle Follow/Unfollow with Optimistic UI
  const toggleFollow = async () => {
    if (!profile || isFollowLoading) return;
    
    if (!currentUser) {
      setErrorMsg("You must be logged in to follow users.");
      return;
    }

    if (currentUser.id === profile.id) {
      setErrorMsg("You cannot follow yourself.");
      return;
    }

    // Save previous state to rollback if needed
    const previousIsFollowing = isFollowing;
    const previousFollowersCount = followersCount;

    // 1. Optimistic Update
    setIsFollowing(!previousIsFollowing);
    setFollowersCount((prev) => (previousIsFollowing ? prev - 1 : prev + 1));
    setErrorMsg(null);
    setIsFollowLoading(true);

    try {
      const method = previousIsFollowing ? "DELETE" : "POST";
      const res = await fetch(`/api/social/follow/${profile.id}`, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update follow status.");
      }
      
      // Successfully updated! (State is already applied optimistically)
    } catch (err: any) {
      // 2. Rollback on failure
      setIsFollowing(previousIsFollowing);
      setFollowersCount(previousFollowersCount);
      setErrorMsg(err.message || "Could not complete action. State reverted.");
    } finally {
      setIsFollowLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-zinc-500 font-medium">Loading profile...</p>
      </div>
    );
  }

  if (errorMsg && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-6 rounded-xl max-w-md w-full text-center shadow">
          <h2 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">Oops!</h2>
          <p className="text-red-600 dark:text-red-300 mb-6">{errorMsg}</p>
          <button 
            onClick={fetchProfile}
            className="px-6 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-800/30 dark:hover:bg-red-800/50 text-red-800 dark:text-red-300 font-semibold rounded-lg transition-colors border border-red-200 dark:border-red-800"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const isSelf = currentUser?.username === profile.username;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Error Inline Toast */}
        {errorMsg && (
          <div className="flex items-center gap-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4 rounded-lg text-red-700 dark:text-red-400 shadow animate-in fade-in">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium text-sm">{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="ml-auto opacity-70 hover:opacity-100">
              <span className="sr-only">Dismiss</span>
              &times;
            </button>
          </div>
        )}

        {/* Profile Header Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-8 sm:px-12 shadow-lg relative">
          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-8">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="w-32 h-32 rounded-full overflow-hidden border border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                {profile.avatar ? (
                  <img src={profile.avatar} alt={profile.username} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-extrabold text-zinc-400 uppercase">
                    {profile.username[0]}
                  </span>
                )}
              </div>
            </div>

            {/* User Info & Actions */}
            <div className="flex-grow text-center sm:text-left space-y-4">
              <div>
                <h1 className="text-3xl font-extrabold text-indigo-700 dark:text-indigo-300 tracking-tight sm:text-4xl">
                  @{profile.username}
                </h1>
                {profile.favoriteTeamId && (
                  <p className="text-zinc-600 dark:text-zinc-400 mt-2 font-medium flex items-center justify-center sm:justify-start gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                    </svg>
                    Team: {profile.favoriteTeamId}
                  </p>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center justify-center sm:justify-start gap-8 pt-2">
                <div className="text-center sm:text-left">
                  <span className="block text-2xl font-bold leading-none">{followersCount}</span>
                  <span className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Followers</span>
                </div>
                <div className="w-px h-8 bg-zinc-300 dark:bg-zinc-700"></div>
                <div className="text-center sm:text-left">
                  <span className="block text-2xl font-bold leading-none">{profile.followingCount}</span>
                  <span className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Following</span>
                </div>
              </div>

              {/* Follow Button */}
              {!isSelf && (
                <div className="pt-4">
                  <button
                    onClick={toggleFollow}
                    disabled={isFollowLoading}
                    className={`relative overflow-hidden w-full sm:w-48 py-2 px-6 rounded-lg font-bold text-sm shadow transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      isFollowing
                        ? "bg-zinc-100 hover:bg-red-100 hover:text-red-700 hover:border-red-300 dark:bg-zinc-800 dark:hover:bg-red-900/30 dark:hover:text-red-400 dark:hover:border-red-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-600 focus:ring-red-500 group"
                        : "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 border border-transparent"
                    } disabled:opacity-70 disabled:cursor-not-allowed`}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {isFollowLoading ? (
                         <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      ) : isFollowing ? (
                        <>
                          <span className="group-hover:hidden">Following</span>
                          <span className="hidden group-hover:inline">Unfollow</span>
                        </>
                      ) : (
                        "Follow"
                      )}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* User Activity Chart */}
        <div className="w-full relative z-20">
          <UserActivityChart username={profile.username} />
        </div>

        {/* Content Section (Threads, Posts, Polls) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Threads Column */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6 shadow-lg">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
              <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
              Recent Threads
            </h3>
            {profile.threads && profile.threads.length > 0 ? (
              <ul className="space-y-4">
                {profile.threads.map(thread => (
                  <Link href={`/forums/threads/${thread.id}`} key={thread.id} className="block group">
                    <li className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer">
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors hover:underline">{thread.title}</p>
                      <p className="text-xs text-zinc-500 mt-2">
                        {new Date(thread.createdAt).toLocaleDateString()}
                      </p>
                    </li>
                  </Link>
                ))}
              </ul>
            ) : (
              <div className="text-center py-10 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 border-dashed">
                <p className="text-zinc-500">No threads created yet.</p>
              </div>
            )}
          </div>

          {/* Posts Column */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6 shadow-lg">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
              Recent Replies
            </h3>
            {profile.posts && profile.posts.length > 0 ? (
              <ul className="space-y-4">
                {profile.posts.map(post => (
                  <Link href={`/forums/threads/${post.threadId}`} key={post.id} className="block group">
                    <li className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer">
                      <p className="text-zinc-700 dark:text-zinc-300 text-sm line-clamp-3 leading-relaxed group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{post.content}</p>
                      <p className="text-xs text-zinc-500 mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700 flex justify-between items-center group-hover:border-indigo-200 dark:group-hover:border-indigo-800 transition-colors">
                        {new Date(post.createdAt).toLocaleDateString()}
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          View Thread
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </span>
                      </p>
                    </li>
                  </Link>
                ))}
              </ul>
            ) : (
              <div className="text-center py-10 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 border-dashed">
                <p className="text-zinc-500">No replies posted yet.</p>
              </div>
            )}
          </div>
          
          {/* Polls Column */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6 shadow-lg">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Recent Polls
            </h3>
            {polls && polls.length > 0 ? (
              <ul className="space-y-4">
                {polls.map((poll: any) => (
                  <Link href={`/forums/threads/${poll.threadId}`} key={poll.id} className="block group">
                    <li className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer">
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors hover:underline line-clamp-2">{poll.question}</p>
                      <p className="text-xs text-zinc-500 mt-2 flex justify-between items-center group-hover:border-indigo-200 dark:group-hover:border-indigo-800 transition-colors">
                        {new Date(poll.createdAt).toLocaleDateString()}
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          Vote
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </span>
                      </p>
                    </li>
                  </Link>
                ))}
              </ul>
            ) : (
              <div className="text-center py-10 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 border-dashed">
                <p className="text-zinc-500">No polls created yet.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
