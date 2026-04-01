import React, { useState, useEffect } from 'react'
import { getPlayerProfile } from '../services/playerProfileService'

interface PlayerProfileProps {
  playerId: string;
}

const PlayerProfile: React.FC<PlayerProfileProps> = ({ playerId }) => {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPlayerProfile(playerId)
      .then(setProfile)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [playerId])

  if (loading) return <div className="p-8 text-center text-zinc-500 font-mono animate-pulse">LOADING PROFILE...</div>
  if (!profile) return <div className="p-8 text-center text-red-500 font-mono">PLAYER NOT FOUND</div>

  const { player, stats, recentMatches } = profile
  const winRate = stats.totalMatches > 0 
    ? ((stats.wins / stats.totalMatches) * 100).toFixed(1)
    : 0

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-aura-purple/20 rounded-full flex items-center justify-center border border-aura-purple/30">
          <span className="text-2xl font-black italic text-aura-purple">{player.name[0]}</span>
        </div>
        <div>
          <h1 className="text-3xl font-black italic text-white uppercase tracking-tighter">{player.name}</h1>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Player Profile</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900/50 border border-white/5 p-4 rounded-2xl">
          <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-1">Matches</p>
          <p className="text-2xl font-black italic text-white">{stats.totalMatches}</p>
        </div>
        <div className="bg-zinc-900/50 border border-white/5 p-4 rounded-2xl">
          <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-1">Wins</p>
          <p className="text-2xl font-black italic text-green-500">{stats.wins}</p>
        </div>
        <div className="bg-zinc-900/50 border border-white/5 p-4 rounded-2xl">
          <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-1">Losses</p>
          <p className="text-2xl font-black italic text-red-500">{stats.losses}</p>
        </div>
        <div className="bg-zinc-900/50 border border-white/5 p-4 rounded-2xl">
          <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-1">Win Rate</p>
          <p className="text-2xl font-black italic text-aura-purple">{winRate}%</p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-black italic text-zinc-400 uppercase tracking-widest">Recent Matches</h2>
        <div className="space-y-2">
          {recentMatches.map((match: any) => (
            <div key={match.id} className="bg-zinc-900/30 border border-white/5 p-4 rounded-xl flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs font-bold text-white uppercase tracking-tight">
                  {match.players.map((p: any) => p.player_name).join(' vs ')}
                </div>
                <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                  {new Date(match.recorded_at).toLocaleDateString()}
                </div>
              </div>
              <div className="text-lg font-black italic text-aura-purple">
                {match.score_team1} - {match.score_team2}
              </div>
            </div>
          ))}
          {recentMatches.length === 0 && (
            <div className="text-center py-8 text-zinc-600 text-xs font-bold uppercase tracking-widest">
              No recent matches found
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PlayerProfile;
