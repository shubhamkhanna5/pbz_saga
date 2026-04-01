
import React, { useState, useMemo } from 'react';
import { AppState, Player } from '../types';
import { IconActivity, IconTrophy, IconZap, IconUsers } from './ui/Icons';
import { calculatePowerLevel, getAuraClass } from '../utils/godMode';
import CareerProfileModal from './CareerProfileModal';

interface PlayerStatsHubProps {
  state: AppState;
}

const PlayerStatsHub: React.FC<PlayerStatsHubProps> = ({ state }) => {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [sortMode, setSortMode] = useState<'power' | 'games'>('power');

  // Sorted Players
  const players = useMemo(() => {
    return [...state.players].sort((a, b) => {
      if (sortMode === 'power') {
        return calculatePowerLevel(b.stats) - calculatePowerLevel(a.stats);
      }
      return b.gamesPlayed - a.gamesPlayed;
    });
  }, [state.players, sortMode]);

  const maxPower = useMemo(() => {
    if (state.players.length === 0) return 1000;
    return Math.max(...state.players.map(p => calculatePowerLevel(p.stats)));
  }, [state.players]);

  return (
    <div className="space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-6 duration-700">
      
      {/* Header */}
      <div className="text-center space-y-3 mt-6 relative">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-primary/10 blur-[80px] rounded-full animate-pulse-slow"></div>
         <h2 className="text-5xl font-headline font-black italic tracking-tighter text-on-surface uppercase transform -skew-x-12 drop-shadow-lg relative z-10">
           POWER <span className="text-primary drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]">LEVELS</span>
         </h2>
         <p className="text-primary font-black uppercase text-[11px] tracking-[0.5em] animate-pulse relative z-10">Scouter Data Analysis</p>
      </div>

      {/* Controls */}
      <div className="flex bg-surface-variant/30 p-2 rounded-[2rem] border-2 border-outline/10 manga-skew shadow-xl backdrop-blur-md">
         <button 
            onClick={() => setSortMode('power')}
            className={`flex-1 py-4 rounded-2xl text-[11px] font-headline font-black uppercase tracking-[0.2em] transition-all manga-skew-reverse transform ${sortMode === 'power' ? 'bg-primary text-on-primary shadow-2xl -skew-x-6' : 'text-on-surface-variant hover:text-on-surface'}`}
         >
            <span className={sortMode === 'power' ? 'skew-x-6 block' : ''}>Power Level</span>
         </button>
         <button 
            onClick={() => setSortMode('games')}
            className={`flex-1 py-4 rounded-2xl text-[11px] font-headline font-black uppercase tracking-[0.2em] transition-all manga-skew-reverse transform ${sortMode === 'games' ? 'bg-secondary text-on-secondary shadow-2xl -skew-x-6' : 'text-on-surface-variant hover:text-on-surface'}`}
         >
            <span className={sortMode === 'games' ? 'skew-x-6 block' : ''}>Experience</span>
         </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-6">
         {players
            .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
            .map((p, idx) => {
            const power = calculatePowerLevel(p.stats);
            const aura = getAuraClass(p);
            const powerPercent = Math.min(100, (power / maxPower) * 100);
            
            return (
               <div 
                  key={p.id}
                  onClick={() => setSelectedPlayer(p)}
                  className="dbz-card p-6 flex flex-col gap-5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all manga-shadow relative overflow-hidden group border-primary/10 hover:border-primary/40"
               >
                  {/* Rank Badge */}
                  <div className="absolute top-0 left-0 bg-primary text-on-primary text-[11px] font-black px-4 py-1.5 rounded-br-2xl z-20 shadow-lg transform -skew-x-12 -translate-x-1">
                    <span className="skew-x-12 block">#{idx + 1}</span>
                  </div>

                  {/* Background Glow */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 -translate-y-16 translate-x-16 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors"></div>

                  <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-5">
                          <div className={`w-14 h-14 rounded-[1.25rem] bg-surface-variant/50 flex items-center justify-center text-3xl border-2 border-outline/10 transition-all group-hover:border-primary/50 ${aura ? 'aura-glow border-primary shadow-[0_0_20px_rgba(168,85,247,0.4)]' : ''}`}>
                            <span className="group-hover:scale-110 transition-transform">{p.avatar || '🥋'}</span>
                          </div>
                          <div>
                              <div className="font-headline font-black text-on-surface italic text-xl uppercase tracking-tight transform -skew-x-6 group-hover:text-primary transition-colors">{p.name}</div>
                              <div className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em] flex items-center gap-2 mt-1">
                                  <IconActivity size={12} className="text-primary/40" /> {p.gamesPlayed} Battles
                              </div>
                          </div>
                      </div>
                      
                      <div className="text-right">
                          <div className="text-3xl font-headline font-black text-primary italic tracking-tighter drop-shadow-md group-hover:scale-110 transition-transform origin-right">{power.toLocaleString()}</div>
                          <div className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-[0.3em] mt-0.5">Power Level</div>
                      </div>
                  </div>

                  {/* Power Bar */}
                  <div className="space-y-2 relative z-10">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">
                      <span className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                        Aura Intensity
                      </span>
                      <span className="text-primary font-mono">{powerPercent.toFixed(0)}%</span>
                    </div>
                    <div className="h-2.5 bg-surface-variant/30 rounded-full overflow-hidden border border-outline/5 p-0.5">
                      <div 
                        className="h-full bg-gradient-to-r from-primary via-secondary to-primary rounded-full transition-all duration-1000 ease-out relative"
                        style={{ width: `${powerPercent}%` }}
                      >
                        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                      </div>
                    </div>
                  </div>
               </div>
            );
         })}
      </div>

      {selectedPlayer && (
         <CareerProfileModal 
            player={selectedPlayer}
            state={state}
            onClose={() => setSelectedPlayer(null)}
         />
      )}
    </div>
  );
};

export default PlayerStatsHub;
