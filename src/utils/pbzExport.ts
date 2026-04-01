
import { Game, LeagueMatch, TournamentMatch, GameEvent } from '../types';

/**
 * Builds a standardized PBZ Match JSON object.
 * Acts as a snapshot of the game state and event timeline.
 */
export function buildPBZMatchJSON(match: any, mode: string) {
  return {
    schema: "PBZ_MATCH_v1",
    metadata: {
      exportedAt: new Date().toISOString(),
      matchType: mode,
      matchId: match.id,
      pbzVersion: "1.0.0"
    },
    timing: {
      matchStart: match.startTime || Date.now(),
      matchEnd: match.endTime || Date.now()
    },
    context: {
      mode,
      seasonId: match.seasonId || null, // Future proofing
      divisionId: match.divisionId || null,
      court: match.courtId || 1,
      venue: "PBZ Arena"
    },
    teams: {
      A: match.teamA,
      B: match.teamB
    },
    score: {
      final: `${match.scoreA || 0}-${match.scoreB || 0}`,
      winner:
        (match.scoreA || 0) > (match.scoreB || 0)
          ? "A"
          : (match.scoreB || 0) > (match.scoreA || 0)
          ? "B"
          : null
    },
    events: match.events || []
  };
}

/**
 * Triggers a browser download of the JSON object.
 */
export function downloadJSON(data: any, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a); // Required for Firefox
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}
