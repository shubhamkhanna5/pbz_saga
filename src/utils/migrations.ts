
import { AppState, League, LeagueMatch, Player } from '../types';

export const migrateState = (state: any, initialState: AppState): AppState => {
  const newState = { ...initialState, ...state };

  // 1. Basic Structure (Ensure arrays are arrays)
  if (!Array.isArray(newState.players)) newState.players = [];
  if (!Array.isArray(newState.pastLeagues)) newState.pastLeagues = [];
  if (!Array.isArray(newState.pastTournaments)) newState.pastTournaments = [];
  if (!Array.isArray(newState.activeGames)) newState.activeGames = [];
  if (!Array.isArray(newState.queue)) newState.queue = [];
  if (!Array.isArray(newState.seasonHistory)) newState.seasonHistory = [];
  
  // Ensure nulls for optional objects if they are missing
  if (newState.activeSession === undefined) newState.activeSession = null;
  if (newState.activeTournament === undefined) newState.activeTournament = null;
  if (newState.activeLeague === undefined) newState.activeLeague = null;

  // 2. Players Migration
  newState.players = newState.players.map((p: any) => ({
    ...p,
    isPresent: p.isPresent ?? true,
    gamesPlayed: p.gamesPlayed ?? 0,
    stats: p.stats ? {
      ...p.stats,
      clutchWins: p.stats.clutchWins ?? 0,
      bagelsGiven: p.stats.bagelsGiven ?? 0,
      totalPoints: p.stats.totalPoints ?? 0,
      bonusPoints: p.stats.bonusPoints ?? 0,
      noShows: p.stats.noShows ?? 0,
      singles: p.stats.singles || { wins: 0, losses: 0, currentStreak: 0 },
      doubles: p.stats.doubles || { wins: 0, losses: 0, currentStreak: 0 }
    } : {
      wins: 0, losses: 0, currentStreak: 0,
      clutchWins: 0, bagelsGiven: 0, totalPoints: 0, bonusPoints: 0, noShows: 0,
      singles: { wins: 0, losses: 0, currentStreak: 0 },
      doubles: { wins: 0, losses: 0, currentStreak: 0 }
    },
    badges: p.badges || []
  }));

  // 3. League Migration
  const migrateLeague = (l: any): League => {
    if (!l) return l;
    const league = { ...l };
    if (!Array.isArray(league.auditLog)) league.auditLog = [];
    if (!Array.isArray(league.players)) league.players = [];
    if (!Array.isArray(league.days)) league.days = [];
    if (!Array.isArray(league.finalStandings)) league.finalStandings = [];

    league.days = league.days.map((d: any) => ({
      ...d,
      attendees: Array.isArray(d.attendees) ? d.attendees : [],
      matches: Array.isArray(d.matches) ? d.matches.map((m: any, idx: number) => ({
        ...m,
        dayId: m.dayId || d.id, // Ensure dayId exists
        events: Array.isArray(m.events) ? m.events : [],
        highlights: Array.isArray(m.highlights) ? m.highlights : [],
        status: m.status || (m.isCompleted ? 'completed' : 'scheduled'),
        noShowPlayerIds: Array.isArray(m.noShowPlayerIds) ? m.noShowPlayerIds : [],
        orderIndex: m.orderIndex ?? idx
      })) : []
    }));

    return league;
  };

  if (newState.activeLeague) newState.activeLeague = migrateLeague(newState.activeLeague);
  newState.pastLeagues = newState.pastLeagues.map(migrateLeague);

  // 4. Tournament Migration
  const migrateTournament = (t: any) => {
    if (!t) return t;
    const tournament = { ...t };
    if (!Array.isArray(tournament.matches)) tournament.matches = [];
    tournament.matches = tournament.matches.map((m: any) => ({
      ...m,
      events: Array.isArray(m.events) ? m.events : [],
      highlights: Array.isArray(m.highlights) ? m.highlights : []
    }));
    return tournament;
  };

  if (newState.activeTournament) newState.activeTournament = migrateTournament(newState.activeTournament);
  newState.pastTournaments = Array.isArray(newState.pastTournaments) ? newState.pastTournaments.map(migrateTournament) : [];

  // 5. Active Games Migration
  newState.activeGames = Array.isArray(newState.activeGames) ? newState.activeGames.map((g: any) => ({
    ...g,
    events: Array.isArray(g.events) ? g.events : [],
    highlights: Array.isArray(g.highlights) ? g.highlights : []
  })) : [];

  return newState as AppState;
};
