import React, { useState, useEffect } from 'react'
import { useDialog } from './ui/DialogProvider'
import { getAllLeagues, setActiveLeague, getActiveLeague } from '../services/leagueService'
import { IconCheck, IconPlay, IconActivity } from './ui/Icons'

const LeagueSelector: React.FC = () => {
  const { showAlert } = useDialog()
  const [leagues, setLeagues] = useState<any[]>([])
  const [activeLeague, setActiveLeagueState] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      getAllLeagues(),
      getActiveLeague()
    ]).then(([allLeagues, active]) => {
      setLeagues(allLeagues)
      setActiveLeagueState(active)
      setLoading(false)
    }).catch(console.error)
  }, [])

  const handleActivate = async (leagueId: string) => {
    setActionLoading(leagueId)
    try {
      const activated = await setActiveLeague(leagueId)
      setActiveLeagueState(activated)
      // Refresh all leagues to update statuses
      const allLeagues = await getAllLeagues()
      setLeagues(allLeagues)
      showAlert(`League "${activated.name}" is now active`)
    } catch (error) {
      console.error(error)
      showAlert('Failed to activate league')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) return <div className="p-8 text-center text-zinc-500 font-mono animate-pulse">LOADING LEAGUES...</div>

  return (
    <div className="p-6 space-y-8 max-w-2xl mx-auto">
      <div className="space-y-2">
        <h2 className="text-xl font-black italic text-white uppercase tracking-tighter">League Management</h2>
        <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Active League: <span className="text-aura-purple">{activeLeague?.name || 'NONE'}</span></p>
      </div>
      
      <div className="space-y-3">
        <h3 className="text-[10px] font-black italic text-zinc-400 uppercase tracking-widest">All Available Sagas</h3>
        <div className="space-y-2">
          {leagues.map(league => (
            <div key={league.id} className={`bg-zinc-900/50 border ${league.status === 'active' ? 'border-aura-purple/50' : 'border-white/5'} p-4 rounded-2xl flex items-center justify-between transition-all`}>
              <div className="space-y-1">
                <div className="text-sm font-black italic text-white uppercase tracking-tight flex items-center gap-2">
                  {league.name}
                  {league.status === 'active' && (
                    <span className="bg-aura-purple/20 text-aura-purple text-[8px] px-1.5 py-0.5 rounded-full border border-aura-purple/30 animate-pulse">ACTIVE</span>
                  )}
                </div>
                <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                  Status: {league.status}
                </div>
              </div>
              
              {league.status !== 'active' && (
                <button 
                  onClick={() => handleActivate(league.id)}
                  disabled={!!actionLoading}
                  className="bg-zinc-800 hover:bg-aura-purple hover:text-white text-zinc-400 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full transition-all flex items-center gap-2"
                >
                  {actionLoading === league.id ? (
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <IconPlay size={12} />
                  )}
                  ACTIVATE
                </button>
              )}
              {league.status === 'active' && (
                <div className="text-aura-purple p-2">
                  <IconCheck size={20} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default LeagueSelector;
