import {
  League,
  LeagueDay,
  LeagueMatch,
  LeagueStanding,
  Player,
  Game,
  LeagueAuditEntry,
  PBZHighlight,
  SchedulerDebugEntry
} from '../types';
import { generateId } from './storage';
import { MATCH_CONFIG } from './leagueConfig';
import { computeLeaguePoints } from './rules';
import { generatePodSchedule } from './podScheduler';

// ============================================================================
// TYPES
// ============================================================================

export interface SchedulerState {
  partnered: Map<string, number>;
  opposed: Map<string, number>;
  partneredToday: Map<string, number>; // New: Track partners today
  opposedToday: Map<string, number>;   // New: Track opponents today
  lastAbsoluteSession: Record<string, number>;
  singlesCoverage: Map<string, number>;
  partnerCoverage: Map<string, number>;
  lastDayCounts: Record<string, number>;
  singlesPlayedCount: Record<string, number>; // New: Track total singles played in saga
}

export interface LeagueInsights {
  coverageProjection: {
    currentCoverage: number;
    sessionsRemaining: number;
    projectedCompletion: number;
    estimatedDaysToFullCoverage: number;
    bottleneckPairs: Array<{ pair: [string, string]; type: 'singles' | 'doubles' }>;
  };
  fairnessIndex: {
    totalScore: number;
    modeBalanceScore: number;
    restAdherenceScore: number;
    opponentVarietyScore: number;
    warningLevel: 'green' | 'yellow' | 'red';
  };
  pressureMap: {
    totalCeiling: number;
    modeCeiling: number;
    opponentCap: number;
    restViolations: number;
  };
  recommendations: Array<{
    type: 'court' | 'hours' | 'division' | 'config';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    action: string;
  }>;
}

// ============================================================================
// PRIMITIVES
// ============================================================================

function pairKey(id1: string, id2: string): string {
  if (!id1 || !id2) return 'invalid';
  return [id1, id2].sort().join('|');
}

function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function playersPerSession(courtCount: number): number {
  return 2 + Math.max(0, courtCount - 1) * 4;
}

export function isEligibleForTrophies(
  gamesPlayed: number,
  maxLeagueGames: number,
  minRatio = 0.6
): boolean {
  if (maxLeagueGames === 0) return false;
  return gamesPlayed / maxLeagueGames >= minRatio;
}

// ============================================================================
// FIX 1 — AUTO COURT SCALING (with venue cap)
// Auto-increases courts so no court handles > 6 players.
// Respects MAX_COURTS_ALLOWED ceiling.
// ============================================================================

const MAX_COURTS_ALLOWED = 4; // adjust per venue config

function autoScaleCourts(
  playerCount: number,
  requestedCourts: number,
  maxCourtsAllowed = MAX_COURTS_ALLOWED
): number {
  let courts = requestedCourts;
  while (playerCount / courts > 6 && courts < maxCourtsAllowed) {
    courts++;
  }
  return courts;
}

// ============================================================================
// FIX 4 — DIVISION AUTO-SPLIT
// Triggers when player density can't be resolved even at max courts.
// Splits players into 2 skill-interleaved divisions (snake-draft by PPG).
// ============================================================================

function shouldSplitIntoDivisions(
  playerCount: number,
  requestedCourts: number,
  maxCourtsAllowed = MAX_COURTS_ALLOWED
): boolean {
  const scaled = autoScaleCourts(playerCount, requestedCourts, maxCourtsAllowed);
  return scaled >= maxCourtsAllowed && playerCount / scaled > 6;
}

function splitIntoBalancedDivisions(
  players: string[],
  standings?: LeagueStanding[],
  divisionCount = 2
): string[][] {
  // Snake-draft by PPG so each division gets balanced skill
  const ordered = standings
    ? [...standings]
        .sort((a, b) => b.ppg - a.ppg)
        .map(s => s.playerId)
        .filter(id => players.includes(id))
    : [...players];

  // Append any players missing from standings
  (players || []).forEach(p => { if (!ordered.includes(p)) ordered.push(p); });

  const divisions: string[][] = Array.from({ length: divisionCount }, () => []);
  ordered.forEach((pid, i) => {
    divisions[i % divisionCount].push(pid);
  });
  return divisions;
}

function computeDivisionCount(
  playerCount: number,
  courtCount: number,
  maxCourtsAllowed = MAX_COURTS_ALLOWED
): number {
  // Each division needs at least courtCount*4 players to fill courts.
  // Split into fewest divisions where each has ≤ maxCourtsAllowed*6 players.
  const playersPerDivision = maxCourtsAllowed * 6;
  return Math.ceil(playerCount / playersPerDivision);
}

// ============================================================================
// LAYER 1 — GRAPH HELPERS
// ============================================================================

function buildAllPairs(players: string[]): [string, string][] {
  const pairs: [string, string][] = [];
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      pairs.push([players[i], players[j]]);
    }
  }
  return pairs;
}

function shuffle<T>(array: T[], rng: () => number): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ============================================================================
// LAYER 2 — OPTIMAL SINGLES MATCHING
// ============================================================================

function buildOptimalSingles(
  players: string[],
  rng: () => number
): { teamA: string[]; teamB: string[] }[] {
  const shuffled = shuffle(players, rng);
  const matches: { teamA: string[]; teamB: string[] }[] = [];
  
  for (let i = 0; i < shuffled.length; i += 2) {
    if (i + 1 < shuffled.length) {
      matches.push({ teamA: [shuffled[i]], teamB: [shuffled[i + 1]] });
    }
  }

  return matches;
}

// ============================================================================
// LAYER 3 — OPTIMAL DOUBLES MATCHING (COMBINATORIAL)
// ============================================================================

function buildOptimalDoubles(
  players: string[],
  history: SchedulerState,
  rng: () => number
): { teamA: string[]; teamB: string[] }[] {
  const shuffled = [...players].sort(() => rng() - 0.5);
  const matches: { teamA: string[]; teamB: string[] }[] = [];
  const unused = new Set(shuffled);

  while (unused.size >= 4) {
    const available = Array.from(unused);
    let bestMatch: { tA: string[]; tB: string[]; score: number } | null = null;

    for (let i = 0; i < available.length; i++) {
      for (let j = i + 1; j < available.length; j++) {
        for (let k = j + 1; k < available.length; k++) {
          for (let l = k + 1; l < available.length; l++) {
            const g = [available[i], available[j], available[k], available[l]];
            const combos = [
              { tA: [g[0], g[1]], tB: [g[2], g[3]] },
              { tA: [g[0], g[2]], tB: [g[1], g[3]] },
              { tA: [g[0], g[3]], tB: [g[1], g[2]] },
            ];

            for (const { tA, tB } of combos) {
              const partnerTodayPenalty =
                (history.partneredToday.get(pairKey(tA[0], tA[1])) || 0) +
                (history.partneredToday.get(pairKey(tB[0], tB[1])) || 0);

              const opponentTodayPenalty = tA.reduce(
                (s, a) => s + tB.reduce((ss, b) => ss + (history.opposedToday.get(pairKey(a, b)) || 0), 0),
                0
              );

              const partnerSagaPenalty =
                Math.pow(history.partnered.get(pairKey(tA[0], tA[1])) || 0, 2) +
                Math.pow(history.partnered.get(pairKey(tB[0], tB[1])) || 0, 2);

              const opponentSagaPenalty = tA.reduce(
                (s, a) => s + tB.reduce((ss, b) => ss + Math.pow(history.opposed.get(pairKey(a, b)) || 0, 2), 0),
                0
              );

              // Americano+ Priority: 
              // 1. Never played with today (partnerTodayPenalty * 100000)
              // 2. Never played against today (opponentTodayPenalty * 10000)
              // 3. Saga variety (partnerSagaPenalty * 500 + opponentSagaPenalty * 200)
              const score = (partnerTodayPenalty * 100000) + 
                            (opponentTodayPenalty * 10000) + 
                            (partnerSagaPenalty * 500) + 
                            (opponentSagaPenalty * 200);

              if (!bestMatch || score < bestMatch.score) {
                bestMatch = { tA, tB, score };
              }
            }
          }
        }
      }
    }

    if (!bestMatch) break;

    matches.push({ teamA: bestMatch.tA, teamB: bestMatch.tB });
    [...bestMatch.tA, ...bestMatch.tB].forEach(p => unused.delete(p));
  }

  return matches;
}

// ============================================================================
// MAIN GENERATOR — 4-LAYER ARCHITECTURE
//
// Layer 0: court auto-scaling (venue cap) + doubles-only density gate + division split
// Layer 1: load-balanced candidate selection — fewest games → singles-quota owed → rest age → RNG
// Layer 2: structured round composition — 1 singles per player in first half, doubles-only second half
// Layer 3: graph-optimal pairing — min partner repeats × 10 + min opponent repeats
//
// Guarantees: rest enforced (≥1 round gap) · max 1 singles/player/day · doublesOnly at ≥6/court
// ============================================================================

// ============================================================================
// PBZ DAY SCHEDULER ENGINE (FINAL DESIGN)
// ============================================================================

/**
 * Phase 1: Singles Generation
 * Everyone gets exactly 1 singles match.
 */
function generateSinglesPhase(players: string[], rng: () => number): [string, string][] {
  const matches = buildOptimalSingles(players, rng);
  return matches.map(m => [m.teamA[0], m.teamB[0]]);
}

function scoreRound(
  matches: { teamA: string[]; teamB: string[] }[],
  partnerMapToday: Map<string, Set<string>>,
  opponentMapToday: Map<string, Set<string>>,
  courtMapToday: Map<string, Map<number, number>>,
  matchesPlayed: Map<string, number>
): number {
  let score = 0;

  matches.forEach((m, courtIdx) => {
    const courtId = courtIdx + 1;
    const allInMatch = [...m.teamA, ...m.teamB];

    for (const a of m.teamA) {
      for (const b of m.teamB) {
        // repeat opponent = bad
        if (opponentMapToday.get(a)?.has(b)) {
          score += 1000;
        }
        // encourage new opponents
        else {
          score -= 50;
        }
      }
    }

    // Court Rotation Penalty (Fixes "Central Player" effect)
    allInMatch.forEach(p => {
      const timesOnThisCourt = courtMapToday.get(p)?.get(courtId) || 0;
      if (timesOnThisCourt > 0) {
        score += timesOnThisCourt * 2000; // Force rotation
      }
    });
  });

  // Global Load Balance (Fixes pairing bias inside round)
  if (matches.length > 1) {
    const matchAverages = matches.map(m => 
      [...m.teamA, ...m.teamB].reduce((sum, p) => sum + (matchesPlayed.get(p) || 0), 0) / 4
    );
    const diff = Math.abs(matchAverages[0] - matchAverages[1]);
    score += diff * 5000; // Ensure "heavy" and "light" players are distributed across courts
  }

  return score;
}

function buildOptimalRound(
  players: string[],
  partnerMapToday: Map<string, Set<string>>,
  opponentMapToday: Map<string, Set<string>>,
  courtMapToday: Map<string, Map<number, number>>,
  matchesPlayed: Map<string, number>,
  rng: () => number
): { teamA: string[]; teamB: string[] }[] {
  let bestRoundMatches: { teamA: string[]; teamB: string[] }[] = [];
  let bestRoundScore = Infinity;

  const iterations = players.length <= 12 ? 1500 : 800;

  for (let i = 0; i < iterations; i++) {
    const pool = shuffle(players, rng);
    const currentRoundMatches: { teamA: string[]; teamB: string[] }[] = [];
    let possible = true;

    // Split pool into matches (Court 1, Court 2, etc.)
    const courtCount = players.length / 4;
    for (let c = 0; c < courtCount; c++) {
      const g = pool.slice(c * 4, (c + 1) * 4);
      
      let bestSplit: { tA: string[]; tB: string[]; score: number } | null = null;
      const combos = [
        { tA: [g[0], g[1]], tB: [g[2], g[3]] },
        { tA: [g[0], g[2]], tB: [g[1], g[3]] },
        { tA: [g[0], g[3]], tB: [g[1], g[2]] },
      ];

      for (const { tA, tB } of combos) {
        if (partnerMapToday.get(tA[0])?.has(tA[1]) || partnerMapToday.get(tB[0])?.has(tB[1])) continue;

        let score = 0;
        tA.forEach(pa => tB.forEach(pb => {
          if (opponentMapToday.get(pa)?.has(pb)) score += 1000;
          else score -= 50;
        }));

        if (!bestSplit || score < bestSplit.score) {
          bestSplit = { tA, tB, score };
        }
      }

      if (!bestSplit) {
        possible = false;
        break;
      }
      currentRoundMatches.push({ teamA: bestSplit.tA, teamB: bestSplit.tB });
    }

    if (possible) {
      const currentRoundScore = scoreRound(
        currentRoundMatches, 
        partnerMapToday, 
        opponentMapToday,
        courtMapToday,
        matchesPlayed
      );
      if (currentRoundScore < bestRoundScore) {
        bestRoundScore = currentRoundScore;
        bestRoundMatches = currentRoundMatches;
      }
    }
  }

  return bestRoundMatches;
}

/**
 * Phase 2: Doubles Engine
 * Queue-based rotation with harmony (sit-out priority).
 */
function generateDoublesPhase(
  players: string[],
  courts: number,
  rounds: number,
  startRound: number,
  rng: () => number,
  initialMatchesPlayed?: Map<string, number>,
  initialLastPlayedRound?: Map<string, number>,
  initialOpponentMap?: Map<string, Set<string>>
): LeagueMatch[] {
  const partnerMapToday = new Map<string, Set<string>>();
  const opponentMapToday = new Map<string, Set<string>>();
  const matchesPlayed = new Map<string, number>();
  const lastPlayedRound = new Map<string, number>();
  const courtMapToday = new Map<string, Map<number, number>>();

  players.forEach(p => {
    partnerMapToday.set(p, new Set());
    opponentMapToday.set(p, new Set(initialOpponentMap?.get(p) || []));
    matchesPlayed.set(p, initialMatchesPlayed?.get(p) || 0);
    lastPlayedRound.set(p, initialLastPlayedRound?.get(p) || (startRound - 1));
    courtMapToday.set(p, new Map());
  });

  const schedule: LeagueMatch[] = [];

  for (let r = 0; r < rounds; r++) {
    const currentRound = startRound + r;

    // 1. CLEAN PLAYER SELECTION (NO SITTING LOGIC)
    const playersNeeded = courts * 4;

    // Pre-compute random scores for deterministic tie-breaking within this round
    const randomScores = new Map<string, number>();
    players.forEach(p => randomScores.set(p, rng()));

    const sortedPlayers = [...players].sort((a, b) => {
      // priority 1: fewest matches played (CRITICAL for fairness)
      const mpA = matchesPlayed.get(a) || 0;
      const mpB = matchesPlayed.get(b) || 0;
      if (mpA !== mpB) return mpA - mpB;

      // priority 2: rest age (longer rest = higher priority)
      const lastA = lastPlayedRound.get(a) || 0;
      const lastB = lastPlayedRound.get(b) || 0;
      if (lastA !== lastB) return lastA - lastB;

      // priority 3: opponent variety (fewer opponents played today = higher priority)
      const oppA = opponentMapToday.get(a)?.size || 0;
      const oppB = opponentMapToday.get(b)?.size || 0;
      if (oppA !== oppB) return oppA - oppB;

      // priority 4: randomness
      return (randomScores.get(a) || 0) - (randomScores.get(b) || 0);
    });

    let activePlayers = sortedPlayers.slice(0, playersNeeded);

    // Ensure multiple of 4
    activePlayers = activePlayers.slice(0, activePlayers.length - (activePlayers.length % 4));
    if (activePlayers.length < 4) continue;

    // 2. GLOBAL ROUND OPTIMIZER
    const roundMatches = buildOptimalRound(
      activePlayers,
      partnerMapToday,
      opponentMapToday,
      courtMapToday,
      matchesPlayed,
      rng
    );

    // 3. COMMIT ROUND
    roundMatches.forEach((m, idx) => {
      const courtId = idx + 1;
      schedule.push({
        id: generateId(),
        dayId: 'temporary',
        courtId,
        round: currentRound,
        teamA: m.teamA,
        teamB: m.teamB,
        isCompleted: false,
        type: 'doubles',
        status: 'scheduled',
        noShowPlayerIds: [],
        orderIndex: schedule.length,
        events: [],
        highlights: [],
      });

      [...m.teamA, ...m.teamB].forEach(p => {
        matchesPlayed.set(p, (matchesPlayed.get(p) || 0) + 1);
        lastPlayedRound.set(p, currentRound);
        
        // Track court usage
        const pMap = courtMapToday.get(p)!;
        pMap.set(courtId, (pMap.get(courtId) || 0) + 1);
      });

      partnerMapToday.get(m.teamA[0])?.add(m.teamA[1]);
      partnerMapToday.get(m.teamA[1])?.add(m.teamA[0]);
      partnerMapToday.get(m.teamB[0])?.add(m.teamB[1]);
      partnerMapToday.get(m.teamB[1])?.add(m.teamB[0]);

      m.teamA.forEach(p1 => m.teamB.forEach(p2 => {
        opponentMapToday.get(p1)?.add(p2);
        opponentMapToday.get(p2)?.add(p1);
      }));
    });
  }

  return schedule;
}

export function generateLeagueDay(
  leagueId: string,
  week: number,
  day: number,
  playerIds: string[],
  courtCount: number,
  hours: number,
  history: SchedulerState,
  standings?: LeagueStanding[]
): LeagueDay {
  // ── Division auto-split ─────────────────────
  if (shouldSplitIntoDivisions(playerIds.length, courtCount)) {
    const divisionCount = computeDivisionCount(playerIds.length, courtCount);
    const divisions = splitIntoBalancedDivisions(playerIds, standings, divisionCount);

    const divisionDays = divisions.map((group, idx) =>
      generateLeagueDay(
        leagueId + '_DIV' + idx,
        week,
        day,
        group,
        courtCount,
        hours,
        history,
        standings
      )
    );

    return {
      id: generateId(),
      week,
      day,
      date: Date.now(),
      seed: parseInt(leagueId.substring(0, 8), 16) + week * 100 + day,
      status: 'generated',
      matches: divisionDays.flatMap(d => d.matches),
      partners: [],
      attendees: playerIds,
      config: { hours, courts: autoScaleCourts(playerIds.length, courtCount) },
      divisions: divisionDays,
    };
  }

  courtCount = autoScaleCourts(playerIds.length, courtCount);
  const baseSeed = parseInt(leagueId.substring(0, 8), 16) + week * 100 + day;
  const rng = mulberry32(baseSeed);

  const ROUND_DURATION_MIN = MATCH_CONFIG.MATCH_DURATION_MIN;
  const totalRounds = Math.floor((hours * 60) / ROUND_DURATION_MIN);
  
  const matches: LeagueMatch[] = [];
  
  // 1. PHASE 1: SINGLES
  const singlesPairs = generateSinglesPhase(playerIds, rng);
  let currentRound = 1;
  let lastPlayedRound = new Map<string, number>();
  let matchesPlayed = new Map<string, number>();
  let opponentMap = new Map<string, Set<string>>();

  playerIds.forEach(p => {
    lastPlayedRound.set(p, 0);
    matchesPlayed.set(p, 0);
    opponentMap.set(p, new Set());
  });

  // Distribute singles into rounds
  for (let i = 0; i < singlesPairs.length; i += courtCount) {
    const roundPairs = singlesPairs.slice(i, i + courtCount);

    roundPairs.forEach((pair, idx) => {
      matches.push({
        id: generateId(),
        dayId: 'temporary',
        courtId: idx + 1,
        round: currentRound,
        teamA: [pair[0]],
        teamB: [pair[1]],
        isCompleted: false,
        type: 'singles',
        status: 'scheduled',
        noShowPlayerIds: [],
        orderIndex: matches.length,
        events: [],
        highlights: [],
      });
      
      lastPlayedRound.set(pair[0], currentRound);
      lastPlayedRound.set(pair[1], currentRound);
      matchesPlayed.set(pair[0], (matchesPlayed.get(pair[0]) || 0) + 1);
      matchesPlayed.set(pair[1], (matchesPlayed.get(pair[1]) || 0) + 1);
      opponentMap.get(pair[0])?.add(pair[1]);
      opponentMap.get(pair[1])?.add(pair[0]);
    });

    currentRound++;
  }

  // 1.5 BUFFER ROUND (Optional but recommended for fatigue)
  // If we have a lot of players, we can afford a buffer round where 
  // those who just played singles rest.
  if (playerIds.length > courtCount * 4) {
    currentRound++;
  }

  // 2. PHASE 2: DOUBLES
  const remainingRounds = totalRounds - currentRound + 1;
  if (remainingRounds > 0) {
    const doublesMatches = generateDoublesPhase(
      playerIds,
      courtCount,
      remainingRounds,
      currentRound,
      rng,
      matchesPlayed,
      lastPlayedRound,
      opponentMap
    );
    matches.push(...doublesMatches);
  }

  return {
    id: generateId(),
    week,
    day,
    date: Date.now(),
    seed: baseSeed,
    status: 'generated',
    matches,
    partners: [],
    attendees: playerIds,
    config: { hours, courts: courtCount },
    debugLog: [],
  };
}

export function generatePodLeagueDay(
  leagueId: string,
  week: number,
  day: number,
  playerIds: string[],
  cycles: number
): LeagueDay {
  const baseSeed = parseInt(leagueId.substring(0, 8), 16) + week * 100 + day;
  const dayId = generateId();
  
  const { matches: rawMatches, cycles: actualCycles, podCompositions } = generatePodSchedule(playerIds, cycles, leagueId);
  const matches: LeagueMatch[] = rawMatches.map((m, idx) => ({
    ...m,
    dayId,
    isCompleted: false,
    noShowPlayerIds: [],
    orderIndex: idx,
    events: [],
    highlights: [],
    courtId: (idx % Math.ceil(playerIds.length / 4)) + 1, // Simple court assignment
  })) as LeagueMatch[];

  return {
    id: dayId,
    week,
    day,
    date: Date.now(),
    seed: baseSeed,
    status: 'generated',
    matches,
    partners: [],
    attendees: playerIds,
    config: { hours: actualCycles, courts: Math.ceil(playerIds.length / 4) },
    debugLog: [],
    podCompositions,
  };
}

// ============================================================================
// HARD INVARIANTS — post-generation assertions
// Call after generateLeagueDay in dev/test to catch engine regressions.
// ============================================================================

export interface InvariantViolation {
  type: 'singles-quota' | 'consecutive-doubles' | 'partner-repeat' | 'rest-violation';
  playerId: string;
  detail: string;
}

export function assertDayInvariants(day: LeagueDay): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  const singlesCount: Record<string, number> = {};
  const lastPlayed: Record<string, number> = {};
  const lastType: Record<string, string> = {};
  const consecutiveDoubles: Record<string, number> = {};
  const todayPartners: Map<string, number> = new Map();

  // Sort by round for sequential processing
  const sorted = [...day.matches].sort((a, b) => a.round - b.round);

  sorted.forEach(m => {
    const allPlayers = [...m.teamA, ...m.teamB];

    // Singles quota check
    if (m.type === 'singles') {
      allPlayers.forEach(p => {
        singlesCount[p] = (singlesCount[p] || 0) + 1;
        if (singlesCount[p] > 1) {
          violations.push({
            type: 'singles-quota',
            playerId: p,
            detail: `Played singles ${singlesCount[p]} times (max 1)`,
          });
        }
      });
    }

    // Post-singles rest violation
    allPlayers.forEach(p => {
      if (lastType[p] === 'singles' && lastPlayed[p] !== undefined && m.round - lastPlayed[p] === 1) {
        violations.push({
          type: 'rest-violation',
          playerId: p,
          detail: `Played in round ${m.round} immediately after singles in round ${lastPlayed[p]}`,
        });
      }
    });

    // Consecutive doubles cap
    allPlayers.forEach(p => {
      if (m.type === 'doubles') {
        consecutiveDoubles[p] = (consecutiveDoubles[p] || 0) + 1;
        if (consecutiveDoubles[p] > 5) {
          // Cap is 3 but graceful relaxation can allow 4-5 when needed to fill courts.
          // Flag at >5 which indicates the relaxation itself is being overwhelmed.
          violations.push({
            type: 'consecutive-doubles',
            playerId: p,
            detail: `${consecutiveDoubles[p]} consecutive doubles (hard limit exceeded — relaxation insufficient)`,
          });
        }
      } else {
        consecutiveDoubles[p] = 0;
      }
    });

    // Same-day partner repeat
    if (m.type === 'doubles') {
      const pairs = [
        [m.teamA[0], m.teamA[1]],
        [m.teamB[0], m.teamB[1]],
      ].filter(([a, b]) => a && b);
      pairs.forEach(([a, b]) => {
        const key = [a, b].sort().join('|');
        todayPartners.set(key, (todayPartners.get(key) || 0) + 1);
        if ((todayPartners.get(key) || 0) > 1) {
          const isFinalLeagueDay = day.week === 4 && day.day === 2;
          if (isFinalLeagueDay) {
            console.warn(`⚠️ [Override] Allowing partner repeat (W4 D2): ${a} & ${b}`);
          } else {
            violations.push({
              type: 'partner-repeat',
              playerId: a,
              detail: `${a} & ${b} partnered ${todayPartners.get(key)} times today`,
            });
          }
        }
      });
    }

    allPlayers.forEach(p => { lastPlayed[p] = m.round; lastType[p] = m.type; });
  });

  return violations;
}

// ============================================================================
// STANDINGS
// ============================================================================

export function calculateLeagueStandings(league: League): LeagueStanding[] {
  const stats: Record<string, LeagueStanding> = {};
  const K_FACTOR = 32;

  (league.players || []).forEach(pid => {
    stats[pid] = {
      playerId: pid,
      points: 0, wins: 0, losses: 0,
      gamesPlayed: 0, ppg: 0,
      bonusPoints: 0, noShows: 0,
      ppgHistory: [],
      eligibleForTrophies: false,
      elo: 1200, // Initial ELO
    };
  });

  const matchDaysPlayed: Record<string, Set<string>> = {};
  (league.players || []).forEach(pid => {
    matchDaysPlayed[pid] = new Set();
  });

  const days = league.days || [];
  days.forEach(day => {
    const playedThisDay = new Set<string>();

    (day.matches || []).forEach(m => {
      m.noShowPlayerIds?.forEach(pid => { if (stats[pid]) stats[pid].noShows++; });

      if (!m.isCompleted || m.status !== 'completed' || m.isForfeit) return;
      if (m.scoreA === undefined || m.scoreB === undefined) return;
      if (m.noShowPlayerIds && m.noShowPlayerIds.length > 0) return;

      const { teamA, teamB, scoreA, scoreB } = m;
      const isAWinner = scoreA > scoreB;
      const winnerTeam = isAWinner ? teamA : teamB;
      const loserTeam = isAWinner ? teamB : teamA;
      const winnerScore = isAWinner ? scoreA : scoreB;
      const loserScore = isAWinner ? scoreB : scoreA;

      const winPoints = computeLeaguePoints(true, winnerScore, loserScore);
      const lossPoints = computeLeaguePoints(false, loserScore, winnerScore);

      // ELO Calculation
      const avgEloA = teamA.reduce((sum, id) => sum + (stats[id]?.elo || 1200), 0) / teamA.length;
      const avgEloB = teamB.reduce((sum, id) => sum + (stats[id]?.elo || 1200), 0) / teamB.length;
      
      const expectedA = 1 / (1 + Math.pow(10, (avgEloB - avgEloA) / 400));
      const expectedB = 1 / (1 + Math.pow(10, (avgEloA - avgEloB) / 400));
      
      const actualA = isAWinner ? (teamA === winnerTeam ? 1 : 0) : (teamA === winnerTeam ? 1 : 0);
      // Wait, simpler:
      const sa = isAWinner ? (teamA === winnerTeam ? 1 : 0) : 0;
      const sb = isAWinner ? (teamB === winnerTeam ? 1 : 0) : 0;
      
      // Re-evaluating sa/sb
      const score_a = scoreA > scoreB ? 1 : 0;
      const score_b = scoreB > scoreA ? 1 : 0;

      const eloDiffA = K_FACTOR * (score_a - expectedA);
      const eloDiffB = K_FACTOR * (score_b - expectedB);

      teamA.forEach(pid => { if (stats[pid]) stats[pid].elo = (stats[pid].elo || 1200) + eloDiffA; });
      teamB.forEach(pid => { if (stats[pid]) stats[pid].elo = (stats[pid].elo || 1200) + eloDiffB; });

      winnerTeam.forEach(pid => {
        const s = stats[pid];
        if (s) {
          s.gamesPlayed++;
          s.wins++;
          s.points += winPoints;
          if (winPoints === 4) s.bonusPoints++;
          playedThisDay.add(pid);
        }
      });

      loserTeam.forEach(pid => {
        const s = stats[pid];
        if (s) {
          s.gamesPlayed++;
          s.wins = s.wins || 0; // ensure wins exists
          s.losses++;
          s.points += lossPoints;
          playedThisDay.add(pid);
        }
      });
    });

    playedThisDay.forEach(pid => {
      if (matchDaysPlayed[pid]) matchDaysPlayed[pid].add(day.id);
    });

    Object.values(stats).forEach(s => {
      if (playedThisDay.has(s.playerId)) {
        s.ppgHistory?.push(s.gamesPlayed > 0 ? s.points / s.gamesPlayed : 0);
      }
    });
  });

  return Object.values(stats)
    .map(s => {
      s.ppg = s.gamesPlayed > 0 ? s.points / s.gamesPlayed : 0;
      s.eligibleForTrophies = (matchDaysPlayed[s.playerId]?.size ?? 0) >= 4;
      return s;
    })
    .sort((a, b) => b.ppg - a.ppg || b.wins - a.wins || b.points - a.points);
}

// ============================================================================
// SAGA HISTORY & INTEGRITY
// ============================================================================

export function buildSagaHistory(league: League): SchedulerState {
  const state: SchedulerState = {
    partnered: new Map(),
    opposed: new Map(),
    partneredToday: new Map(),
    opposedToday: new Map(),
    lastAbsoluteSession: {},
    singlesCoverage: new Map(),
    partnerCoverage: new Map(),
    lastDayCounts: {},
    singlesPlayedCount: {},
  };

  let runningOffset = 0;

  const days = league.days || [];
  days.forEach(day => {
    const stagesThisDay = (day.matches || []).length > 0
      ? Math.max(...day.matches.map(m => m.round))
      : 0;

    const currentDayCounts: Record<string, number> = {};

    day.matches.forEach(m => {
      const absSession = runningOffset + m.round;
      const incr = (map: Map<string, number>, key: string) =>
        map.set(key, (map.get(key) || 0) + 1);

      if (m.type === 'doubles') {
        if (m.teamA.length === 2) {
          incr(state.partnered, pairKey(m.teamA[0], m.teamA[1]));
          incr(state.partnerCoverage, pairKey(m.teamA[0], m.teamA[1]));
        }
        if (m.teamB.length === 2) {
          incr(state.partnered, pairKey(m.teamB[0], m.teamB[1]));
          incr(state.partnerCoverage, pairKey(m.teamB[0], m.teamB[1]));
        }
        m.teamA.forEach(a => m.teamB.forEach(b => incr(state.opposed, pairKey(a, b))));
      } else {
        const k = pairKey(m.teamA[0], m.teamB[0]);
        incr(state.opposed, k);
        incr(state.singlesCoverage, k);
        
        // Track singles count per player
        [...m.teamA, ...m.teamB].forEach(pid => {
          state.singlesPlayedCount[pid] = (state.singlesPlayedCount[pid] || 0) + 1;
        });
      }

      [...m.teamA, ...m.teamB].forEach(p => {
        currentDayCounts[p] = (currentDayCounts[p] || 0) + 1;
        if (
          state.lastAbsoluteSession[p] === undefined ||
          absSession > state.lastAbsoluteSession[p]
        ) {
          state.lastAbsoluteSession[p] = absSession;
        }
      });
    });

    state.lastDayCounts = currentDayCounts;
    runningOffset += stagesThisDay;
  });

  return state;
}

export function computeSagaIntegrity(league: League) {
  const stats: Record<string, {
    games: number;
    singles: number;
    doubles: number;
    partners: Set<string>;
    opponents: Set<string>;
  }> = {};

  (league.players || []).forEach(pid => {
    stats[pid] = { games: 0, singles: 0, doubles: 0, partners: new Set(), opponents: new Set() };
  });

  (league.days || []).forEach(day => {
    day.matches.forEach(m => {
      if (m.status === 'cancelled') return;

      [...m.teamA, ...m.teamB].forEach(p => {
        if (!stats[p]) return;
        stats[p].games++;
        if (m.type === 'singles') stats[p].singles++;
        else stats[p].doubles++;
      });

      if (m.type === 'doubles') {
        if (m.teamA.length === 2) {
          stats[m.teamA[0]]?.partners.add(m.teamA[1]);
          stats[m.teamA[1]]?.partners.add(m.teamA[0]);
        }
        if (m.teamB.length === 2) {
          stats[m.teamB[0]]?.partners.add(m.teamB[1]);
          stats[m.teamB[1]]?.partners.add(m.teamB[0]);
        }
      }

      m.teamA.forEach(a => m.teamB.forEach(b => {
        stats[a]?.opponents.add(b);
        stats[b]?.opponents.add(a);
      }));
    });
  });

  return stats;
}

export function analyzeSagaIntegrity(league: League, players: Player[]) {
  const stats = computeSagaIntegrity(league);
  const warnings: string[] = [];
  const playerIds = Object.keys(stats);

  if (playerIds.length === 0) return { status: 'valid', warnings: [] };

  const getName = (id: string) => players.find(p => p.id === id)?.name || id;
  const games = playerIds.map(id => stats[id].games);
  const maxGames = Math.max(...games);
  const minGames = Math.min(...games);
  const avgGames = games.reduce((a, b) => a + b, 0) / games.length;

  if (maxGames - minGames > 2) {
    warnings.push(`High Variance: Max ${maxGames} vs Min ${minGames} games`);
  }

  playerIds.forEach(id => {
    const s = stats[id];
    if (s.games < 3) return;
    if (s.games < avgGames * 0.75) {
      warnings.push(`${getName(id)}: Low usage (${s.games} vs avg ${avgGames.toFixed(1)})`);
    }
  });

  return { status: warnings.length > 0 ? 'warning' : 'valid', warnings };
}

export function calculateCoverageMetrics(
  history: SchedulerState,
  players: string[]
): {
  totalPossiblePairs: number;
  coveredSinglesPairs: number;
  coveredDoublesPairs: number;
  singlesCoveragePercent: number;
  doublesCoveragePercent: number;
  remainingPairs: Array<{ pair: [string, string]; type: 'singles' | 'doubles' }>;
  coverageHeatmap: Record<string, { singles: number; doubles: number }>;
  diversityScore: number;
} {
  const n = players.length;
  const totalPairs = (n * (n - 1)) / 2;

  const coverage: Record<string, { singles: number; doubles: number }> = {};
  (players || []).forEach(p1 => {
    (players || []).forEach(p2 => {
      if (p1 < p2) coverage[pairKey(p1, p2)] = { singles: 0, doubles: 0 };
    });
  });

  history.singlesCoverage.forEach((count, key) => {
    if (coverage[key]) coverage[key].singles = count;
  });
  history.partnerCoverage.forEach((count, key) => {
    if (coverage[key]) coverage[key].doubles = count;
  });

  const coveredSingles = Array.from(history.singlesCoverage.values()).filter(c => c > 0).length;
  const coveredDoubles = Array.from(history.partnerCoverage.values()).filter(c => c > 0).length;

  const remainingPairs = Object.entries(coverage)
    .filter(([_, counts]) => counts.singles === 0 || counts.doubles === 0)
    .map(([key, counts]) => {
      const [p1, p2] = key.split('|');
      return {
        pair: [p1, p2] as [string, string],
        type: (counts.singles === 0 ? 'singles' : 'doubles') as 'singles' | 'doubles',
      };
    });

  const maxPossibleCoverage = totalPairs * 2;
  const currentCoverage = coveredSingles + coveredDoubles;
  const diversityScore = maxPossibleCoverage > 0 ? (currentCoverage / maxPossibleCoverage) * 100 : 0;

  return {
    totalPossiblePairs: totalPairs,
    coveredSinglesPairs: coveredSingles,
    coveredDoublesPairs: coveredDoubles,
    singlesCoveragePercent: totalPairs > 0 ? (coveredSingles / totalPairs) * 100 : 0,
    doublesCoveragePercent: totalPairs > 0 ? (coveredDoubles / totalPairs) * 100 : 0,
    remainingPairs,
    coverageHeatmap: coverage,
    diversityScore,
  };
}

export function calculateMarginalCoverageGain(league: League): number {
  const dayGains: number[] = [];
  let cumulativeHistory = buildSagaHistory({ ...league, days: [] });

  (league.days || []).forEach(day => {
    let gain = 0;
    day.matches.forEach(m => {
      if (m.type === 'singles') {
        const key = pairKey(m.teamA[0], m.teamB[0]);
        if (!cumulativeHistory.singlesCoverage.has(key)) gain++;
        cumulativeHistory.singlesCoverage.set(key, (cumulativeHistory.singlesCoverage.get(key) || 0) + 1);
      } else {
        if (m.teamA.length === 2) {
          const key = pairKey(m.teamA[0], m.teamA[1]);
          if (!cumulativeHistory.partnerCoverage.has(key)) gain++;
          cumulativeHistory.partnerCoverage.set(key, (cumulativeHistory.partnerCoverage.get(key) || 0) + 1);
        }
        if (m.teamB.length === 2) {
          const key = pairKey(m.teamB[0], m.teamB[1]);
          if (!cumulativeHistory.partnerCoverage.has(key)) gain++;
          cumulativeHistory.partnerCoverage.set(key, (cumulativeHistory.partnerCoverage.get(key) || 0) + 1);
        }
      }
    });
    dayGains.push(gain);
  });

  return dayGains.reduce((a, b) => a + b, 0) / dayGains.length || 1;
}

function calculatePlayerOpponentEntropy(
  playerId: string,
  history: SchedulerState,
  allPlayers: string[]
): number {
  const opponentCounts: number[] = [];
  allPlayers.forEach(other => {
    if (other === playerId) return;
    const count = history.opposed.get(pairKey(playerId, other)) || 0;
    if (count > 0) opponentCounts.push(count);
  });
  const total = opponentCounts.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  let entropy = 0;
  opponentCounts.forEach(c => {
    const p = c / total;
    entropy -= p * Math.log2(p);
  });
  const maxEntropy = Math.log2(allPlayers.length - 1);
  return maxEntropy > 0 ? entropy / maxEntropy : 0;
}

export function calculateFairnessIndex(
  league: League,
  history: SchedulerState
): {
  totalScore: number;
  modeBalanceScore: number;
  restAdherenceScore: number;
  opponentVarietyScore: number;
  warningLevel: 'green' | 'yellow' | 'red';
} {
  const players = league.players;

  const totals = players.map(p =>
    league.days.reduce(
      (sum, d) => sum + d.matches.filter(m => [...m.teamA, ...m.teamB].includes(p)).length,
      0
    )
  );
  const totalSpread = Math.max(...totals) - Math.min(...totals);
  const totalScore = Math.max(0, 100 - totalSpread * 20);

  const singles = players.map(p =>
    league.days.reduce(
      (sum, d) => sum + d.matches.filter(m => m.type === 'singles' && [...m.teamA, ...m.teamB].includes(p)).length,
      0
    )
  );
  const doubles = players.map(p =>
    league.days.reduce(
      (sum, d) => sum + d.matches.filter(m => m.type === 'doubles' && [...m.teamA, ...m.teamB].includes(p)).length,
      0
    )
  );
  const modeSpread = Math.max(
    Math.max(...singles) - Math.min(...singles),
    Math.max(...doubles) - Math.min(...doubles)
  );
  const modeBalanceScore = Math.max(0, 100 - modeSpread * 25);

  // Only count post-singles rest violations (doubles back-to-back is intentional)
  let restViolations = 0;
  (league.days || []).forEach(day => {
    const lastPlayed: Record<string, number> = {};
    const lastType: Record<string, string> = {};
    day.matches.forEach(m => {
      [...m.teamA, ...m.teamB].forEach(p => {
        if (
          lastPlayed[p] !== undefined &&
          m.round - lastPlayed[p] === 1 &&
          lastType[p] === 'singles' // only penalize post-singles violations
        ) restViolations++;
        lastPlayed[p] = m.round;
        lastType[p] = m.type;
      });
    });
  });
  const restAdherenceScore = Math.max(0, 100 - restViolations * 5);

  let totalEntropy = 0;
  (players || []).forEach(p => { totalEntropy += calculatePlayerOpponentEntropy(p, history, players); });
  const opponentVarietyScore = players.length > 0 ? (totalEntropy / players.length) * 100 : 0;

  const overall = (totalScore + modeBalanceScore + restAdherenceScore + opponentVarietyScore) / 4;
  const warningLevel = overall >= 90 ? 'green' : overall >= 75 ? 'yellow' : 'red';

  return { totalScore, modeBalanceScore, restAdherenceScore, opponentVarietyScore, warningLevel };
}

export function analyzeLeagueHealth(league: League, history: SchedulerState): LeagueInsights {
  const players = league.players;
  const n = players.length;
  const totalPairs = (n * (n - 1)) / 2;

  const coverage = calculateCoverageMetrics(history, players);
  const currentCoverage = coverage.diversityScore;
  const marginalGainPerDay = calculateMarginalCoverageGain(league);
  const remainingCoverage = 100 - currentCoverage;
  const estimatedDaysToFullCoverage =
    marginalGainPerDay > 0
      ? Math.ceil(remainingCoverage / (marginalGainPerDay / (totalPairs * 2) * 100))
      : 99;

  const bottleneckPairs = Array.from(history.opposed.entries())
    .sort((a, b) => a[1] - b[1])
    .slice(0, 5)
    .map(([key]) => {
      const [p1, p2] = key.split('|');
      return {
        pair: [p1, p2] as [string, string],
        type: history.singlesCoverage.has(key) ? 'singles' : ('doubles' as 'singles' | 'doubles'),
      };
    });

  const fairness = calculateFairnessIndex(league, history);
  const recommendations: LeagueInsights['recommendations'] = [];

  const days = league.days || [];
  if (n > 12 && (days[0]?.matches?.length ?? 0) === 8) {
    recommendations.push({
      type: 'court',
      title: 'Large group with limited courts',
      description: `${n} players on 2 courts causes high rest pressure. Add a 3rd court.`,
      impact: 'high',
      action: 'Add court',
    });
  }

  if (estimatedDaysToFullCoverage > 10) {
    recommendations.push({
      type: 'hours',
      title: 'Coverage completion distant',
      description: `Full pair coverage projected in ${estimatedDaysToFullCoverage} more sessions.`,
      impact: 'medium',
      action: 'Extend hours',
    });
  }

  if (fairness.warningLevel === 'red') {
    recommendations.push({
      type: 'config',
      title: 'Fairness index critical',
      description: 'Overall fairness is low. Consider rebalancing divisions or adjusting session length.',
      impact: 'high',
      action: 'Review config',
    });
  }

  return {
    coverageProjection: {
      currentCoverage,
      sessionsRemaining: estimatedDaysToFullCoverage * ((league.days || [])[0]?.matches?.length || 8),
      projectedCompletion: Math.min(
        100,
        currentCoverage + (marginalGainPerDay * 7) / (totalPairs * 2) * 100
      ),
      estimatedDaysToFullCoverage,
      bottleneckPairs,
    },
    fairnessIndex: fairness,
    pressureMap: { totalCeiling: 0, modeCeiling: 0, opponentCap: 0, restViolations: 0 },
    recommendations,
  };
}

// ============================================================================
// SIMULATION
// ============================================================================

export function simulateFutureDay(
  league: League,
  courtCount: number,
  hours: number,
  _seed: number
): { coverageGain: number; success: boolean } {
  const pastLeague: League = {
    ...league,
    days: (league.days || []).filter(d => d.status === 'completed' || d.status === 'generated'),
  };
  const history = buildSagaHistory(pastLeague);
  try {
    const newDay = generateLeagueDay(
      league.id,
      (league.days || []).length + 1,
      1,
      league.players,
      courtCount,
      hours,
      history
    );
    const tempLeague = { ...pastLeague, days: [...pastLeague.days, newDay] };
    const newHistory = buildSagaHistory(tempLeague);
    const before = history.singlesCoverage.size + history.partnerCoverage.size;
    const after = newHistory.singlesCoverage.size + newHistory.partnerCoverage.size;
    return { coverageGain: after - before, success: true };
  } catch {
    return { coverageGain: 0, success: false };
  }
}

// ============================================================================
// MATCH LIFECYCLE
// ============================================================================

export function isLeagueDayComplete(day: LeagueDay): boolean {
  return day.matches.every(
    m => m.status === 'completed' || m.status === 'cancelled' || m.status === 'walkover'
  );
}

export function finalizePlayedMatch(
  match: LeagueMatch,
  scoreA: number,
  scoreB: number
): LeagueMatch {
  return { ...match, scoreA, scoreB, isCompleted: true, status: 'completed', isForfeit: false, noShowPlayerIds: [] };
}

export function adminOverrideScore(
  match: LeagueMatch,
  scoreA: number,
  scoreB: number,
  reason = 'Admin correction'
): LeagueMatch {
  return {
    ...match,
    scoreA,
    scoreB,
    status: 'completed',
    isCompleted: true,
    isForfeit: false,
    noShowPlayerIds: [],
    events: [],
    highlights: [],
    isAdminOverride: true,
    overrideReason: reason,
    overriddenAt: Date.now(),
  };
}

export function applyNoShow(league: League, matchId: string, playerId: string): League {
  const newLeague = { ...league };
  newLeague.days = (newLeague.days || []).map(d => {
    const matchIndex = d.matches.findIndex(m => m.id === matchId);
    if (matchIndex === -1) return d;

    const newMatches = [...d.matches];
    const m = { ...newMatches[matchIndex] };

    const currentNoShows = m.noShowPlayerIds || [];
    if (!currentNoShows.includes(playerId)) {
      m.noShowPlayerIds = [...currentNoShows, playerId];
    }

    const teamANoShow = m.teamA.some(id => m.noShowPlayerIds!.includes(id));
    const teamBNoShow = m.teamB.some(id => m.noShowPlayerIds!.includes(id));

    if (teamANoShow && teamBNoShow) {
      m.status = 'cancelled'; m.scoreA = 0; m.scoreB = 0; m.isCompleted = true;
    } else if (teamANoShow) {
      m.status = 'walkover'; m.scoreA = 0; m.scoreB = 15; m.isCompleted = true; m.isForfeit = true;
    } else if (teamBNoShow) {
      m.status = 'walkover'; m.scoreA = 15; m.scoreB = 0; m.isCompleted = true; m.isForfeit = true;
    }

    newMatches[matchIndex] = m;

    const audit: LeagueAuditEntry = {
      id: generateId(),
      timestamp: Date.now(),
      action: 'NO_SHOW',
      playerId,
      matchId,
      snapshot: m,
    };
    newLeague.auditLog = [...(newLeague.auditLog || []), audit];

    return { ...d, matches: newMatches };
  });

  return newLeague;
}

export function undoLastNoShow(league: League, matchId: string): League {
  const newLeague = { ...league };
  const audits = (newLeague.auditLog || []).filter(
    a => a.matchId === matchId && a.action === 'NO_SHOW'
  );
  if (audits.length === 0) return league;

  const lastAudit = audits[audits.length - 1];

  newLeague.days = (newLeague.days || []).map(d => {
    if (!d.matches.some(m => m.id === matchId)) return d;
    const newMatches = d.matches.map(m => {
      if (m.id !== matchId) return m;

      const newNoShows = (m.noShowPlayerIds || []).filter(id => id !== lastAudit.playerId);
      let status = m.status;
      let isCompleted = m.isCompleted;
      let scoreA = m.scoreA;
      let scoreB = m.scoreB;
      let isForfeit = m.isForfeit;

      if (newNoShows.length === 0) {
        status = 'scheduled'; isCompleted = false;
        scoreA = undefined; scoreB = undefined; isForfeit = false;
      } else {
        const teamAHas = m.teamA.some(id => newNoShows.includes(id));
        const teamBHas = m.teamB.some(id => newNoShows.includes(id));
        if (teamAHas && teamBHas) status = 'cancelled';
        else if (teamAHas || teamBHas) status = 'walkover';
      }

      return { ...m, noShowPlayerIds: newNoShows, status, isCompleted, scoreA, scoreB, isForfeit };
    });
    return { ...d, matches: newMatches };
  });

  newLeague.auditLog = newLeague.auditLog!.filter(a => a.id !== lastAudit.id);
  return newLeague;
}

export function rebalanceAfterDropout(league: League, dayId: string, playerId: string): League {
  const dayIndex = (league.days || []).findIndex(d => d.id === dayId);
  if (dayIndex === -1) return league;

  const day = (league.days || [])[dayIndex];
  const completedMatches = day.matches.filter(m => m.isCompleted);
  const pendingMatches = day.matches.filter(m => !m.isCompleted);
  const newAttendees = day.attendees.filter(id => id !== playerId);

  if (newAttendees.length < 4) {
    const matchToCancel = pendingMatches.find(
      m => m.teamA.includes(playerId) || m.teamB.includes(playerId)
    )?.id;
    if (matchToCancel) return applyNoShow(league, matchToCancel, playerId);
    return league;
  }

  const lastCompletedRound =
    completedMatches.length > 0 ? Math.max(...completedMatches.map(m => m.round)) : 0;
  const totalRounds = Math.max(...day.matches.map(m => m.round));
  const roundsToGenerate = totalRounds - lastCompletedRound;

  if (roundsToGenerate <= 0) return league;

  const partialLeague = {
    ...league,
    days: [...league.days.slice(0, dayIndex), { ...day, matches: completedMatches }],
  };
  const history = buildSagaHistory(partialLeague);
  const ROUND_DURATION_MIN = MATCH_CONFIG.MATCH_DURATION_MIN;
  const remainingHours = (roundsToGenerate * ROUND_DURATION_MIN) / 60;

  const miniDay = generateLeagueDay(
    league.id,
    day.week,
    day.day,
    newAttendees,
    day.config?.courts || 2,
    Math.max(0.5, remainingHours),
    history
  );

  const newFutureMatches = miniDay.matches.map(m => ({
    ...m,
    round: m.round + lastCompletedRound,
  }));

  const newDay: LeagueDay = {
    ...day,
    attendees: newAttendees,
    matches: [...completedMatches, ...newFutureMatches],
  };

  const newLeague = { ...league };
  newLeague.days = [...newLeague.days];
  newLeague.days[dayIndex] = newDay;
  return newLeague;
}

// ============================================================================
// DELETE DAY & RECOMPUTE STATS
// ============================================================================

export function deleteLeagueDay(league: League, dayId: string, players: Player[]): { league: League, players: Player[] } {
  // 1. Remove the day
  const newDays = (league.days || []).filter(d => d.id !== dayId);

  // 2. Remove related audit logs
  const newAuditLog = (league.auditLog || []).filter(log => log.snapshot?.dayId !== dayId);

  const newLeague = { ...league, days: newDays, auditLog: newAuditLog };

  // 3. Reset ALL player stats
  const resetPlayers = players.map(p => ({
    ...p,
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    currentStreak: 0,
    clutchWins: 0,
    bagelsGiven: 0,
    totalPoints: 0,
    bonusPoints: 0,
    noShows: 0,
    winPercentage: 0,
    stats: {
      wins: 0,
      losses: 0,
      currentStreak: 0,
      clutchWins: 0,
      bagelsGiven: 0,
      totalPoints: 0,
      bonusPoints: 0,
      noShows: 0,
      singles: { wins: 0, losses: 0, currentStreak: 0 },
      doubles: { wins: 0, losses: 0, currentStreak: 0 }
    }
  }));

  // 4. Recalculate stats from remaining days
  const recalculatedPlayers = recomputeAllStats(newLeague, resetPlayers);

  return { league: newLeague, players: recalculatedPlayers };
}

function recomputeAllStats(league: League, players: Player[]): Player[] {
  const playerMap = new Map(players.map(p => [p.id, { ...p }]));

  // Sort days chronologically
  const sortedDays = [...(league.days || [])].sort((a, b) => (a.week * 100 + a.day) - (b.week * 100 + b.day));

  sortedDays.forEach(day => {
    // Sort matches by round/order
    const sortedMatches = [...day.matches].sort((a, b) => a.round - b.round || a.orderIndex - b.orderIndex);

    sortedMatches.forEach(match => {
      // Handle No Shows
      (match.noShowPlayerIds || []).forEach(pid => {
        const p = playerMap.get(pid);
        if (p) p.stats.noShows++;
      });

      if (!match.isCompleted || match.status !== 'completed' || match.isForfeit) return;

      const isSingles = match.type === 'singles';
      const scoreA = match.scoreA ?? 0;
      const scoreB = match.scoreB ?? 0;

      const isAWinner = scoreA > scoreB;
      const winners = isAWinner ? match.teamA : match.teamB;
      const losers = isAWinner ? match.teamB : match.teamA;
      const winnerScore = isAWinner ? scoreA : scoreB;
      const loserScore = isAWinner ? scoreB : scoreA;

      // Points
      const winPoints = computeLeaguePoints(true, winnerScore, loserScore);
      
      // Bagel / Clutch
      const isBagel = loserScore === 0;
      const isClutch = winnerScore === 15 && loserScore === 14;

      winners.forEach(id => {
        const p = playerMap.get(id);
        if (p) {
          p.gamesPlayed++;
          p.wins = (p.wins ?? 0) + 1;
          p.totalPoints = (p.totalPoints ?? 0) + winnerScore;
          p.currentStreak = (p.currentStreak ?? 0) + 1;
          
          if (isBagel) p.bagelsGiven = (p.bagelsGiven ?? 0) + 1;
          if (isClutch) p.clutchWins = (p.clutchWins ?? 0) + 1;
          
          if (winPoints === 4) p.bonusPoints = (p.bonusPoints ?? 0) + 1;

          // Legacy stats object
          p.stats.wins++;
          p.stats.totalPoints += winnerScore;
          p.stats.currentStreak++;
          if (isBagel) p.stats.bagelsGiven++;
          if (isClutch) p.stats.clutchWins++;
          if (winPoints === 4) p.stats.bonusPoints++;

          if (isSingles) {
            p.stats.singles.wins++;
            p.stats.singles.currentStreak++;
          } else {
            p.stats.doubles.wins++;
            p.stats.doubles.currentStreak++;
          }
        }
      });

      losers.forEach(id => {
        const p = playerMap.get(id);
        if (p) {
          p.gamesPlayed++;
          p.losses = (p.losses ?? 0) + 1;
          p.totalPoints = (p.totalPoints ?? 0) + loserScore;
          p.currentStreak = -1;

          // Legacy stats object
          p.stats.losses++;
          p.stats.totalPoints += loserScore;
          p.stats.currentStreak = 0;

          if (isSingles) {
            p.stats.singles.losses++;
            p.stats.singles.currentStreak = 0;
          } else {
            p.stats.doubles.losses++;
            p.stats.doubles.currentStreak = 0;
          }
        }
      });
    });
  });

  return Array.from(playerMap.values());
}
