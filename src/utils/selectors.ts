import { League, Player, PlayerStats } from '../types';

export interface ScoreboardPlayer {
  id: string;
  name: string;
  skill: number;
  stats: PlayerStats;
  isPresent: boolean;
  gamesPlayed: number;
}

export function selectScoreboardPlayers(
  league: League | null,
  livePlayers: Player[],
  currentDayId?: string
): ScoreboardPlayer[] {
  if (!league) return [];

  const liveMap = new Map(
    livePlayers.map(p => [p.id, p])
  );

  // Optional: current day attendance
  const day = currentDayId 
    ? league.days.find(d => d.id === currentDayId) 
    : null;
    
  // Safety check: ensure attendees array exists (legacy data protection)
  // We use a local variable to guarantee array access, avoiding 'day.attendees' direct access later
  const safeAttendees = (day && Array.isArray(day.attendees)) ? day.attendees : [];

  const attendeeSet = day
    ? new Set(safeAttendees)
    : null;

  if (day) {
      // Use safeAttendees here instead of day.attendees
      const missing = (league.players || []).filter(
        id => !safeAttendees.includes(id)
      );
    
      if (missing.length) {
        console.warn(
          '[Scoreboard]',
          'Players missing from day attendees (defaulting to absent for this day view):',
          missing
        );
      }
  }

  return (league.players || [])
    .map(playerId => {
      const live = liveMap.get(playerId);
      if (!live) return null;

      return {
        id: live.id,
        name: live.name,
        skill: live.skill,
        stats: live.stats,
        gamesPlayed: live.gamesPlayed,

        // 🔑 Attendance only affects presence in the view
        // If a day is selected, use the day's attendance record
        // Otherwise use the live global presence
        isPresent: attendeeSet
          ? attendeeSet.has(playerId)
          : live.isPresent
      };
    })
    .filter((p): p is ScoreboardPlayer => p !== null);
}
