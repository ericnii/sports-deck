export default function SocialPage() {
  return (
    <main className="min-h-screen bg-[#f4f5f7] px-4 py-10 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 border-b border-zinc-300 pb-6 dark:border-zinc-800">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
            Community
          </p>
          <h1 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl">Fans</h1>
        </header>

        <section className="grid gap-4 border border-zinc-300 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-2 sm:p-8">
          <div>
            <h2 className="text-2xl font-black tracking-tight">
              Connect with the football community
            </h2>
            <p className="mt-3 max-w-md leading-7 text-zinc-600 dark:text-zinc-300">
              Find supporters, follow their updates, and follow conversations around the teams and
              matches you care about.
            </p>
          </div>
          <div className="flex items-end sm:justify-end">
            <a
              href="/profile"
              className="border-b-2 border-zinc-950 py-2 text-sm font-bold dark:border-white"
            >
              Manage connections
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}