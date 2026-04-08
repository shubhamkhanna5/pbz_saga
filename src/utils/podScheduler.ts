
import { LeagueMatch, PodComposition } from '../types';

type Pod = string[];

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

function simpleSwapPods(pods: Pod[], cycleIndex: number): Pod[] {
  if (pods.length < 2) return pods;

  const newPods = pods.map(p => [...p]);
  
  // Deterministic swap patterns for pods of 4
  const patterns = [
    [0, 1],
    [2, 3],
    [0, 2],
    [1, 3]
  ];
  
  const pattern = patterns[cycleIndex % patterns.length];
  
  for (let i = 0; i < newPods.length - 1; i++) {
    const podA = newPods[i];
    const podB = newPods[i + 1];
    
    // Swap players at indices defined by the pattern
    // Guard against different pod sizes
    pattern.forEach(idx => {
      if (idx < podA.length && idx < podB.length) {
        const temp = podA[idx];
        podA[idx] = podB[idx];
        podB[idx] = temp;
      }
    });
  }
  
  return newPods;
}

export function generatePodSchedule(
  players: string[],
  requestedCycles: number,
  leagueId: string
) {
  let pods = buildPods(players);
  const matches: Partial<LeagueMatch>[] = [];
  const podCompositions: PodComposition[] = [];
  let round = 1;
  let matchCounter = 1;

  // If requestedCycles is 0, it means "Auto-Scale"
  // For the simple system, we'll default to 4 cycles for 8 players
  const maxCycles = requestedCycles === 0 ? 4 : requestedCycles;

  for (let cycle = 0; cycle < maxCycles; cycle++) {
    // Record composition BEFORE matches of this cycle
    podCompositions.push({
      cycleIndex: cycle,
      pods: pods.map((p, i) => ({ id: `Pod ${i + 1}`, players: [...p] }))
    });

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
      });
    });

    round++;

    // swap for next cycle
    pods = simpleSwapPods(pods, cycle);
  }

  return { matches, cycles: maxCycles, podCompositions };
}
