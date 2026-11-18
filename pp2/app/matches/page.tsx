"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface Team {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
}

interface Match {
  id: number;
  status: string;
  utcDate: string;
  matchDay: number;
  stage: string;
  venue: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: Team;
  awayTeam: Team;
}

function formatDateTime(utcDate: string) {
  const date = new Date(utcDate);
  return {
    date: date.toLocaleDateString("en-CA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    time: date.toLocaleTimeString("en-CA", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

function MatchCard({ match }: { match: Match }) {
  const { date, time } = formatDateTime(match.utcDate);
  const isFinished = match.status === "FINISHED";

  return (
    <article className="border border-zinc-300 bg-white px-5 py-5 dark:border-zinc-800 dark:bg-zinc-900 sm:px-6">
      <div className="mb-5 flex items-center justify-between border-b border-zinc-200 pb-3 text-xs font-bold uppercase tracking-[0.12em] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        <time>{date}</time>
        <span>{time}</span>
        <span className={isFinished ? "text-zinc-700 dark:text-zinc-200" : "text-emerald-700 dark:text-emerald-400"}>
          {isFinished ? "Full time" : match.status.replace("_", " ").toLowerCase()}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex min-w-0 items-center gap-3 sm:justify-end">
          <div className="min-w-0 text-right">
            <p className="truncate text-sm font-black text-zinc-900 dark:text-zinc-100 sm:text-base">{match.awayTeam.name}</p>
            <p className="text-xs uppercase text-zinc-500">Away</p>
          </div>
          <img className="h-11 w-11 shrink-0 object-contain" src={match.awayTeam.crest} alt="" />
        </div>

        <div className="min-w-19 border-x border-zinc-200 px-4 text-center dark:border-zinc-800">
          {isFinished ? (
            <p className="text-2xl font-black tracking-tight sm:text-3xl">
              {match.awayScore} <span className="text-zinc-400">–</span> {match.homeScore}
            </p>
          ) : (
            <p className="text-sm font-bold uppercase text-zinc-400">vs</p>
          )}
        </div>

        <div className="flex min-w-0 items-center gap-3">
          <img className="h-11 w-11 shrink-0 object-contain" src={match.homeTeam.crest} alt="" />
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-zinc-900 dark:text-zinc-100 sm:text-base">{match.homeTeam.name}</p>
            <p className="text-xs uppercase text-zinc-500">Home</p>
          </div>
        </div>
      </div>
    </article>
  );
}

function findCurrentMatchday(matches: Match[]): number {
  if (matches.length === 0) return 1;
  const now = Date.now();
  // Group matches by matchday and find the median date per matchday
  const dayMap = new Map<number, number[]>();
  for (const m of matches) {
    const t = new Date(m.utcDate).getTime();
    if (!dayMap.has(m.matchDay)) dayMap.set(m.matchDay, []);
    dayMap.get(m.matchDay)!.push(t);
  }
  let bestDay = 1;
  let bestDiff = Infinity;
  dayMap.forEach((times, day) => {
    const mid = times.reduce((a, b) => a + b, 0) / times.length;
    const diff = Math.abs(mid - now);
    if (diff < bestDiff) { bestDiff = diff; bestDay = day; }
  });
  return bestDay;
}

const TOTAL_MATCHDAYS = 38;

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMatchday, setSelectedMatchday] = useState<number>(1);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const carouselRef = useRef<HTMLDivElement>(null);
  const activeButtonRef = useRef<HTMLButtonElement>(null);

  const updateArrows = () => {
    const el = carouselRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  const scrollCarousel = (direction: "left" | "right") => {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === "left" ? -200 : 200, behavior: "smooth" });
  };

  useEffect(() => {
    fetch("/api/matches")
      .then((r) => {
        if (!r.ok) throw new Error(`Server error: ${r.status}`);
        return r.json();
      })
      .then((data: Match[]) => {
        const allMatches = Array.isArray(data) ? data : [];
        setMatches(allMatches);
        setSelectedMatchday(findCurrentMatchday(allMatches));
        setLoading(false);
      })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  // Initialise arrow visibility once the carousel is in the DOM
  useEffect(() => { updateArrows(); }, [loading]);

  // Scroll the active matchday button into view when it changes or loads
  useEffect(() => {
    if (activeButtonRef.current && carouselRef.current) {
      activeButtonRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [selectedMatchday, loading]);

  const visibleMatches = matches.filter((m) => m.matchDay === selectedMatchday);

  return (
    <main className="min-h-screen text-zinc-950 dark:text-zinc-100">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8 border-b border-zinc-300 pb-5 dark:border-zinc-800">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">Premier League</p>
          <h1 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl">Fixtures</h1>
        </header>

        <nav className="mb-6 flex items-center gap-2 border-b border-zinc-300 pb-3 dark:border-zinc-800">
          <button
            onClick={() => scrollCarousel("left")}
            className="h-9 w-9 shrink-0 border border-zinc-300 text-lg text-zinc-600 disabled:opacity-30 dark:border-zinc-700 dark:text-zinc-300"
            disabled={!canScrollLeft}
            aria-label="Previous matchdays"
          >‹</button>

          <div ref={carouselRef} onScroll={updateArrows} className="flex flex-1 gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {Array.from({ length: TOTAL_MATCHDAYS }, (_, i) => i + 1).map((day) => (
              <button
                key={day}
                ref={day === selectedMatchday ? activeButtonRef : null}
                onClick={() => setSelectedMatchday(day)}
                className={`min-w-20 shrink-0 border-b-2 px-3 py-2 text-sm font-bold transition ${day === selectedMatchday ? "border-zinc-950 text-zinc-950 dark:border-white dark:text-white" : "border-transparent text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"}`}
              >
                MD {day}
              </button>
            ))}
          </div>

          <button
            onClick={() => scrollCarousel("right")}
            className="h-9 w-9 shrink-0 border border-zinc-300 text-lg text-zinc-600 disabled:opacity-30 dark:border-zinc-700 dark:text-zinc-300"
            disabled={!canScrollRight}
            aria-label="Next matchdays"
          >›</button>
        </nav>

        <section>
          {loading && <p className="py-16 text-center text-zinc-500">Loading matches…</p>}
          {error && <p className="py-16 text-center text-red-600">{error}</p>}
          {!loading && !error && visibleMatches.length === 0 && (
            <p className="border border-zinc-300 py-16 text-center text-zinc-500 dark:border-zinc-800">No matches found for Matchday {selectedMatchday}.</p>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {visibleMatches.map((match) => <MatchCard key={match.id} match={match} />)}
          </div>
        </section>
      </div>
    </main>
  );
}