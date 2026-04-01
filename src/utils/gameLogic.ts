
import { Game, Player, Session } from '../types';
import { generateId } from './storage';

/**
 * Match Memory
 * Tracks recent team compositions and matchups to enforce variety.
 */
const recentTeams = new Set<string>();
const recentOpponents = new Set<string>();

function teamKey(a: string[], b?: string[]) {
  const tA = [...a].sort().join('|');
  if (!b) return tA;
  const tB = [...b].sort().join('|');
  return [tA, tB].sort().join(' vs ');
}

/**
 * Seeded Random Number Generator (Mulberry32)
 * Ensures repeatable randomness for "Trust" factor.
 */
function mulberry32(seed: number) {
  return function () {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Shuffle array deterministically based on seed
 */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const rng = mulberry32(seed);
  const copy = [...arr];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

/**
 * Helper to estimate player strength
 */
const getPlayerRating = (p: Player) => p.duprRating || (p.skill * 1.0) || 2.0;

/**
 * Calculates balance score for two teams (Lower is better)
 */
function scoreTeams(teamA: Player[], teamB: Player[]): number {
  const skillA = teamA.reduce((s, p) => s + getPlayerRating(p), 0);
  const skillB = teamB.reduce((s, p) => s + getPlayerRating(p), 0);
  return Math.abs(skillA - skillB);
}

/**
 * Generates the best balanced teams from 4 players
 */
function chooseBalancedTeams(
  players: Player[],
  seed: number
): [string[], string[]] {
  if (players.length < 4) return [[players[0].id], [players[1].id]]; // Fallback

  const [a, b, c, d] = players;

  // Possible permutations for 2v2
  const options = [
    { teams: [[a, b], [c, d]], score: 0 },
    { teams: [[a, c], [b, d]], score: 0 },
    { teams: [[a, d], [b, c]], score: 0 },
  ];

  // Score them
  options.forEach(opt => {
    opt.score = scoreTeams(opt.teams[0], opt.teams[1]);

    const teamAIds = opt.teams[0].map(p => p.id);
    const teamBIds = opt.teams[1].map(p => p.id);
    
    const keyA = teamKey(teamAIds);
    const keyB = teamKey(teamBIds);
    const vsKey = teamKey(teamAIds, teamBIds);

    // Penalize repeats heavily
    if (recentTeams.has(keyA)) opt.score += 100;
    if (recentTeams.has(keyB)) opt.score += 100;
    if (recentOpponents.has(vsKey)) opt.score += 50;
  });

  // Sort by balance (lowest diff first)
  options.sort((x, y) => x.score - y.score);

  // Pick best or second-best (adds light randomness so it's not robotic)
  const rng = mulberry32(seed);
  // 80% chance to pick the absolute best, 20% chance to pick 2nd best (if close)
  const pick = (rng() < 0.8 || options.length === 1) ? options[0] : options[1];

  return [
    pick.teams[0].map(p => p.id),
    pick.teams[1].map(p => p.id)
  ];
}

/**
 * Creates a new game if enough players are available in the queue.
 * Removes selected players from the queue.
 */
export const createNextGame = (
  courtId: number,
  queue: string[],
  players: Player[],
  session: Session
): { game: Game; newQueue: string[] } | null => {
  
  let mode: 'singles' | 'doubles';
  let playersNeeded = 0;

  // MIXED MODE LOGIC: Prioritize Doubles (4), fall back to Singles (2)
  if (session.playMode === 'mixed') {
    if (queue.length >= 4) {
      mode = 'doubles';
      playersNeeded = 4;
    } else if (queue.length >= 2) {
      mode = 'singles';
      playersNeeded = 2;
    } else {
      return null; // Not enough for even singles
    }
  } else {
    // Strict Modes
    mode = session.playMode;
    playersNeeded = mode === 'singles' ? 2 : 4;
    if (queue.length < playersNeeded) return null;
  }

  const nextUpIds = queue.slice(0, playersNeeded);
  const remainingQueue = queue.slice(playersNeeded);
  const pickedPlayers = nextUpIds.map(id => players.find(p => p.id === id)!);

  let teamA: string[];
  let teamB: string[];

  // Deterministic Seed based on Session state
  const seed = session.id.length + session.history.length * 101 + courtId * 17;

  if (mode === 'singles') {
    // Singles Logic (Simple for now, can be expanded)
    if (session.teamAssignmentMode === 'random_seeded') {
        const shuffled = seededShuffle(nextUpIds, seed);
        teamA = [shuffled[0]];
        teamB = [shuffled[1]];
    } else {
        teamA = [nextUpIds[0]];
        teamB = [nextUpIds[1]];
    }
  } else {
    // Doubles Logic - The Secret Sauce
    switch (session.teamAssignmentMode) {
        case 'queue_order':
            // 1&2 vs 3&4
            teamA = [nextUpIds[0], nextUpIds[1]];
            teamB = [nextUpIds[2], nextUpIds[3]];
            break;

        case 'random_seeded': {
            const shuffled = seededShuffle(nextUpIds, seed);
            teamA = [shuffled[0], shuffled[1]];
            teamB = [shuffled[2], shuffled[3]];
            break;
        }

        case 'balanced':
        default: {
            const [balancedA, balancedB] = chooseBalancedTeams(pickedPlayers, seed);
            teamA = balancedA;
            teamB = balancedB;
            break;
        }
    }
  }
  
  if (mode === 'doubles') {
    recentTeams.add(teamKey(teamA));
    recentTeams.add(teamKey(teamB));
    recentOpponents.add(teamKey(teamA, teamB));

    // Keep memory short (last ~6 matches)
    if (recentTeams.size > 12) {
      recentTeams.clear();
      recentOpponents.clear();
    }
  }

  return {
    game: {
      id: generateId(),
      courtId,
      mode, // Explicitly set the mode for this specific game
      teamA,
      teamB,
      scoreA: 0,
      scoreB: 0,
      startTime: Date.now(),
      isFinished: false,
      events: [],
      highlights: [] // Initialize empty highlight reel
    },
    newQueue: remainingQueue
  };
};

/**
 * Handles the end of a game.
 * Returns players to the queue based on the rotation strategy.
 */
export const resolveGameEnd = (
  game: Game,
  rotationType: 'round_robin' | 'winners_stay'
): string[] => {
  const { teamA, teamB, scoreA, scoreB, mode } = game;
  const winners = scoreA > scoreB ? teamA : teamB;
  const losers = scoreA > scoreB ? teamB : teamA;

  // SINGLES LOGIC
  if (mode === 'singles') {
    if (rotationType === 'winners_stay') {
      // KING OF THE COURT: Winner goes to FRONT of queue (effectively staying). Loser goes to BACK.
      return [...losers, ...winners];
    } else {
      // Round robin singles: Both go to back
      return [...winners, ...losers];
    }
  }

  // DOUBLES LOGIC
  if (rotationType === 'winners_stay') {
    // Standard Open Play: Everyone rotates off
    return [...losers, ...winners];
  } else {
    // Round Robin: Scramble (if implemented later)
    return [...winners, ...losers];
  }
};
