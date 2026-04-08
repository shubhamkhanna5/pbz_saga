import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getLeaderboard, clearLeaderboardCache } from '../services/queryService'

export function useRealtimeLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshLeaderboard = async () => {
    try {
      clearLeaderboardCache()
      
      // Add a timeout to the fetch to prevent hanging
      const fetchPromise = getLeaderboard(true)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Scouter Network Timeout: Connection slow')), 10000)
      )
      
      const data = await Promise.race([fetchPromise, timeoutPromise]) as any[]
      setLeaderboard(data)
      setError(null)
    } catch (err: any) {
      console.error('Error refreshing leaderboard:', err)
      setError(err.message || 'Failed to fetch leaderboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Initial load
    refreshLeaderboard()

    // Subscribe to all match changes (INSERT, UPDATE, DELETE)
    const subscription = supabase
      .channel('matches-channel')
      .on(
        'postgres_changes',
        {
          event: '*', 
          schema: 'public',
          table: 'matches'
        },
        () => {
          // Refresh when matches change
          refreshLeaderboard()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return { leaderboard, loading, error, refreshLeaderboard }
}
