
import { AppState, Game, Player } from '../types';
import { generateId } from './storage';
import { createNextGame, resolveGameEnd } from './gameLogic';
import { isValidScore } from './rules';

const updatePlayerStats = (
  players: Player[], 
  winners: string[], 
  losers: string[], 
  mode: 'singles' | 'doubles',
  scoreW: number,
  scoreL: number
): Player[] => {
  return players.map(p => {
    if (!winners.includes(p.id) && !losers.includes(p.id)) return p;

    const isWinner = winners.includes(p.id);
    const newStats = { ...(p.stats || { wins: 0, losses: 0, currentStreak: 0, clutchWins: 0, bagelsGiven: 0, totalPoints: 0, bonusPoints: 0, noShows: 0, singles: { wins: 0, losses: 0, currentStreak: 0 }, doubles: { wins: 0, losses: 0, currentStreak: 0 } }) };

    // Flat stats updates
    const wins = (p.wins ?? newStats.wins ?? 0) + (isWinner ? 1 : 0);
    const losses = (p.losses ?? newStats.losses ?? 0) + (isWinner ? 0 : 1);
    const totalPoints = (p.totalPoints ?? newStats.totalPoints ?? 0) + (isWinner ? scoreW : scoreL);
    let currentStreak = p.currentStreak ?? newStats.currentStreak ?? 0;
    let clutchWins = p.clutchWins ?? newStats.clutchWins ?? 0;
    let bagelsGiven = p.bagelsGiven ?? newStats.bagelsGiven ?? 0;

    // Points
    newStats.totalPoints = totalPoints;

    // W/L
    newStats.wins = wins;
    newStats.losses = losses;

      // GLOBAL STREAK
      if (isWinner) {
        currentStreak = currentStreak > 0 ? currentStreak + 1 : 1;
        // Lore Stats
        if (scoreW === 15 && scoreL === 14) clutchWins++;
        if (scoreW === 15 && scoreL === 0) bagelsGiven++;
      } else {
      currentStreak = currentStreak < 0 ? currentStreak - 1 : -1;
    }

    newStats.currentStreak = currentStreak;
    newStats.clutchWins = clutchWins;
    newStats.bagelsGiven = bagelsGiven;

    const modeStats = mode === 'singles' ? newStats.singles : newStats.doubles;
    modeStats.wins += isWinner ? 1 : 0;
    modeStats.losses += isWinner ? 0 : 1;

    return { 
      ...p, 
      gamesPlayed: p.gamesPlayed + 1, 
      wins,
      losses,
      totalPoints,
      currentStreak,
      clutchWins,
      bagelsGiven,
      stats: newStats 
    };
  });
};

export const runScheduler = (state: AppState): AppState => {
  let nextState = { ...state, activeGames: [...state.activeGames] };
  let hasChanges = false;
  let schedulingPossible = true;

  while (schedulingPossible) {
    schedulingPossible = false;
    const busyCourtIds = nextState.activeGames.map(g => g.courtId);
    let totalCourts = nextState.activeSession ? nextState.activeSession.activeCourts : 0;

    const allCourtIds = Array.from({ length: totalCourts }, (_, i) => i + 1);
    const idleCourtIds = allCourtIds.filter(id => !busyCourtIds.includes(id)).sort((a, b) => a - b);

    if (idleCourtIds.length === 0) break;

    if (nextState.activeSession) {
      const courtId = idleCourtIds[0];
      const result = createNextGame(courtId, nextState.queue, nextState.players, nextState.activeSession);

      if (result) {
        nextState = { ...nextState, queue: result.newQueue, activeGames: [...nextState.activeGames, result.game] };
        hasChanges = true;
        schedulingPossible = true;
        continue;
      }
    }
  }
  return hasChanges ? nextState : state;
};

// PUBLIC HELPER FOR LEAGUE MATCHES
export const updateStatsForGame = (
  players: Player[],
  teamA: string[],
  teamB: string[],
  scoreA: number,
  scoreB: number,
  mode: 'singles' | 'doubles'
): Player[] => {
    const winners = scoreA > scoreB ? teamA : teamB;
    const losers = scoreA > scoreB ? teamB : teamA;
    const scoreW = Math.max(scoreA, scoreB);
    const scoreL = Math.min(scoreA, scoreB);
    
    return updatePlayerStats([...players], winners, losers, mode, scoreW, scoreL);
};

export const finalizeGameSilently = (state: AppState, gameId: string): AppState => {
  const game = state.activeGames.find(g => g.id === gameId);
  if (!game) return state;

  // No stats update here — stats already handled by league/tournament logic
  const nextState: AppState = {
    ...state,
    activeGames: state.activeGames.filter(g => g.id !== gameId)
  };

  return runScheduler(nextState);
};

export const finalizeGame = (state: AppState, gameId: string, scoreA: number, scoreB: number): AppState => {
  // CRITICAL: Enforce global scoring rules
  if (!isValidScore(scoreA, scoreB)) {
    console.error("Attempted to finalize game with invalid score:", scoreA, scoreB);
    return state; // Reject update
  }

  const game = state.activeGames.find(g => g.id === gameId);
  if (!game) return state;
  if (game.isFinished) return state; // Prevent double finalization

  const finishedGame: Game = { ...game, scoreA, scoreB, isFinished: true, endTime: Date.now() };
  const winners = scoreA > scoreB ? game.teamA : game.teamB;
  const losers = scoreA > scoreB ? game.teamB : game.teamA;
  const scoreW = Math.max(scoreA, scoreB);
  const scoreL = Math.min(scoreA, scoreB);

  const nextPlayers = updatePlayerStats([...state.players], winners, losers, game.mode, scoreW, scoreL);

  // Update Trophy Holder (Current #1)
  const trophyHolder = [...nextPlayers].sort((a,b) => {
    const aWins = a.wins ?? a.stats?.wins ?? 0;
    const bWins = b.wins ?? b.stats?.wins ?? 0;
    const aLosses = a.losses ?? a.stats?.losses ?? 0;
    const bLosses = b.losses ?? b.stats?.losses ?? 0;
    const aTotal = aWins + aLosses;
    const bTotal = bWins + bLosses;
    const aRate = aTotal > 0 ? aWins / aTotal : 0;
    const bRate = bTotal > 0 ? bWins / bTotal : 0;
    return bWins - aWins || bRate - aRate;
  })[0];

  let nextState: AppState = {
    ...state,
    players: nextPlayers,
    trophyHolderId: trophyHolder?.id,
    activeGames: state.activeGames.filter(g => g.id !== gameId)
  };

  if (nextState.activeSession) {
    const session = nextState.activeSession;
    const returningPlayers = resolveGameEnd(finishedGame, session.rotationType);
    let nextQueue = [...nextState.queue, ...returningPlayers];

    nextState = {
      ...nextState,
      activeSession: { ...session, history: [...session.history, finishedGame] },
      queue: nextQueue
    };
  }

  return runScheduler(nextState);
};
