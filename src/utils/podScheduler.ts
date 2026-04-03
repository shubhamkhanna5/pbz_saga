
import { LeagueMatch } from '../types';

type Pod = string[];

type CoverageMap = Map<string, Set<string>>;

interface PodState {
  partnerMap: CoverageMap;
  opponentMap: Map<string, Set<string>>;
  swappedCount: Map<string, number>;
}

function initCoverage(players: string[]): PodState {
  const partnerMap = new Map();
  const opponentMap = new Map();
  const swappedCount = new Map();

  players.forEach(p => {
    partnerMap.set(p, new Set());
    opponentMap.set(p, new Set());
    swappedCount.set(p, 0);
  });

  return { partnerMap, opponentMap, swappedCount };
}

function generatePod4(pod: Pod) {
  const [A, B, C, D] = pod;

  return [
    { teamA: [A, B], teamB: [C, D] },
    { teamA: [A, C], teamB: [B, D] },
    { teamA: [A, D], teamB: [B, C] },
  ];
}

function generatePod5(pod: Pod) {
  const [A, B, C, D, E] = pod;

  return [
    { teamA: [A, B], teamB: [C, D], sit: E },
    { teamA: [A, C], teamB: [D, E], sit: B },
    { teamA: [A, D], teamB: [B, E], sit: C },
    { teamA: [A, E], teamB: [B, C], sit: D },
    { teamA: [B, D], teamB: [C, E], sit: A },
  ];
}

function generatePod6(pod: Pod) {
  const [A, B, C, D, E, F] = pod;

  return [
    { teamA: [A, B], teamB: [C, D], sit: [E, F] },
    { teamA: [C, E], teamB: [D, F], sit: [A, B] },
    { teamA: [A, F], teamB: [B, E], sit: [C, D] },
  ];
}

function updateCoverage(
  match: { teamA: string[]; teamB: string[] },
  state: PodState
) {
  const { teamA, teamB } = match;

  // partners
  if (teamA.length === 2) {
    state.partnerMap.get(teamA[0])?.add(teamA[1]);
    state.partnerMap.get(teamA[1])?.add(teamA[0]);
  }

  if (teamB.length === 2) {
    state.partnerMap.get(teamB[0])?.add(teamB[1]);
    state.partnerMap.get(teamB[1])?.add(teamB[0]);
  }

  // opponents
  teamA.forEach(a => {
    teamB.forEach(b => {
      state.opponentMap.get(a)?.add(b);
      state.opponentMap.get(b)?.add(a);
    });
  });
}

function podKey(pod: string[]) {
  return [...pod].sort().join('|');
}

function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function buildPods(players: string[]): Pod[] {
  const shuffled = shuffle(players);
  const pods: Pod[] = [];
  let remaining = [...shuffled];
  const total = remaining.length;

  // Special case for 8 players: 4 + 4 is better than 6 + 2
  if (total === 8) {
    pods.push(remaining.splice(0, 4));
    pods.push(remaining.splice(0, 4));
    return pods;
  }

  while (remaining.length > 0) {
    if (remaining.length % 5 === 0) {
      pods.push(remaining.splice(0, 5));
    } else if (remaining.length >= 6) {
      pods.push(remaining.splice(0, 6));
    } else {
      pods.push(remaining.splice(0, 4));
    }
  }

  return pods;
}

function getMissingCount(p: string, state: PodState, total: number) {
  const partners = state.partnerMap.get(p)?.size || 0;
  const opponents = state.opponentMap.get(p)?.size || 0;

  // We want to maximize unique partners and opponents
  // Target is total - 1 for each
  return (total - 1 - partners) + (total - 1 - opponents);
}

function smartSwapPods(pods: Pod[], state: PodState, players: string[]): Pod[] {
  if (pods.length < 2) {
    // If only one pod, shuffle it to ensure different pairings in next cycle
    return [[...pods[0]].sort(() => Math.random() - 0.5)];
  }

  const newPods = pods.map(p => [...p]);

  for (let i = 0; i < newPods.length - 1; i++) {
    const podA = newPods[i];
    const podB = newPods[i + 1];

    // Pick players with the MOST missing coverage to swap
    const sortedA = [...podA].sort(
      (a, b) => getMissingCount(b, state, players.length) - getMissingCount(a, state, players.length)
    );

    const sortedB = [...podB].sort(
      (a, b) => getMissingCount(b, state, players.length) - getMissingCount(a, state, players.length)
    );

    const swapCount = Math.min(2, podA.length, podB.length);

    for (let j = 0; j < swapCount; j++) {
      const a = sortedA[j];
      const b = sortedB[j];

      const idxA = podA.indexOf(a);
      const idxB = podB.indexOf(b);
      
      podA[idxA] = b;
      podB[idxB] = a;

      state.swappedCount.set(a, (state.swappedCount.get(a) || 0) + 1);
      state.swappedCount.set(b, (state.swappedCount.get(b) || 0) + 1);
    }
  }

  return newPods;
}

function isCoverageComplete(players: string[], state: PodState): boolean {
  return players.every(p => {
    const partners = state.partnerMap.get(p)?.size || 0;
    const opponents = state.opponentMap.get(p)?.size || 0;
    
    // "Everyone plays with everyone" (Partners)
    // "Everyone plays everyone" (Opponents)
    return partners >= players.length - 1 && opponents >= players.length - 1;
  });
}

export function generatePodSchedule(
  players: string[],
  requestedCycles: number,
  leagueId: string
) {
  const state = initCoverage(players);
  let pods = buildPods(players);
  const usedPodKeys = new Set<string>();

  const matches: Partial<LeagueMatch>[] = [];
  let round = 1;
  let matchCounter = 1;

  // If requestedCycles is 0, it means "Auto-Scale"
  const autoScale = requestedCycles === 0;
  const maxCycles = autoScale ? 20 : requestedCycles;
  let actualCycles = 0;

  for (let cycle = 0; cycle < maxCycles; cycle++) {
    // 🚨 STOP if already complete
    if (isCoverageComplete(players, state)) {
      console.log(`✅ Coverage complete at cycle ${cycle}`);
      break;
    }

    const currentPodKeys = pods.map(podKey);

    // 🚨 SKIP if this exact configuration already used
    const isDuplicate = currentPodKeys.every(k => usedPodKeys.has(k));
    if (isDuplicate && cycle > 0) {
      pods = buildPods(players); // hard reset shuffle
      // Don't increment actualCycles or round yet, just try again with new pods
      // To prevent infinite loop if it's impossible to find new pods, we limit retries
      continue; 
    }

    // mark pods used
    currentPodKeys.forEach(k => usedPodKeys.add(k));
    actualCycles++;

    pods.forEach((pod, podIdx) => {
      let podMatches: any[] = [];
      const podId = `Pod ${podIdx + 1}`;

      if (pod.length === 4) podMatches = generatePod4(pod);
      else if (pod.length === 5) podMatches = generatePod5(pod);
      else if (pod.length === 6) podMatches = generatePod6(pod);
      else if (pod.length > 6) {
          podMatches = generatePod6(pod.slice(0, 6));
      }

      podMatches.forEach((m) => {
        matches.push({
          id: `pm_${leagueId}_${round}_${matchCounter++}`,
          round,
          teamA: m.teamA,
          teamB: m.teamB,
          type: 'doubles',
          status: 'scheduled',
          courtId: 0,
          podId,
          cycleIndex: cycle,
        });

        updateCoverage(m, state);
      });
    });

    round++;

    // swap for next cycle
    pods = smartSwapPods(pods, state, players);
  }

  return { matches, cycles: actualCycles };
}
