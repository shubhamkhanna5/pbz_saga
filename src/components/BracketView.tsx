
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LeagueDay, Player, LeagueMatch } from '../types';
import { MATCH_RULES } from '../utils/rules';
import { IconZap, IconCheck, IconSettings, IconMinus, IconPlus } from './ui/Icons';
import { getBattleState, BattleState } from '../utils/godMode';
import { formatPlayerName } from '../utils/storage';
import { MATCH_CONFIG } from '../utils/leagueConfig';

interface BracketViewProps {
  day: LeagueDay;
  players: Player[];
  onScoreMatch: (dayId: string, matchId: string) => void;
  onManageMatch: (dayId: string, matchId: string) => void;
  isAdmin?: boolean;
}

const BattleBadge: React.FC<{ state: BattleState | 'walkover' | 'cancelled' | 'live' }> = ({ state }) => {
  const map: Record<string, { label: string, class: string }> = {
    charging: {
      label: "LOCKED",
      class: "bg-zinc-900 text-zinc-700 border-2 border-zinc-800"
    },
    engaged: {
      label: "READY",
      class: "bg-zinc-800 text-zinc-300 border-2 border-zinc-700"
    },
    live: {
      label: "● LIVE",
      class: "bg-red-900/20 text-red-500 border-2 border-red-500/50 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.4)]"
    },
    resolved: {
      label: "COMPLETE",
      class: "bg-aura-purple/20 text-aura-magenta border-2 border-aura-purple/50"
    },
    walkover: {
      label: "WALKOVER",
      class: "bg-aura-purple/10 text-aura-purple border-2 border-aura-purple/30"
    },
    cancelled: {
      label: "VOID",
      class: "bg-zinc-900 text-zinc-500 border-2 border-zinc-800"
    }
  };

  return (
    <div className={`px-2.5 py-1 rounded-xl text-[9px] font-black tracking-widest uppercase italic ${map[state]?.class || map.charging.class}`}>
      {map[state]?.label || "UNKNOWN"}
    </div>
  );
};

const BracketView: React.FC<BracketViewProps> = ({ day, players, onScoreMatch, onManageMatch, isAdmin }) => {
  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || 'Unknown';

  // Sort matches by orderIndex (Soft Order)
  const sortedMatches = [...day.matches].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

  const isCustom = (m: LeagueMatch) => m.isCustom || (m as any).is_custom || (m.events && Array.isArray(m.events) && m.events.some((e: any) => e.type === 'custom_marker'));

  // Separate Queue (Pending) from History (Completed)
  const activeQueue = sortedMatches.filter(m => {
    if (!isAdmin && isCustom(m)) return false;
    return m.status === 'scheduled';
  });
  const history = sortedMatches.filter(m => {
    if (!isAdmin && isCustom(m)) return false;
    return m.status !== 'scheduled';
  });

  const completedCount = history.length;
  
  const renderTeamPills = (teamIds: string[], align: 'left' | 'right', isWinner: boolean) => (
    <div className={`flex flex-wrap gap-1 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
      {teamIds.map(id => {
         const name = getPlayerName(id);
         return (
           <span 
              key={id} 
              className={`px-2 py-1 rounded-md text-[10px] sm:text-xs font-black italic uppercase leading-tight break-words whitespace-normal max-w-full text-center ${isWinner ? 'bg-aura-gold/20 text-aura-gold' : 'bg-zinc-800 text-zinc-300'}`}
           >
             {formatPlayerName(name)}
           </span>
         )
      })}
    </div>
  );

  const renderMatchCard = (match: LeagueMatch, isHistory: boolean) => {
    const isComplete = match.isCompleted;
    const isLive = !isComplete && ((match.scoreA || 0) > 0 || (match.scoreB || 0) > 0);
    
    let state: any = 'charging'; 
    if (match.status === 'walkover') state = 'walkover';
    else if (match.status === 'cancelled') state = 'cancelled';
    else if (isComplete) state = 'resolved';
    else if (isLive) state = 'live';
    else state = 'engaged';

    const canInteract = !isComplete && match.status !== 'cancelled';

    const isCustomMatch = match.isCustom || 
                         (match as any).is_custom || 
                         (match.events && Array.isArray(match.events) && match.events.some((e: any) => e.type === 'custom_marker')) ||
                         (typeof match.events === 'string' && (match.events as string).includes('custom_marker'));

    return (
        <motion.div 
          key={match.id}
          layout
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          whileHover={canInteract ? { scale: 1.02, y: -4 } : {}}
          whileTap={canInteract ? { scale: 0.98 } : {}}
          onClick={() => canInteract && onScoreMatch(day.id, match.id)}
          className={`relative p-6 rounded-[2rem] border-2 transition-all duration-300 group ${
            state === 'walkover' || state === 'cancelled'
            ? 'bg-zinc-950 border-zinc-800 opacity-80'
            : isComplete 
                ? 'bg-zinc-950 border-aura-purple/30 shadow-inner opacity-70 hover:opacity-100' 
                : isLive
                    ? 'bg-zinc-900 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.1)]'
                    : canInteract 
                        ? 'bg-zinc-900 border-zinc-800 hover:border-primary cursor-pointer hover:bg-zinc-800' 
                        : 'bg-zinc-950 border-zinc-900/50'
          }`}
        >
          <div className="flex justify-between items-center mb-5">
             <div className="flex items-center gap-2">
                 <span className={`text-[9px] font-black uppercase tracking-widest bg-black/50 px-3 py-1 rounded-xl border border-white/5 ${isCustomMatch ? 'text-hype-500 border-hype-500/30 bg-hype-500/5' : 'text-zinc-600'}`}>
                   {isCustomMatch ? (
                     'CUSTOM MATCH'
                   ) : match.podId ? (
                     `${match.cycleIndex && match.cycleIndex > 0 ? 'SWAPPED ' : ''}${match.podId.toUpperCase()} MATCHES`
                   ) : (
                     `COURT ${match.courtId} • ${match.type} • ROUND ${match.round}`
                   )}
                 </span>
                 {match.isAdminOverride && (
                     <span className="text-[8px] font-black bg-red-900/30 text-red-500 px-2 py-1 rounded border border-red-500/20">
                         OVERRIDE
                     </span>
                 )}
             </div>
             <BattleBadge state={state} />
          </div>

          <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                  {renderTeamPills(match.teamA, 'left', isComplete && (match.scoreA || 0) > (match.scoreB || 0))}
              </div>
              
              <div className="shrink-0 flex items-center pt-1">
                  {isComplete && match.status === 'completed' ? (
                      <div className="px-4 py-2 bg-zinc-950 border-2 border-white/5 rounded-2xl text-lg font-black text-white italic transform -skew-x-6">
                          {match.scoreA} <span className="text-zinc-800 font-normal">/</span> {match.scoreB}
                      </div>
                  ) : isLive ? (
                      <div className="text-[12px] font-black text-red-500 italic uppercase transform -skew-x-12 px-2 py-1 border border-red-500/30 rounded bg-red-900/10 animate-pulse">
                         {match.scoreA} - {match.scoreB}
                      </div>
                  ) : (
                      <div className="text-[12px] font-black text-zinc-800 italic uppercase transform -skew-x-12 px-2 py-1 border border-zinc-900 rounded">VS</div>
                  )}
              </div>

              <div className="flex-1 min-w-0">
                  {renderTeamPills(match.teamB, 'right', isComplete && (match.scoreB || 0) > (match.scoreA || 0))}
              </div>
          </div>
          
          {isComplete && (match.scoreA === 0 || match.scoreB === 0) && match.status === 'completed' && (
             <div className="absolute right-4 -top-3">
                 <div className="bg-aura-red text-white text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg shadow-lg rotate-6 animate-pulse">
                    DESTRUCTO DISC
                 </div>
             </div>
          )}
          
          <button
            onClick={(e) => {
                e.stopPropagation();
                onManageMatch(day.id, match.id);
            }}
            className="absolute top-4 right-4 p-2 bg-zinc-900/80 rounded-full text-zinc-600 hover:text-white border border-transparent hover:border-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
          >
              <IconSettings size={14} />
          </button>
        </motion.div>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8"
    >
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex justify-between items-center bg-zinc-900/40 p-6 rounded-[2.5rem] border-2 border-white/5 shadow-2xl relative overflow-hidden backdrop-blur-xl"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full pointer-events-none"></div>
        <div className="absolute -bottom-4 -left-4 p-4 opacity-5 pointer-events-none rotate-12">
            <IconZap size={100} className="text-white" />
        </div>
        <div className="relative z-10">
           <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter drop-shadow-md">
             {day.matches[0]?.podId ? 'POD SAGA' : `CHAPTER ${day.day}`}: HYBRID CLASH
           </h3>
           <p className="text-[10px] text-aura-gold font-black uppercase tracking-[0.3em] mt-1 italic">
             WEEK {day.week} • MATCHES {completedCount} / {day.matches.length}
           </p>
        </div>
      </motion.div>

      <div className="space-y-8">
          {/* Active / Pending Queue */}
          <div className="space-y-4">
              <div className="flex items-center gap-4 px-2">
                 <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] animate-pulse">LIVE OPERATIONS</span>
                 <div className="h-px flex-1 bg-gradient-to-r from-primary/50 to-transparent"></div>
              </div>
              
              {activeQueue.length === 0 && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-8 bg-zinc-900/20 rounded-[2rem] border-2 border-dashed border-zinc-800"
                  >
                      <p className="text-zinc-600 font-black uppercase text-[10px] tracking-widest italic">All scheduled matches complete</p>
                  </motion.div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AnimatePresence mode="popLayout">
                  {activeQueue.map(m => renderMatchCard(m, false))}
                </AnimatePresence>
              </div>
          </div>

          {/* Completed History (All matches, including custom) */}
          {history.length > 0 && (
              <div className="space-y-4 pt-4">
                  <div className="flex items-center gap-4 px-2">
                     <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">BATTLE LOG</span>
                     <div className="h-px flex-1 bg-zinc-800"></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 opacity-80">
                    <AnimatePresence mode="popLayout">
                      {history.map(m => renderMatchCard(m, true))}
                    </AnimatePresence>
                  </div>
              </div>
          )}
      </div>
    </motion.div>
  );
};

export default BracketView;
