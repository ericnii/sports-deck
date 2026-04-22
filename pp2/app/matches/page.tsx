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
  const router = useRouter();
  const { date, time } = formatDateTime(match.utcDate);
  return (
    <div
      className="block rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-lg px-6 py-5 font-sans hover:bg-indigo-50 dark:hover:bg-zinc-700 transition cursor-pointer select-none"
    >
      <div className="grid grid-cols-3 items-center w-full gap-y-3 text-zinc-700 dark:text-zinc-200">
        {/* Row 1: date | time | status */}
        <p className="font-medium text-left">{date}</p>
        <p className="text-center font-light text-zinc-500 dark:text-zinc-400">{time}</p>
        <p className="text-right font-medium text-indigo-600 dark:text-indigo-300">{match.status}</p>

        {/* Row 2: away team | score/vs | home team */}
        <a
          onClick={(e) => e.stopPropagation()}
          className="flex flex-col items-center hover:opacity-75 transition-opacity"
        >
          <img className="h-20 w-20" draggable={false} src={match.awayTeam.crest} alt={match.awayTeam.name} />
          <span className="text-center mt-2 text-zinc-700 dark:text-zinc-200 text-sm">
            {match.awayTeam.shortName}
          </span>
        </a>

        <div className="flex justify-center">
          {match.status === "FINISHED" ? (
            <p className="text-4xl font-bold text-zinc-800 dark:text-zinc-100">{match.awayScore} - {match.homeScore}</p>
          ) : (
            <p className="text-4xl font-bold text-zinc-400 dark:text-zinc-500 w-28 text-center">vs</p>
          )}
        </div>

        <a
          onClick={(e) => e.stopPropagation()}
          className="flex flex-col items-center hover:opacity-75 transition-opacity"
        >
          <img className="h-20 w-20" draggable={false} src={match.homeTeam.crest} alt={match.homeTeam.name} />
          <span className="text-center mt-2 text-zinc-700 dark:text-zinc-200 text-sm">
            {match.homeTeam.shortName}
          </span>
        </a>

      </div>
    </div>
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
    <div className="py-10">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-extrabold mb-2 text-indigo-700 dark:text-indigo-300 drop-shadow-lg">Matches</h1>
        <p className="text-zinc-700 dark:text-zinc-300 text-lg">Premier League - Recent &amp; Upcoming Fixtures</p>
      </div>

      <div className="max-w-4xl mx-auto px-4">
        {/* Matchday carousel */}
        <div className="flex items-center gap-2 mt-4">
          {/* Left arrow */}
          <button
            onClick={() => scrollCarousel("left")}
            className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-all duration-200 cursor-pointer hover:bg-indigo-100 dark:hover:bg-zinc-600 ${canScrollLeft ? "opacity-100" : "opacity-20 pointer-events-none"}`}
            aria-label="Scroll left"
          >
            &#8249;
          </button>

          {/* Scrollable pill row */}
          <div
            ref={carouselRef}
            onScroll={updateArrows}
            className="flex flex-1 gap-2 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {Array.from({ length: TOTAL_MATCHDAYS }, (_, i) => i + 1).map((day) => {
              const isActive = day === selectedMatchday;
              return (
                <button
                  key={day}
                  ref={isActive ? activeButtonRef : null}
                  onClick={() => setSelectedMatchday(day)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full border text-sm whitespace-nowrap transition-all duration-200 cursor-pointer
                    ${isActive
                      ? "border-indigo-500 bg-indigo-600 text-white font-semibold"
                      : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-indigo-50 dark:hover:bg-zinc-700 hover:text-indigo-700 dark:hover:text-indigo-200"
                    }`}
                >
                  Matchday {day}
                </button>
              );
            })}
          </div>

          {/* Right arrow */}
          <button
            onClick={() => scrollCarousel("right")}
            className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-all duration-200 cursor-pointer hover:bg-indigo-100 dark:hover:bg-zinc-600 ${canScrollRight ? "opacity-100" : "opacity-20 pointer-events-none"}`}
            aria-label="Scroll right"
          >
            &#8250;
          </button>
        </div>

        {/* Match cards */}
        <section className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading && <p className="text-center py-8 text-zinc-500 dark:text-zinc-400">Loading matches…</p>}
            {error && <p className="text-center py-8 text-red-500">{error}</p>}
            {!loading && !error && visibleMatches.length === 0 && (
              <p className="text-center py-8 text-zinc-500 dark:text-zinc-400">No matches found for Matchday {selectedMatchday}.</p>
            )}
            {visibleMatches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}