"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import TranslateButton from "./TranslateButton";

// --- TypeScript Types ---
type UserShort = { id: string; username: string; avatar: string | null };
type ThreadShort = { id: string; title: string };

type PostActivitySubItem = {
  id: string;
  textContent: string;
  author: UserShort;
  createdAt: string;
};

export type PostActivityEvent = {
  type: "post_activity";
  thread: ThreadShort;
  activity: PostActivitySubItem[];
  createdAt: string;
};

export type FollowingPostEvent = {
  type: "following_post";
  id: string;
  textContent: string;
  author: UserShort;
  thread: ThreadShort;
  replyCount: number;
  createdAt: string;
};

export type TeamUpdateEvent = {
  type: "team_update";
  id: string;
  title: string;
  content: string;
  author: UserShort;
  postCount: number;
  createdAt: string;
};

type FeedItem = PostActivityEvent | FollowingPostEvent | TeamUpdateEvent;

const PAGE_SIZE = 10;

export default function DashboardFeed({ initialLimit = PAGE_SIZE }: { initialLimit?: number }) {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [displayedCount, setDisplayedCount] = useState<number>(initialLimit);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const res = await fetch("/api/feed");

      if (!res.ok) {
        throw new Error(`Failed to load feed (HTTP ${res.status})`);
      }

      const data = await res.json();
      setFeed(data.feed || []);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred while loading your feed.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const loadMore = () => {
    setDisplayedCount((prev) => prev + PAGE_SIZE);
  };

  const visibleFeed = feed.slice(0, displayedCount);
  const hasMore = displayedCount < feed.length;

  if (isLoading && feed.length === 0) {
    return (
      <div className="w-full flex flex-col gap-6 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="w-full h-40 bg-zinc-200 dark:bg-zinc-800 rounded-xl border border-zinc-300 dark:border-zinc-700"></div>
        ))}
      </div>
    );
  }

  if (errorMsg && feed.length === 0) {
    return (
      <div className="w-full p-6 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl flex flex-col items-center justify-center text-center shadow">
        <svg className="w-12 h-12 text-red-600 dark:text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h3 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">Feed Error</h3>
        <p className="text-red-600 dark:text-red-300 md:max-w-md">{errorMsg}</p>
        <button
          onClick={fetchFeed}
          className="mt-6 px-6 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-800/30 dark:hover:bg-red-800/50 text-red-800 dark:text-red-300 font-semibold rounded-lg transition-colors border border-red-200 dark:border-red-800"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  if (!isLoading && feed.length === 0) {
    return (
      <div className="w-full p-12 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 border-dashed flex flex-col items-center justify-center text-center">
        <span className="text-5xl mb-4">🏟️</span>
        <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Your Feed is Empty</h3>
        <p className="text-zinc-600 dark:text-zinc-400 max-w-sm">
          Follow some users or select a favorite team to start seeing highlights and action here!
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 flex flex-col">
      {visibleFeed.map((item, idx) => (
        <FeedCard 
           key={`${item.type}-${"id" in item ? item.id : item.thread.id}-${idx}`} 
           item={item} 
        />
      ))}

      {hasMore && (
        <button
          onClick={loadMore}
          className="w-full py-4 mt-4 relative group overflow-hidden bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 text-blue-600 dark:text-blue-400 font-bold rounded-xl transition shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            Load More Action
            <svg className="w-5 h-5 group-hover:translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </span>
        </button>
      )}

      {/* Reached End Indicator */}
      {!hasMore && displayedCount > initialLimit && (
        <div className="py-6 text-center text-zinc-500 dark:text-zinc-400 font-medium italic flex items-center justify-center gap-3">
          <span className="w-12 h-px bg-zinc-300 dark:bg-zinc-600"></span>
          You've caught up with the action
          <span className="w-12 h-px bg-zinc-300 dark:bg-zinc-600"></span>
        </div>
      )}
    </div>
  );
}

// --- Specific Type Renders ---

function FeedCard({ item }: { item: FeedItem }) {
  switch (item.type) {
    case "post_activity":
      return <PostActivityCard item={item} />;
    case "following_post":
      return <FollowingPostCard item={item} />;
    case "team_update":
      return <TeamUpdateCard item={item} />;
    default:
      return null;
  }
}

// Subcomponent: Grouped Activity on a user's threads
function PostActivityCard({ item }: { item: PostActivityEvent }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:border-blue-400 rounded-xl p-6 shadow-lg transition">
      <div className="flex items-center gap-3 mb-4 border-b border-zinc-200 dark:border-zinc-700 pb-4">
        <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Activity on your thread <Link href={`/forums/threads/${item.thread.id}`} className="text-zinc-900 dark:text-zinc-100 font-bold ml-1 hover:underline hover:text-blue-600 transition-colors">"{item.thread.title}"</Link>
        </p>
      </div>

      <div className="space-y-4">
        {item.activity.map((reply) => (
          <div key={reply.id} className="flex gap-4 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <Link href={`/users/${reply.author.username}`}>
              <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex-shrink-0 border border-zinc-300 dark:border-zinc-600 overflow-hidden cursor-pointer hover:border-blue-400">
                {reply.author.avatar ? (
                  <img src={reply.author.avatar} alt={reply.author.username} className="w-full h-full object-cover" />
                ) : (
                  <span className="w-full h-full flex items-center justify-center text-sm font-bold text-zinc-500 uppercase">
                    {reply.author.username[0]}
                  </span>
                )}
              </div>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                 <Link href={`/users/${reply.author.username}`} className="font-semibold text-indigo-700 dark:text-indigo-400 hover:underline truncate text-sm">
                   @{reply.author.username}
                 </Link>
                 <span className="text-xs text-zinc-500 whitespace-nowrap">
                   {new Date(reply.createdAt).toLocaleDateString()}
                 </span>
              </div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-1 line-clamp-2 leading-relaxed">
                {reply.textContent}
              </p>
              <TranslateButton originalText={reply.textContent} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Subcomponent: Standard Following Post
function FollowingPostCard({ item }: { item: FollowingPostEvent }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:border-blue-400 rounded-xl p-6 shadow-lg transition">
       <div className="flex justify-between items-start mb-4">
         <div className="flex items-center gap-4">
            <Link href={`/users/${item.author.username}`}>
              <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 hover:border-blue-400 overflow-hidden cursor-pointer transition-colors shadow-sm">
                {item.author.avatar ? (
                  <img src={item.author.avatar} alt={item.author.username} className="w-full h-full object-cover" />
                ) : (
                  <span className="w-full h-full flex items-center justify-center text-lg font-bold text-zinc-500 uppercase">
                    {item.author.username[0]}
                  </span>
                )}
              </div>
            </Link>
            <div>
              <Link href={`/users/${item.author.username}`}>
                <h4 className="font-bold text-zinc-900 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer leading-tight">
                  {item.author.username}
                </h4>
              </Link>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5 tracking-wide uppercase">
                Posted Update
              </p>
            </div>
         </div>
         <span className="text-xs font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full border border-zinc-200 dark:border-zinc-700">
           {new Date(item.createdAt).toLocaleDateString()}
         </span>
       </div>

       <div className="mb-4">
         {item.thread && (
           <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2 tracking-wide uppercase">
             In Thread: <Link href={`/forums/threads/${item.thread.id}`} className="text-zinc-700 dark:text-zinc-300 hover:underline hover:text-blue-600 dark:hover:text-blue-400 transition-colors">"{item.thread.title}"</Link>
           </p>
         )}
         <p className="text-zinc-800 dark:text-zinc-200 text-base leading-relaxed break-words whitespace-pre-wrap">
           {item.textContent}
         </p>
         <TranslateButton originalText={item.textContent} />
       </div>

       <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700 flex gap-6">
         <button className="flex items-center gap-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group">
            <svg className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>{item.replyCount} Replies</span>
         </button>
       </div>
    </div>
  );
}

// Subcomponent: Team Specific Highlight/Update Update Card
function TeamUpdateCard({ item }: { item: TeamUpdateEvent }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:border-blue-400 rounded-xl p-6 shadow-lg transition">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-xs font-bold uppercase tracking-wider rounded-lg">
            Team Forum Alert
          </span>
        </div>
        <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
          {new Date(item.createdAt).toLocaleDateString()}
        </span>
      </div>
          
      <Link href={`/forums/threads/${item.id}`}>
        <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2 line-clamp-2 leading-tight hover:underline hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
          {item.title}
        </h3>
      </Link>
      <p className="text-sm text-zinc-700 dark:text-zinc-300 line-clamp-3 leading-relaxed">
        {item.content}
      </p>
      <TranslateButton originalText={item.content} />

      <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
         <div className="flex items-center gap-3">
           <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 overflow-hidden text-xs flex items-center justify-center font-bold text-zinc-500">
             {item.author.avatar ? <img src={item.author.avatar} alt="author" className="w-full h-full object-cover"/> : item.author.username[0].toUpperCase()}
           </div>
           <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
             by <span className="text-zinc-800 dark:text-zinc-200">{item.author.username}</span>
           </span>
         </div>
           
         <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">
           <svg className="w-4 h-4 text-zinc-400 dark:text-zinc-500" fill="currentColor" viewBox="0 0 20 20">
             <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
             <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
           </svg>
           {item.postCount} Posts
         </span>
      </div>
    </div>
  );
}
