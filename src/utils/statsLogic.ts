
import { AppState, Player } from '../types';
import { computeLeaguePoints } from './rules';

export interface CareerStats {
  league: {
    games: number;
    wins: number;
    losses: number;
    points: number;
    ppg: string;
    winRate: string;
  };
  tournament: {
    games: number;
    wins: number;
    losses: number;
    titles: number;
    winRate: string;
  };
  overall: {
    games: number;
    wins: number;
    losses: number;
    winRate: string;
  };
}

export const calculateCareerStats = (player: Player, state: AppState): CareerStats => {
  // 1. LEAGUE AGGREGATION
  let lGames = 0, lWins = 0, lPoints = 0;
  
  const leagues = [...state.pastLeagues];
  if (state.activeLeague) leagues.push(state.activeLeague);

  leagues.forEach(l => {
    l.days.forEach(d => {
      d.matches.forEach(m => {
        // Strict accounting matches standard standings logic
        // Only completed, non-forfeit matches with valid scores count
        if (
          m.isCompleted && 
          m.status === 'completed' && 
          !m.isForfeit && 
          m.scoreA !== undefined && 
          m.scoreB !== undefined &&
          (!m.noShowPlayerIds || m.noShowPlayerIds.length === 0)
        ) {
          const isA = m.teamA.includes(player.id);
          const isB = m.teamB.includes(player.id);
          if (!isA && !isB) return;

          lGames++;
          const scoreA = m.scoreA;
          const scoreB = m.scoreB;
          
          if (isA) {
            const won = scoreA > scoreB;
            if (won) lWins++;
            lPoints += computeLeaguePoints(won, scoreA, scoreB); 
          } else {
            const won = scoreB > scoreA;
            if (won) lWins++;
            lPoints += computeLeaguePoints(won, scoreB, scoreA);
          }
        }
      });
    });
  });

  // 2. TOURNAMENT AGGREGATION
  let tGames = 0, tWins = 0, tTitles = 0;
  
  const tourneys = [...state.pastTournaments];
  if (state.activeTournament) tourneys.push(state.activeTournament);

  tourneys.forEach(t => {
    // Check Title
    const final = t.matches.find(m => m.bracketRound === 'final' && m.status === 'completed');
    if (final && final.scoreA !== undefined && final.scoreB !== undefined) {
        const winnerTeam = final.scoreA > final.scoreB ? final.teamA : final.teamB;
        if (winnerTeam.includes(player.id)) tTitles++;
    }

    t.matches.forEach(m => {
      if (m.status === 'completed' && m.scoreA !== undefined && m.scoreB !== undefined) {
        const isA = m.teamA.includes(player.id);
        const isB = m.teamB.includes(player.id);
        if (!isA && !isB) return;

        tGames++;
        if (isA && m.scoreA > m.scoreB) tWins++;
        if (isB && m.scoreB > m.scoreA) tWins++;
      }
    });
  });

  // 3. OVERALL (From Player Object)
  // Note: Player object stats are aggregated by the engine live.
  // They might include legacy data or friendly matches. 
  const wins = player.wins ?? player.stats?.wins ?? 0;
  const losses = player.losses ?? player.stats?.losses ?? 0;
  const oGames = wins + losses; 
  
  return {
    league: {
      games: lGames,
      wins: lWins,
      losses: lGames - lWins,
      points: lPoints,
      ppg: lGames > 0 ? (lPoints / lGames).toFixed(2) : '0.00',
      winRate: lGames > 0 ? ((lWins / lGames) * 100).toFixed(0) + '%' : '-'
    },
    tournament: {
      games: tGames,
      wins: tWins,
      losses: tGames - tWins,
      titles: tTitles,
      winRate: tGames > 0 ? ((tWins / tGames) * 100).toFixed(0) + '%' : '-'
    },
    overall: {
      games: oGames,
      wins: wins,
      losses: losses,
      winRate: oGames > 0 ? ((wins / oGames) * 100).toFixed(0) + '%' : '-'
    }
  };
};
