import { supabase } from '../lib/supabase'
import { getActiveLeague } from './leagueService'

// Simple cache for leaderboard
let leaderboardCache: any = null
let lastFetch: number | null = null
const CACHE_TTL = 60000 // 1 minute

/**
 * Get leaderboard (with cache)
 */
export async function getLeaderboard(forceRefresh = false) {
  const now = Date.now()
  
  if (!forceRefresh && leaderboardCache && lastFetch && (now - lastFetch) < CACHE_TTL) {
    return leaderboardCache
  }

  const league = await getActiveLeague().catch(() => null)
  if (!league) return []
  
  const fetchPromise = supabase
    .from('league_leaderboard')
    .select('*')
    .eq('league_id', league.id)
    .order('points', { ascending: false })

  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Leaderboard Fetch Timeout')), 15000)
  )

  const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any

  if (error) {
    console.error('Error fetching leaderboard:', error)
    throw error
  }

  // Map to camelCase and ensure PPG exists
  const mappedData = (data || []).map((p: any) => ({
    ...p,
    playerId: p.player_id,
    gamesPlayed: p.games_played || 0,
    points: p.points || p.totalPoints || p.total_points || 0,
    totalPoints: p.points || p.total_points || 0,
    bonusPoints: p.bonus_points || 0,
    noShows: p.no_shows || 0,
    clutchWins: p.clutch_wins || 0,
    bagelsGiven: p.bagels_given || 0,
    ppg: p.ppg || (p.games_played > 0 ? (p.points || p.total_points || 0) / p.games_played : 0)
  }))

  // Deduplicate by player_id
  const uniqueData = mappedData.filter((v, i, a) => a.findIndex(t => t.player_id === v.player_id) === i);

  leaderboardCache = uniqueData
  lastFetch = now
  return uniqueData
}

/**
 * Clear leaderboard cache (call after new match)
 */
export function clearLeaderboardCache() {
  leaderboardCache = null
  lastFetch = null
}

/**
 * Get all matches for a specific league
 */
export async function getLeagueMatches(leagueId: string) {
  const fetchPromise = supabase
    .from('matches')
    .select('id, league_id, day_id, court_id, round, team_a, team_b, score_a, score_b, is_completed, type, status, no_show_player_ids, is_forfeit, order_index, events, highlights, pod_id, cycle_index, is_custom, timestamp')
    .eq('league_id', leagueId)
    .order('created_at', { ascending: true });

  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('League Matches Fetch Timeout')), 15000)
  )

  const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any

  if (error) {
    console.error('Error fetching league matches:', error);
    throw error;
  }

  return (data || []).map((m: any) => ({
    ...m,
    leagueId: m.league_id,
    dayId: m.day_id,
    courtId: m.court_id,
    scoreA: m.score_a,
    scoreB: m.score_b,
    isCompleted: m.is_completed,
    noShowPlayerIds: m.no_show_player_ids,
    isForfeit: m.is_forfeit,
    orderIndex: m.order_index,
    podId: m.pod_id,
    cycleIndex: m.cycle_index,
    isCustom: m.is_custom || (m.events && Array.isArray(m.events) && m.events.some((e: any) => e.type === 'custom_marker')) || false,
    timestamp: m.timestamp
  }));
}

/**
 * Get recent matches
 */
export async function getRecentMatches(leagueId?: string, limit = 10) {
  let targetLeagueId = leagueId;
  
  if (!targetLeagueId) {
    const league = await getActiveLeague().catch(() => null);
    if (!league) return [];
    targetLeagueId = league.id;
  }
  
  const fetchPromise = supabase
    .from('recent_matches')
    .select('*')
    .eq('league_id', targetLeagueId)
    .order('created_at', { ascending: false })
    .limit(limit);

  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Recent Matches Fetch Timeout')), 15000)
  )

  const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any

  if (error) {
    console.error('Error fetching recent matches:', error);
    throw error;
  }

  return data;
}

/**
 * Get player stats
 */
export async function getPlayerStats(playerName: string) {
  const { data, error } = await supabase
    .from('league_leaderboard')
    .select('*')
    .eq('name', playerName)
    .single()

  if (error) {
    console.error('Error fetching player stats:', error)
    throw error
  }

  return data
}

/**
 * Get head-to-head between two players
 */
export async function getHeadToHead(player1: string, player2: string) {
  const { data, error } = await supabase
    .rpc('get_head_to_head', {
      p_player1: player1,
      p_player2: player2
    })

  return data
}

/**
 * Get all players
 */
export async function getPlayers() {
  const fetchPromise = supabase
    .from('players')
    .select('*')
    .order('name', { ascending: true })

  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Players Fetch Timeout')), 15000)
  )

  const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any

  if (error) {
    console.error('Error fetching players:', error)
    throw error
  }

  // Map to camelCase and ensure stats structure
  const mapped = (data || []).map((p: any) => ({
    ...p,
    id: p.id,
    name: p.name,
    skill: p.skill,
    gamesPlayed: p.games_played || 0,
    wins: p.wins || 0,
    losses: p.losses || 0,
    currentStreak: p.current_streak || 0,
    clutchWins: p.clutch_wins || 0,
    bagelsGiven: p.bagels_given || 0,
    totalPoints: p.points || p.total_points || 0,
    bonusPoints: p.bonus_points || 0,
    noShows: p.no_shows || 0,
    dragonBalls: p.dragon_balls || p.stats?.dragonBalls || 0,
    elo: p.stats?.elo || 1200,
    duprRating: p.stats?.duprRating || null,
    isPresent: p.stats?.isPresent ?? true,
    badges: p.badges || [],
    stats: p.stats || {
      wins: p.wins || 0,
      losses: p.losses || 0,
      currentStreak: p.current_streak || 0,
      clutchWins: p.clutch_wins || 0,
      bagelsGiven: p.bagels_given || 0,
      totalPoints: p.points || p.total_points || 0,
      bonusPoints: p.bonus_points || 0,
      noShows: p.no_shows || 0,
      singles: { wins: 0, losses: 0, currentStreak: 0 },
      doubles: { wins: 0, losses: 0, currentStreak: 0 }
    }
  }))

  // Deduplicate by id
  return mapped.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
}
