import { supabase } from '../lib/supabase'

/**
 * Get all players (for dropdowns)
 */
export async function getAllPlayers() {
  const { data, error } = await supabase
    .from('players')
    .select('id, name')
    .order('name')

  if (error) {
    console.error('Error fetching players:', error)
    throw error
  }

  return data
}

/**
 * Get player by ID
 */
export async function getPlayerById(playerId: string) {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerId)
    .single()

  return data
}

/**
 * Upsert multiple players
 */
export async function upsertPlayers(players: any[]) {
  const { data, error } = await supabase
    .from('players')
    .upsert(players.map(p => ({
      id: p.id,
      name: p.name,
      skill: p.skill,
      games_played: p.gamesPlayed || 0,
      wins: p.wins || p.stats?.wins || 0,
      losses: p.losses || p.stats?.losses || 0,
      current_streak: p.currentStreak || p.stats?.currentStreak || 0,
      clutch_wins: p.clutchWins || p.stats?.clutchWins || 0,
      bagels_given: p.bagelsGiven || p.stats?.bagelsGiven || 0,
      total_points: p.points || p.totalPoints || p.stats?.totalPoints || 0,
      bonus_points: p.bonusPoints || p.stats?.bonusPoints || 0,
      no_shows: p.noShows || p.stats?.noShows || 0,
      dragon_balls: p.dragonBalls || 0,
      badges: p.badges || [],
      stats: {
        ...(p.stats || {}),
        elo: p.elo || 1200,
        dragonBalls: p.dragonBalls || 0,
        duprRating: p.duprRating || null,
        isPresent: p.isPresent ?? true,
        joinedAtDay: p.joinedAtDay,
        isMidSeason: p.isMidSeason,
        lastPartnerId: p.lastPartnerId
      }
    })), { onConflict: 'id' })

  if (error) {
    console.error('Error upserting players:', error)
    throw error
  }

  return data
}

/**
 * Sync full roster (upsert all and delete missing)
 */
export async function syncFullRoster(players: any[]) {
  // 1. Upsert all current players
  await upsertPlayers(players);
  
  // 2. Delete players from Supabase that are not in this list
  const currentPlayerIds = players.map(p => p.id);
  if (currentPlayerIds.length > 0) {
    const { error } = await supabase
      .from('players')
      .delete()
      .filter('id', 'not.in', `(${currentPlayerIds.join(',')})`);
    
    if (error) {
      console.error('Error during roster cleanup:', error);
      // We don't throw here to avoid failing the whole sync if cleanup fails
    }
  }
}

/**
 * Delete a player
 */
export async function deletePlayer(playerId: string) {
  const { error } = await supabase
    .from('players')
    .delete()
    .eq('id', playerId)

  if (error) {
    console.error('Error deleting player:', error)
    throw error
  }
}
