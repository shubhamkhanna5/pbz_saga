import { supabase } from '../lib/supabase'
import { Session } from '../types'

/**
 * Upsert the active session
 */
export async function upsertSession(session: Session | null) {
  if (!session) {
    // We don't delete sessions here, we just don't have an active one
    return null;
  }

  const { data, error } = await supabase
    .from('sessions')
    .upsert({
      id: session.id,
      date: new Date(session.date).toISOString(),
      active_courts: session.activeCourts,
      rotation_type: session.rotationType,
      play_mode: session.playMode,
      team_assignment_mode: session.teamAssignmentMode,
      history: session.history || []
    }, { onConflict: 'id' })

  if (error) {
    console.error('Error upserting session:', error)
    throw error
  }

  return data
}

/**
 * Get the most recent session
 */
export async function getLatestSession() {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .order('date', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching latest session:', error)
    throw error
  }

  return data
}
