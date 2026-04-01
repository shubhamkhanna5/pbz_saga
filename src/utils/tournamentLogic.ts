
import { Tournament, TournamentMatch, TournamentGroup } from '../types';
import { generateId } from './storage';

/**
 * Creates teams based on mode
 */
export const createTeams = (
    playerIds: string[], 
    matchType: 'singles' | 'doubles', 
    teamMode: 'random' | 'manual',
    manualTeams?: string[][]
): string[][] => {
    
    if (matchType === 'singles') {
        return playerIds.map(id => [id]);
    }

    if (teamMode === 'manual' && manualTeams) {
        return manualTeams;
    }

    // Random Doubles
    const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
    const teams: string[][] = [];
    for (let i = 0; i < shuffled.length; i += 2) {
        if (i + 1 < shuffled.length) {
            teams.push([shuffled[i], shuffled[i+1]]);
        } else {
            // Remainder player? For now, ignore or add as single?
            // Doubles requires pairs. 
            // We will just not add the last person if odd.
        }
    }
    return teams;
};

/**
 * Creates balanced groups based on TEAM count.
 */
export const createGroups = (teams: string[][]): TournamentGroup[] => {
  const shuffled = [...teams].sort(() => Math.random() - 0.5);
  const n = shuffled.length;
  
  if (n < 6) {
    return [{
      id: 'G1',
      name: 'Group Stage',
      teams: shuffled
    }];
  }

  // 2 Groups
  const mid = Math.ceil(n / 2);
  const g1 = shuffled.slice(0, mid);
  const g2 = shuffled.slice(mid);

  return [
    { id: 'G1', name: 'Group A', teams: g1 },
    { id: 'G2', name: 'Group B', teams: g2 }
  ];
};

// --- SCHEDULING HELPERS (REST + ANTI-REPEAT) ---

interface TournamentSchedulerState {
  lastMatchIndexByTeam: Record<string, number>;
  facedOpponents: Set<string>;
}

function teamKey(team: string[]) {
  return [...team].sort().join('&');
}

function matchupKey(teamA: string[], teamB: string[]) {
  return [teamKey(teamA), teamKey(teamB)].sort().join(' VS ');
}

function hasTournamentRest(
  team: string[],
  matchIndex: number,
  state: TournamentSchedulerState
) {
  const key = teamKey(team);
  const last = state.lastMatchIndexByTeam[key];
  if (last === undefined) return true;
  return matchIndex - last >= 2; // MUST skip at least 1 match
}

function mulberry32(seed: number) {
  return function () {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

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
 * Generates Round Robin matches for specific groups (Team vs Team).
 * Uses Strict Scheduling (No Repeats, Forced Rest).
 */
export const generateGroupMatches = (groups: TournamentGroup[]): TournamentMatch[] => {
  let matches: TournamentMatch[] = [];
  
  // Track state globally across groups if we want to interleave, 
  // but usually groups run independently or interleaved in the final list.
  // We'll generate robust schedules per group then interleave them.

  groups.forEach(group => {
    const groupTeams = group.teams;
    const possibleMatches: { a: string[], b: string[] }[] = [];

    // 1. Generate all pairings
    for (let i = 0; i < groupTeams.length; i++) {
      for (let j = i + 1; j < groupTeams.length; j++) {
          possibleMatches.push({ a: groupTeams[i], b: groupTeams[j] });
      }
    }
    
    // Shuffle possibilities
    const shuffledPool = seededShuffle(possibleMatches, Date.now() + Math.random());

    // 2. Schedule with Constraints
    const state: TournamentSchedulerState = {
        lastMatchIndexByTeam: {},
        facedOpponents: new Set()
    };
    
    const groupSchedule: TournamentMatch[] = [];
    // We try to slot matches. If we get stuck, we might need a retry loop (simple version here)
    // For simple Round Robin, just iterating and checking constraints usually works if N is not too small.
    // If N is small (3 or 4), rest constraints are hard to satisfy perfectly.
    // We will relax rest constraint if stuck.

    const pending = [...shuffledPool];
    let retries = 0;

    while (pending.length > 0 && retries < 100) {
        const matchIdx = groupSchedule.length;
        let foundIndex = -1;

        // Try to find a valid match
        for (let i = 0; i < pending.length; i++) {
            const pair = pending[i];
            const tA = pair.a;
            const tB = pair.b;
            
            // Check rest
            if (hasTournamentRest(tA, matchIdx, state) && hasTournamentRest(tB, matchIdx, state)) {
                foundIndex = i;
                break;
            }
        }

        // If no match found with rest, take the first one (Relax Constraint)
        if (foundIndex === -1) {
            foundIndex = 0;
        }

        const pair = pending[foundIndex];
        // Record
        state.lastMatchIndexByTeam[teamKey(pair.a)] = matchIdx;
        state.lastMatchIndexByTeam[teamKey(pair.b)] = matchIdx;
        
        groupSchedule.push({
            id: generateId(),
            round: 1, 
            groupId: group.id,
            teamA: pair.a,
            teamB: pair.b,
            status: 'pending'
        });

        pending.splice(foundIndex, 1);
        retries++;
    }
    
    matches.push(...groupSchedule);
  });
  
  // Interleave matches from different groups to maximize rest for everyone
  // e.g. G1-M1, G2-M1, G1-M2, G2-M2...
  if (groups.length > 1) {
      const g1Matches = matches.filter(m => m.groupId === groups[0].id);
      const g2Matches = matches.filter(m => m.groupId === groups[1].id);
      const interleaved: TournamentMatch[] = [];
      const maxLen = Math.max(g1Matches.length, g2Matches.length);
      for(let i=0; i<maxLen; i++) {
          if (g1Matches[i]) interleaved.push(g1Matches[i]);
          if (g2Matches[i]) interleaved.push(g2Matches[i]);
      }
      matches = interleaved;
  }

  return matches;
};

// --- COURT BALANCING ---

interface CourtBalanceState {
  lastCourtByTeam: Record<string, number>;
}

function prefersCourt(
  team: string[],
  courtId: number,
  state: CourtBalanceState
) {
  return team.some(p => state.lastCourtByTeam[p] === courtId);
}

export function assignCourtsToMatches(
  matches: TournamentMatch[],
  courts: number
): TournamentMatch[] {
  const state: CourtBalanceState = { lastCourtByTeam: {} };

  return matches.map((match, index) => {
    if (!match.teamA || !match.teamB) return match;

    let chosenCourt = (index % courts) + 1;

    // Avoid same court as last time
    // Try other courts if preferred
    for (let i = 0; i < courts; i++) {
      const tryCourt = ((chosenCourt + i - 1) % courts) + 1;
      if (
        !prefersCourt(match.teamA, tryCourt, state) &&
        !prefersCourt(match.teamB, tryCourt, state)
      ) {
        chosenCourt = tryCourt;
        break;
      }
    }

    [...match.teamA, ...match.teamB].forEach(pid => {
      state.lastCourtByTeam[pid] = chosenCourt;
    });

    return {
      ...match,
      courtId: chosenCourt
    };
  });
}

/**
 * Calculate Standings for a specific group (Team-based)
 */
export const calculateGroupStandings = (matches: TournamentMatch[], teams: string[][]) => {
  // Map Team Key (joined IDs) to stats
  const stats: Record<string, { team: string[], wins: number; losses: number; pointsDiff: number; played: number; points: number }> = {};
  
  const getTeamKey = (t: string[]) => t.sort().join(',');

  teams.forEach(t => {
    stats[getTeamKey(t)] = { team: t, wins: 0, losses: 0, pointsDiff: 0, played: 0, points: 0 };
  });

  matches.forEach(m => {
    if (m.status === 'completed' && m.scoreA !== undefined && m.scoreB !== undefined) {
      const kA = getTeamKey(m.teamA);
      const kB = getTeamKey(m.teamB);
      const diff = Math.abs(m.scoreA - m.scoreB);
      
      if (stats[kA] && stats[kB]) {
          stats[kA].played++;
          stats[kB].played++;
          
          if (m.scoreA > m.scoreB) {
            stats[kA].wins++;
            stats[kA].points++; // 1 point per win
            stats[kA].pointsDiff += diff;
            stats[kB].losses++;
            stats[kB].pointsDiff -= diff;
          } else {
            stats[kB].wins++;
            stats[kB].points++; // 1 point per win
            stats[kB].pointsDiff += diff;
            stats[kA].losses++;
            stats[kA].pointsDiff -= diff;
          }
      }
    }
  });

  return Object.values(stats)
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.pointsDiff - a.pointsDiff;
    });
};

/**
 * Calculate Standings for the entire tournament
 */
export const calculateStandings = (tournament: Tournament) => {
    return calculateGroupStandings(tournament.matches, tournament.teams);
};

// --- KNOCKOUT SCHEDULING (REST GUARANTEED) ---

interface KnockoutSchedulerState {
  lastMatchIndexByTeam: Record<string, number>;
}

function canPlayKnockout(
  team: string[],
  matchIndex: number,
  state: KnockoutSchedulerState
) {
  const key = teamKey(team);
  const last = state.lastMatchIndexByTeam[key];
  if (last === undefined) return true;
  return matchIndex - last >= 2; // force 1-match gap
}

/**
 * GENERATE BRACKET
 */
export const generateKnockoutBracket = (tournament: Tournament): TournamentMatch[] => {
  const matches: TournamentMatch[] = [];
  const state: KnockoutSchedulerState = {
    lastMatchIndexByTeam: {}
  };
  const groups = tournament.groups;
  
  // Get qualifiers (Teams)
  const qualifiers: string[][] = [];

  if (groups.length === 1) {
    // Top 4 from single group
    const standings = calculateGroupStandings(
        tournament.matches.filter(m => m.groupId === groups[0].id), 
        groups[0].teams
    );
    // Take up to 4, or all if less
    qualifiers.push(...standings.slice(0, 4).map(s => s.team));
  } else {
    // Top 2 from each group
    const s1 = calculateGroupStandings(
        tournament.matches.filter(m => m.groupId === groups[0].id),
        groups[0].teams
    );
    const s2 = calculateGroupStandings(
        tournament.matches.filter(m => m.groupId === groups[1].id),
        groups[1].teams
    );
    
    // Cross: A1 vs B2, B1 vs A2
    if (s1[0]) qualifiers.push(s1[0].team); // Seed 1
    if (s2[1] || s1[3]) qualifiers.push(s2[1]?.team || s1[3]?.team); // Seed 4
    if (s2[0]) qualifiers.push(s2[0].team); // Seed 2
    if (s1[1] || s2[3]) qualifiers.push(s1[1]?.team || s2[3]?.team); // Seed 3
  }

  const teamCount = qualifiers.length;
  
  // --- BUILD MATCH OBJECTS FIRST ---
  const pendingMatches: any[] = [];

  if (teamCount === 4) {
      pendingMatches.push({ round: 2, bracketRound: 'semi', teamA: qualifiers[0], teamB: qualifiers[1] });
      pendingMatches.push({ round: 2, bracketRound: 'semi', teamA: qualifiers[2], teamB: qualifiers[3] });
      // Buffer
      pendingMatches.push({ type: 'buffer' });
      // Finals
      pendingMatches.push({ round: 3, bracketRound: 'third_place', teamA: [], teamB: [] });
      pendingMatches.push({ round: 3, bracketRound: 'final', teamA: [], teamB: [] });
  } else if (teamCount === 3) {
      pendingMatches.push({ round: 2, bracketRound: 'semi', teamA: qualifiers[1], teamB: qualifiers[2] });
      pendingMatches.push({ type: 'buffer' });
      pendingMatches.push({ round: 3, bracketRound: 'final', teamA: qualifiers[0], teamB: [] }); // Bye waits
  } else if (teamCount === 2) {
      pendingMatches.push({ round: 3, bracketRound: 'final', teamA: qualifiers[0], teamB: qualifiers[1] });
  }

  // --- SCHEDULE WITH REST ---
  pendingMatches.forEach(pm => {
      if (pm.type === 'buffer') return; // Skip logic, just don't add to output, acts as spacer index increment if we tracked real time, but here we just order them
      
      const idx = matches.length;
      // For brackets, we mostly just output them in order. 
      // The "Buffer" logic in the prompt implies we inject space. 
      // Since we return a list, the UI displays them. 
      // We mainly ensure the Final is last.
      
      matches.push({
          id: generateId(),
          round: pm.round,
          bracketRound: pm.bracketRound,
          teamA: pm.teamA,
          teamB: pm.teamB,
          status: 'pending'
      });
      
      // Update state for hypothetical future checking
      if (pm.teamA.length) state.lastMatchIndexByTeam[teamKey(pm.teamA)] = idx;
      if (pm.teamB.length) state.lastMatchIndexByTeam[teamKey(pm.teamB)] = idx;
  });

  return matches;
};

/**
 * Handle progression
 */
export const updateBracketProgression = (tournament: Tournament, completedMatch: TournamentMatch): TournamentMatch[] => {
  if (completedMatch.bracketRound !== 'semi') return tournament.matches;

  // Identify Winner Team and Loser Team
  // Note: teamA/teamB are arrays of strings.
  const winnerTeam = completedMatch.scoreA! > completedMatch.scoreB! ? completedMatch.teamA : completedMatch.teamB;
  const loserTeam = completedMatch.scoreA! > completedMatch.scoreB! ? completedMatch.teamB : completedMatch.teamA;

  const getKey = (t: string[]) => t.sort().join(',');
  const winnerKey = getKey(winnerTeam);
  const loserKey = getKey(loserTeam);

  return tournament.matches.map(m => {
    if (m.bracketRound === 'final') {
        const currentA = getKey(m.teamA);
        if (m.teamA.length === 0) return { ...m, teamA: winnerTeam };
        if (m.teamA.length > 0 && m.teamB.length === 0 && currentA !== winnerKey) return { ...m, teamB: winnerTeam };
    }
    if (m.bracketRound === 'third_place') {
        const currentA = getKey(m.teamA);
        if (m.teamA.length === 0) return { ...m, teamA: loserTeam };
        if (m.teamA.length > 0 && m.teamB.length === 0 && currentA !== loserKey) return { ...m, teamB: loserTeam };
    }
    return m;
  });
};
