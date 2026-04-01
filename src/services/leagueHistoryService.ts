import { supabase } from '../lib/supabase'

export async function getAllLeagues() {
  const fetchPromise = supabase
    .from('leagues')
    .select('*')
    .order('created_at', { ascending: false })

  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('All Leagues History Fetch Timeout')), 8000)
  )

  const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any

  if (error) throw error
  return data
}

export async function getLeagueStats(leagueId: string) {
  const fetchPromise = supabase
    .from('league_leaderboard')
    .select('*')
    .eq('league_id', leagueId)
    .order('points', { ascending: false })

  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('League Stats Fetch Timeout')), 8000)
  )

  const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any

  if (error) throw error
  
  // Map to camelCase and ensure PPG exists
  return (data || []).map((p: any) => ({
    ...p,
    playerId: p.player_id || p.id,
    gamesPlayed: p.games_played || 0,
    points: p.points || p.totalPoints || p.total_points || 0,
    totalPoints: p.points || p.total_points || 0,
    bonusPoints: p.bonus_points || 0,
    noShows: p.no_shows || 0,
    clutchWins: p.clutch_wins || 0,
    bagelsGiven: p.bagels_given || 0,
    ppg: p.ppg || (p.games_played > 0 ? (p.points || p.total_points || 0) / p.games_played : 0)
  }))
}
