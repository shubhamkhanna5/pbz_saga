
import { PBZHighlight } from "../types";

/**
 * Builds a lightweight JSON object focused solely on clip generation.
 * Used for the "PBZ Auto Reel Studio" workflow.
 */
export function buildHighlightJSON(match: any, mode: string) {
  const highlights = match.highlights || [];
  
  // Sort highlights by time to ensure timeline order
  const sortedHighlights = [...highlights].sort((a: PBZHighlight, b: PBZHighlight) => a.triggerTime - b.triggerTime);

  return {
    schema: "PBZ_HIGHLIGHT_v1",
    metadata: {
      exportedAt: new Date().toISOString(),
      matchId: match.id,
      matchType: mode
    },
    match: {
      startTime: match.startTime,
      endTime: match.endTime || Date.now(),
      teams: {
        A: match.teamA,
        B: match.teamB
      },
      finalScore: `${match.scoreA || 0}-${match.scoreB || 0}`,
      winner: (match.scoreA || 0) > (match.scoreB || 0) ? "A" : (match.scoreB || 0) > (match.scoreA || 0) ? "B" : null
    },
    highlights: sortedHighlights
  };
}

/**
 * Triggers browser download for the Highlight JSON
 */
export function downloadHighlightJSON(data: any, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}
