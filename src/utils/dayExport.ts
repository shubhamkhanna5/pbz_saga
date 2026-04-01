
import { AppState, League, LeagueDay } from '../types';

// ============================================================================
// PBZ DAY EXPORT + CLOUD SYNC (UNIFIED)
// Admin-triggered export system
// Compatible with existing cloudBackup system
// ============================================================================

// MAIN ENTRY POINT
export async function exportAndSyncDay(
  appState: AppState,
  sagaId: string,
  dayId: string,
  onError?: (msg: string) => void
) {
  try {
    let saga: League | undefined;
    
    // Locate the saga in active or past leagues
    if (appState.activeLeague && appState.activeLeague.id === sagaId) {
        saga = appState.activeLeague;
    } else {
        saga = appState.pastLeagues.find(l => l.id === sagaId);
    }

    if (!saga) throw new Error("Saga not found");

    const day = saga.days.find(d => d.id === dayId);
    if (!day) throw new Error("Day not found");

    const payload = buildPayload(saga, day);

    // 1️⃣ Download locally
    downloadJSON(payload, buildFilename(saga, day));

    console.log("✅ PBZ Day Exported locally");

    return payload;

  } catch (err) {
    console.error("❌ Export + Sync failed:", err);
    if (onError) onError("Export Failed. Check console for details.");
    else alert("Export Failed. Check console for details.");
  }
}

// ---------------------------------------------------------------------------
// Build Structured JSON
// ---------------------------------------------------------------------------

function buildPayload(saga: League, day: LeagueDay) {
  return {
    metadata: {
      type: "PBZ_DAY_EXPORT",
      version: "2.0",
      exportedAt: Date.now(),
      sagaId: saga.id,
      sagaName: saga.name,
      dayId: day.id,
      dayNumber: day.day
    },

    structure: {
      courts: day.config?.courts || 0,
      hours: day.config?.hours || 0,
      totalMatches: day.matches?.length || 0
    },

    matches: (day.matches || []).map((m) => ({
      id: m.id,
      court: m.courtId,
      type: m.type,
      teamA: m.teamA,
      teamB: m.teamB,
      scoreA: m.scoreA,
      scoreB: m.scoreB,
      status: m.status,

      // Only meaningful reel triggers
      highlights: m.highlights || []
    }))
  };
}

// ---------------------------------------------------------------------------
// Filename
// ---------------------------------------------------------------------------

function buildFilename(saga: League, day: LeagueDay) {
  const date = new Date().toISOString().split('T')[0];
  const safeName = saga.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  return `PBZ_${safeName}_day${day.day}_${date}.json`;
}

// ---------------------------------------------------------------------------
// Download Helper
// ---------------------------------------------------------------------------

function downloadJSON(data: any, filename: string) {
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
