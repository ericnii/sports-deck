import { prisma } from "../prisma/db.js"

const API_KEY = process.env.FOOTBALL_DATA_API_KEY;

export async function getMatches() {
  try {
    // Calculate dates: 2 weeks ago to 2 weeks from now
    const today = new Date();
    const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
    const twoWeeksFromNow = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

    const dateFrom = twoWeeksAgo.toISOString().split('T')[0];
    const dateTo = twoWeeksFromNow.toISOString().split('T')[0];

    const url = `https://api.football-data.org/v4/competitions/PL/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`;

    const res = await fetch(url, {
      headers: {
        "X-Auth-Token": API_KEY,
      },
    });
    const data = await res.json();

    // Caching the match into db

    const results = [];
    for (const match of data.matches) {
      try {
        const cachedMatch = await prisma.match.upsert({
          where: {
            externalId: match.id
          },
          update: {
            status: match.status,
            homeScore: match.score?.fullTime?.home,
            awayScore: match.score?.fullTime?.away,
            utcDate: new Date(match.utcDate),
          },
          create: {
            externalId: match.id,
            status: match.status,
            utcDate: new Date(match.utcDate),
            matchDay: match.matchday,
            stage: match.stage,
            venue: match.venue,
            homeScore: match.score?.fullTime?.home,
            awayScore: match.score?.fullTime?.away,

            homeTeam: {
              connectOrCreate: {
                where: { externalId: match.homeTeam.id },
                create: {
                  externalId: match.homeTeam.id,
                  name: match.homeTeam.name,
                  shortName: match.homeTeam.shortName,
                  tla: match.homeTeam.tla,
                  crest: match.homeTeam.crest,
                },
              },
            },
            awayTeam: {
              connectOrCreate: {
                where: { externalId: match.awayTeam.id },
                create: {
                  externalId: match.awayTeam.id,
                  name: match.awayTeam.name,
                  shortName: match.awayTeam.shortName,
                  tla: match.awayTeam.tla,
                  crest: match.awayTeam.crest,
                },
              },
            },
          },
        });

        results.push(cachedMatch);
      } catch (error) {
        console.error(`Failed to sync match ${match.id}:`, error.message);
      }
    }

    return results;
  } catch (error) {
    return { error: "Failed to fetch matches" };
  }
}

export async function getAllMatches() {
  try {
    // Fetch all matches for the PL season (no date filter)
    const url = `https://api.football-data.org/v4/competitions/PL/matches`;

    const res = await fetch(url, {
      headers: {
        "X-Auth-Token": API_KEY,
      },
    });
    const data = await res.json();

    // Cache every match into db
    const results = [];
    for (const match of data.matches) {
      try {
        const cachedMatch = await prisma.match.upsert({
          where: {
            externalId: match.id
          },
          update: {
            status: match.status,
            homeScore: match.score?.fullTime?.home,
            awayScore: match.score?.fullTime?.away,
            utcDate: new Date(match.utcDate),
          },
          create: {
            externalId: match.id,
            status: match.status,
            utcDate: new Date(match.utcDate),
            matchDay: match.matchday,
            stage: match.stage,
            venue: match.venue,
            homeScore: match.score?.fullTime?.home,
            awayScore: match.score?.fullTime?.away,

            homeTeam: {
              connectOrCreate: {
                where: { externalId: match.homeTeam.id },
                create: {
                  externalId: match.homeTeam.id,
                  name: match.homeTeam.name,
                  shortName: match.homeTeam.shortName,
                  tla: match.homeTeam.tla,
                  crest: match.homeTeam.crest,
                },
              },
            },
            awayTeam: {
              connectOrCreate: {
                where: { externalId: match.awayTeam.id },
                create: {
                  externalId: match.awayTeam.id,
                  name: match.awayTeam.name,
                  shortName: match.awayTeam.shortName,
                  tla: match.awayTeam.tla,
                  crest: match.awayTeam.crest,
                },
              },
            },
          },
        });

        results.push(cachedMatch);
      } catch (error) {
        console.error(`Failed to sync match ${match.id}:`, error.message);
      }
    }

    return results;
  } catch (error) {
    return { error: "Failed to fetch all matches" };
  }
}

export async function getStandings() {
  try {
    const res = await fetch('https://api.football-data.org/v4/competitions/PL/standings', {
      headers: {
        "X-Auth-Token": API_KEY,
      },
    });
    const data = await res.json();

    // Caching in DB
    const totalStandings = data.standings.find(s => s.type === 'TOTAL');
    if (!totalStandings) return;

    const results = [];
    for (const standing of totalStandings.table) {
      try {
        const dbTeam = await prisma.team.upsert({
          where: { externalId: standing.team.id },
          update: {
            name: standing.team.name,
            shortName: standing.team.shortName,
            tla: standing.team.tla,
            crest: standing.team.crest
          },
          create: {
            externalId: standing.team.id,
            name: standing.team.name,
            shortName: standing.team.shortName,
            tla: standing.team.tla,
            crest: standing.team.crest
          }
        });

        const newStanding = await prisma.standing.upsert({
          where: {
            teamId_type: {
              teamId: dbTeam.id,
              type: 'TOTAL'
            }
          },
          update: {
            position: standing.position,
            points: standing.points,
            playedGames: standing.playedGames,
            won: standing.won,
            draw: standing.draw,
            lost: standing.lost,
            goalsFor: standing.goalsFor,
            goalsAgainst: standing.goalsAgainst,
            goalDifference: standing.goalDifference,
          },
          create: {
            type: 'TOTAL',
            position: standing.position,
            points: standing.points,
            playedGames: standing.playedGames,
            won: standing.won,
            draw: standing.draw,
            lost: standing.lost,
            goalsFor: standing.goalsFor,
            goalsAgainst: standing.goalsAgainst,
            goalDifference: standing.goalDifference,
            teamId: dbTeam.id
          }
        });

        results.push(newStanding);
      } catch (error) {
        console.error(`Failed to sync standing for team ${standing.team?.name || standing.team?.id}:`, error.message);
      }
    }

    return results;
  } catch (error) {
    return { error: "Failed to fetch standings" };
  }
}

export async function getTeams() {
  try {
    const res = await fetch('https://api.football-data.org/v4/competitions/PL/teams', {
      headers: {
        "X-Auth-Token": API_KEY,
      },
    });
    const data = await res.json();
    return data;
  } catch (error) {
    return { error: "Failed to fetch teams" };
  }
}

