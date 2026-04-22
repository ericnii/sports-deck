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
    <div className="py-10">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-extrabold mb-2 text-indigo-700 dark:text-indigo-300 drop-shadow-lg">League Standings</h1>
        <p className="text-zinc-700 dark:text-zinc-300 text-lg">Premier League - Current Table</p>
      </div>

      <div className="max-w-4xl mx-auto px-4">
        <section className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-6 mt-4 overflow-hidden">
          {loading && <p className="text-center py-8 text-zinc-500 dark:text-zinc-400">Loading standings…</p>}
          {error && <p className="text-center py-8 text-red-500">{error}</p>}
          {!loading && !error && standings.length === 0 && (
            <p className="text-center py-8 text-zinc-500 dark:text-zinc-400">No standings found.</p>
          )}

          {!loading && !error && standings.length > 0 && (
            <>
            <div className="mb-4 flex flex-wrap items-center justify-start gap-6 text-sm text-zinc-600 dark:text-zinc-400 px-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span>
                <span>Champions League</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-500 inline-block"></span>
                <span>Europa League</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span>
                <span>Relegation</span>
              </div>
            </div>
            <div className="overflow-x-auto [scrollbar-width:thin]">
              <table className="w-full text-left text-zinc-700 dark:text-zinc-200 whitespace-nowrap min-w-[600px]">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 font-medium">
                    <th className="py-3 px-2 w-8 text-center">#</th>
                    <th className="py-3 px-2">Team</th>
                    <th className="py-3 px-2 text-center" title="Played">MP</th>
                    <th className="py-3 px-2 text-center" title="Won">W</th>
                    <th className="py-3 px-2 text-center" title="Drawn">D</th>
                    <th className="py-3 px-2 text-center" title="Lost">L</th>
                    <th className="py-3 px-2 text-center" title="Goals For">GF</th>
                    <th className="py-3 px-2 text-center" title="Goals Against">GA</th>
                    <th className="py-3 px-2 text-center" title="Goal Difference">GD</th>
                    <th className="py-3 px-2 text-center font-bold text-indigo-600 dark:text-indigo-400" title="Points">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-indigo-50 dark:hover:bg-zinc-800 transition cursor-pointer"
                    >
                      <td className="py-3 px-2 text-center font-semibold relative">
                        {(row.position <= 4 || row.position === 5 || row.position >= standings.length - 2) && (
                          <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/4 rounded-r-md ${row.position <= 4 ? "bg-blue-500" : row.position === 5 ? "bg-orange-500" : "bg-red-500"}`}></div>
                        )}
                        <span className={row.position <= 4 ? "text-blue-600 dark:text-blue-400" : row.position === 5 ? "text-orange-600 dark:text-orange-400" : row.position >= standings.length - 2 ? "text-red-600 dark:text-red-400" : ""}>{row.position}</span>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-3">
                          <img className="h-6 w-6 object-contain" src={row.team.crest} alt={row.team.name} draggable={false} />
                          <span className="font-medium text-zinc-800 dark:text-zinc-100">{row.team.shortName || row.team.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center">{row.playedGames}</td>
                      <td className="py-3 px-2 text-center">{row.won}</td>
                      <td className="py-3 px-2 text-center">{row.draw}</td>
                      <td className="py-3 px-2 text-center">{row.lost}</td>
                      <td className="py-3 px-2 text-center">{row.goalsFor}</td>
                      <td className="py-3 px-2 text-center">{row.goalsAgainst}</td>
                      <td className="py-3 px-2 text-center">{row.goalDifference}</td>
                      <td className="py-3 px-2 text-center font-bold text-indigo-600 dark:text-indigo-400">{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
          )}
        </section>
      </div>
    </div>
  );
}