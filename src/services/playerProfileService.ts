import { supabase } from '../lib/supabase'
import { getActiveLeague } from './leagueService'

export async function getPlayerProfile(playerId: string) {
  const league = await getActiveLeague()
  
  // Get player basic info
  const { data: player, error: playerError } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerId)
    .single()
  
  if (playerError) throw playerError

  // Get player's matches with details
  const { data: matches, error: matchesError } = await supabase
    .from('recent_matches')
    .select('*')
    .eq('league_id', league.id)
    .contains('players', [{ player_id: playerId }])
    .limit(20)

  if (matchesError) throw matchesError

  // Calculate stats
  const stats = {
    totalMatches: matches.length,
    wins: matches.filter((m: any) => {
      const playerInMatch = m.players.find((p: any) => p.player_id === playerId)
      return playerInMatch && playerInMatch.team === m.winning_team
    }).length,
    losses: matches.filter((m: any) => {
      const playerInMatch = m.players.find((p: any) => p.player_id === playerId)
      return playerInMatch && playerInMatch.team !== m.winning_team
    }).length
  }

  return { player, stats, recentMatches: matches }
}

export async function getHeadToHead(player1Id: string, player2Id: string) {
  const league = await getActiveLeague()
  
  const { data, error } = await supabase
    .rpc('get_head_to_head', {
      p_player1_id: player1Id,
      p_player2_id: player2Id,
      p_league_id: league.id
    })

  if (error) throw error
  return data
}
