import { supabase } from '../lib/supabase'

let cachedLeague: any = null
let leagueFetchedAt: number | null = null
const LEAGUE_TTL = 300000 // 5 minutes

/**
 * Get the currently active league (with caching)
 */
export async function getActiveLeague(forceRefresh = false) {
  const now = Date.now()
  
  if (!forceRefresh && cachedLeague && leagueFetchedAt && (now - leagueFetchedAt) < LEAGUE_TTL) {
    return cachedLeague
  }

  const fetchPromise = supabase
    .from('leagues')
    .select('*')
    .eq('status', 'active')
    .single()

  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('League Fetch Timeout')), 15000)
  )

  const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('No active league found. Please activate a league.')
    }
    throw error
  }

  cachedLeague = data
  leagueFetchedAt = now
  return data
}

/**
 * Clear league cache (call after admin actions)
 */
export function clearLeagueCache() {
  cachedLeague = null
  leagueFetchedAt = null
}

/**
 * Get all leagues
 */
export async function getAllLeagues() {
  const fetchPromise = supabase
    .from('leagues')
    .select('*')
    .order('created_at', { ascending: false })

  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('All Leagues Fetch Timeout')), 15000)
  )

  const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any

  if (error) throw error
  return data
}

/**
 * Set active league (admin only)
 */
export async function setActiveLeague(leagueId: string) {
  // Step 1: Activate the new league first
  const { error: activateError } = await supabase
    .from('leagues')
    .update({ status: 'active' })
    .eq('id', leagueId)

  if (activateError) throw activateError

  // Step 2: Set all other active leagues to completed
  const { error: completeError } = await supabase
    .from('leagues')
    .update({ status: 'completed' })
    .neq('id', leagueId)
    .eq('status', 'active')

  if (completeError) throw completeError

  // Clear cache
  clearLeagueCache()
  
  // Return the newly activated league
  return getActiveLeague(true)
}

/**
 * Upsert multiple leagues
 */
export async function upsertLeagues(leagues: any[]) {
  const { data, error } = await supabase
    .from('leagues')
    .upsert(leagues.map(l => ({
      id: l.id,
      name: l.name,
      status: l.status,
      start_date: l.startDate ? new Date(l.startDate).toISOString() : null,
      weeks: l.weeks || 0,
      days_per_week: l.daysPerWeek || 0,
      players: l.players || [],
      days: l.days || [],
      matches: l.matches || [],
      final_standings: l.finalStandings || []
    })), { onConflict: 'id' })

  return data
}

/**
 * Delete a league (admin only)
 */
export async function deleteLeague(leagueId: string) {
  const { error } = await supabase
    .from('leagues')
    .delete()
    .eq('id', leagueId)

  if (error) throw error
  
  // Also delete matches for this league
  await supabase
    .from('matches')
    .delete()
    .eq('league_id', leagueId)

  clearLeagueCache()
}
