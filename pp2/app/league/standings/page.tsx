"use client";
import { useState, useEffect } from "react";

interface Team {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
}

interface Standing {
  id: number;
  type: string;
  position: number;
  points: number;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  team: Team;
}

export default function LeagueStandingsPage() {
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/league/standings")
      .then((r) => {
        if (!r.ok) throw new Error(`Server error: ${r.status}`);
        return r.json();
      })
      .then((data: Standing[]) => {
        setStandings(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  return (
    <main className="min-h-screen text-zinc-950 dark:text-zinc-100">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8 border-b border-zinc-300 pb-5 dark:border-zinc-800">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">Premier League</p>
          <h1 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl">League Table</h1>
        </header>

        <section className="overflow-hidden border border-zinc-300 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {loading && <p className="py-16 text-center text-zinc-500">Loading standings…</p>}
          {error && <p className="py-16 text-center text-red-600">{error}</p>}
          {!loading && !error && standings.length === 0 && (
            <p className="py-16 text-center text-zinc-500">No standings found.</p>
          )}

          {!loading && !error && standings.length > 0 && (
            <>
              <div className="flex flex-wrap gap-x-6 gap-y-2 border-b border-zinc-200 px-4 py-4 text-xs font-semibold text-zinc-500 dark:border-zinc-800 dark:text-zinc-400 sm:px-6">
                <span className="flex items-center gap-2"><i className="h-2 w-2 bg-blue-600" />Champions League</span>
                <span className="flex items-center gap-2"><i className="h-2 w-2 bg-orange-500" />Europa League</span>
                <span className="flex items-center gap-2"><i className="h-2 w-2 bg-red-600" />Relegation</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-170 whitespace-nowrap text-left">
                  <thead>
                    <tr className="border-b border-zinc-200 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                      <th className="w-14 px-4 py-3 text-center">Pos</th>
                      <th className="px-3 py-3">Club</th>
                      <th className="px-3 py-3 text-center">P</th>
                      <th className="px-3 py-3 text-center">W</th>
                      <th className="px-3 py-3 text-center">D</th>
                      <th className="px-3 py-3 text-center">L</th>
                      <th className="px-3 py-3 text-center">GD</th>
                      <th className="px-4 py-3 text-right">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((row) => (
                      <tr key={row.id} className="group border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/60">
                        <td className="relative px-4 py-4 text-center font-bold">
                          <span className={`absolute left-0 top-2 bottom-2 w-0.5 ${row.position <= 4 ? "bg-blue-600" : row.position === 5 ? "bg-orange-500" : row.position >= standings.length - 2 ? "bg-red-600" : "bg-transparent"}`} />
                          {row.position}
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex items-center gap-3">
                            <img className="h-7 w-7 object-contain" src={row.team.crest} alt={row.team.name} />
                            <span className="font-bold text-zinc-900 dark:text-zinc-100">{row.team.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-4 text-center text-zinc-600 dark:text-zinc-300">{row.playedGames}</td>
                        <td className="px-3 py-4 text-center text-zinc-600 dark:text-zinc-300">{row.won}</td>
                        <td className="px-3 py-4 text-center text-zinc-600 dark:text-zinc-300">{row.draw}</td>
                        <td className="px-3 py-4 text-center text-zinc-600 dark:text-zinc-300">{row.lost}</td>
                        <td className="px-3 py-4 text-center font-semibold">{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
                        <td className="px-4 py-4 text-right text-lg font-black">{row.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}