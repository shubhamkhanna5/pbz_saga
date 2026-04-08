import { supabase } from '../lib/supabase'
import { Tournament } from '../types'

/**
 * Upsert a tournament
 */
export async function upsertTournaments(tournaments: Tournament[]) {
  if (!tournaments || tournaments.length === 0) return null;

  const { data, error } = await supabase
    .from('tournaments')
    .upsert(tournaments.map(t => ({
      id: t.id,
      name: t.name,
      date: new Date(t.date).toISOString(),
      status: t.status,
      stage: t.stage,
      match_type: t.matchType,
      team_mode: t.teamMode,
      groups: t.groups || [],
      format: t.format || 'round_robin',
      courts: t.courts || 1,
      players: t.players || [],
      teams: t.teams || [],
      matches: t.matches || [],
      winner_id: t.winnerId || null
    })), { onConflict: 'id' })

  if (error) {
    console.error('Error upserting tournaments:', error)
    throw error
  }

  return data
}

/**
 * Get all tournaments
 */
export async function getAllTournaments() {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .order('date', { ascending: false })

  if (error) {
    console.error('Error fetching tournaments:', error)
    throw error
  }

  return data
}

/**
 * Get the active tournament
 */
export async function getActiveTournament() {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('status', 'active')
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching active tournament:', error)
    throw error
  }

  return data
}
