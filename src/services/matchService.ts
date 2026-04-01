import { supabase } from '../lib/supabase'
import { clearLeaderboardCache } from './queryService'
import { getActiveLeague } from './leagueService'

interface SinglesMatchParams {
  winner: string;
  loser: string;
  winnerScore: number;
  loserScore: number;
  context?: 'league' | 'training' | 'tournament';
}

/**
 * Add a singles match
 */
export async function addSinglesMatch({ 
  winner, 
  loser, 
  winnerScore, 
  loserScore,
  context = 'league'
}: SinglesMatchParams) {
  let leagueId = null;
  if (context === 'league') {
    try {
      const league = await getActiveLeague();
      leagueId = league.id;
    } catch (e) {
      console.warn('No active league for match context, falling back to training');
    }
  }

  const { data, error } = await supabase.rpc('insert_singles_match', {
    p_winner_name: winner,
    p_loser_name: loser,
    p_winner_score: winnerScore,
    p_loser_score: loserScore,
    p_match_date: new Date().toISOString(),
    p_league_id: leagueId,
    p_context: context,
    p_created_by: 'app'
  })

  if (error) {
    console.error('Error inserting singles match:', error)
    throw error
  }

  // Clear leaderboard cache since data changed
  clearLeaderboardCache()

  return data
}

interface DoublesMatchParams {
  team1Player1: string;
  team1Player2: string;
  team2Player1: string;
  team2Player2: string;
  winningTeam: number;
  team1Score: number;
  team2Score: number;
  context?: 'league' | 'training' | 'tournament';
}

/**
 * Add a doubles match
 */
export async function addDoublesMatch({ 
  team1Player1, 
  team1Player2, 
  team2Player1, 
  team2Player2, 
  winningTeam, 
  team1Score, 
  team2Score,
  context = 'league'
}: DoublesMatchParams) {
  let leagueId = null;
  if (context === 'league') {
    try {
      const league = await getActiveLeague();
      leagueId = league.id;
    } catch (e) {
      console.warn('No active league for match context, falling back to training');
    }
  }

  const { data, error } = await supabase.rpc('insert_doubles_match', {
    p_team1_player1: team1Player1,
    p_team1_player2: team1Player2,
    p_team2_player1: team2Player1,
    p_team2_player2: team2Player2,
    p_winning_team: winningTeam,
    p_team1_score: team1Score,
    p_team2_score: team2Score,
    p_match_date: new Date().toISOString(),
    p_league_id: leagueId,
    p_context: context,
    p_created_by: 'app'
  })

  if (error) {
    console.error('Error inserting doubles match:', error)
    throw error
  }

  // Clear leaderboard cache since data changed
  clearLeaderboardCache()

  return data
}

/**
 * Upsert multiple matches
 */
export async function upsertMatches(matches: any[]) {
  const { data, error } = await supabase
    .from('matches')
    .upsert(matches.map(m => ({
      id: m.id,
      league_id: m.leagueId,
      day_id: m.dayId,
      court_id: m.courtId,
      round: m.round,
      team_a: m.teamA,
      team_b: m.teamB,
      score_a: m.scoreA,
      score_b: m.scoreB,
      is_completed: m.isCompleted,
      type: m.type,
      status: m.status,
      no_show_player_ids: m.noShowPlayerIds || [],
      is_forfeit: m.isForfeit || false,
      order_index: m.orderIndex || 0,
      events: m.events || [],
      highlights: m.highlights || []
    })), { onConflict: 'id' })

  if (error) {
    console.error('Error upserting matches:', error)
    throw error
  }

  return data
}
