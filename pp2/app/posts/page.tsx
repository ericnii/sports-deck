'use client';

import { useEffect, useState } from 'react';

export default function PostsPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const me = await fetch('/api/auth/me').then((r) => r.json());
        if (!me.user?.username) return;
        const res = await fetch(`/api/posts/${me.user.username}`);
        if (res.ok) setPosts(await res.json());
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <main className="min-h-screen bg-[#f4f5f7] px-4 py-10 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 border-b border-zinc-300 pb-6 dark:border-zinc-800">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">Community</p>
          <h1 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl">Posts</h1>
        </header>
        <section className="border border-zinc-300 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {loading ? (
            <p className="py-16 text-center text-zinc-500">Loading posts…</p>
          ) : posts.length === 0 ? (
            <p className="py-16 text-center text-zinc-500">No posts to show.</p>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {posts.map((post) => (
                <a key={post.id} href={`/forums/threads/${post.threadId}`} className="group block px-5 py-5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 sm:px-6">
                  <p className="leading-7 text-zinc-800 dark:text-zinc-200">{post.textContent}</p>
                  <p className="mt-2 text-xs font-bold uppercase tracking-wider text-zinc-500">View discussion · {new Date(post.createdAt).toLocaleDateString()}</p>
                </a>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}