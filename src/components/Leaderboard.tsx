import React, { useState } from 'react';
import { Player } from '../types';
import { IconTrophy, IconX, IconClock, IconZap } from './ui/Icons';
import { calculatePowerLevel } from '../utils/godMode';

interface LeaderboardProps {
  players: Player[];
  onClose: () => void;
  trophyHolderId?: string;
  seasonHistory: any[];
}

const Leaderboard: React.FC<LeaderboardProps> = ({ players, onClose, trophyHolderId, seasonHistory }) => {
  const [view, setView] = useState<'legends' | 'shame' | 'history'>('legends');

  const activePlayers = players.filter(p => ((p.wins ?? p.stats?.wins ?? 0) + (p.losses ?? p.stats?.losses ?? 0)) > 0);

  const getPower = (p: Player) => calculatePowerLevel(p.stats || p);

  const sortedPlayers = [...activePlayers].sort((a, b) => {
    if (view === 'legends') {
      return getPower(b) - getPower(a);
    } else {
      // Shame sorting: Losses descending
      return (b.losses ?? b.stats?.losses ?? 0) - (a.losses ?? a.stats?.losses ?? 0);
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-in fade-in zoom-in duration-300 backdrop-blur-xl">
      <div className="w-full max-w-md dbz-card bg-surface/95 rounded-[2.5rem] overflow-hidden border-2 border-primary/20 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col max-h-[85vh] relative manga-shadow">
        
        {/* Scouter Overlay Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none z-0"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent"></div>

        {/* Header */}
        <div className="p-6 border-b border-outline/10 flex justify-between items-center shrink-0 bg-surface-variant/30 relative z-10">
          <h2 className={`text-3xl font-headline font-black italic tracking-tighter uppercase transform -skew-x-12 transition-all duration-500 drop-shadow-md ${view === 'shame' ? 'text-red-500' : 'text-primary'}`}>
            {view === 'legends' ? 'Warrior Rankings' : view === 'shame' ? 'Defeated' : 'Saga Archives'}
          </h2>
          <button onClick={onClose} className="p-2 text-on-surface-variant/60 hover:text-primary bg-surface-variant/50 rounded-full relative z-20 transition-all hover:scale-110 active:scale-90 border border-outline/10"><IconX size={24} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-outline/10 bg-surface-variant/20 text-[11px] font-headline font-black uppercase tracking-[0.2em] relative z-10">
          <button onClick={() => setView('legends')} className={`flex-1 py-5 transition-all duration-300 relative group ${view === 'legends' ? 'text-primary' : 'text-on-surface-variant/40 hover:text-on-surface-variant/60'}`}>
            <span className="relative z-10">Power Levels</span>
            {view === 'legends' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary animate-in slide-in-from-left duration-300"></div>}
          </button>
          <button onClick={() => setView('shame')} className={`flex-1 py-5 transition-all duration-300 relative group ${view === 'shame' ? 'text-red-500' : 'text-on-surface-variant/40 hover:text-on-surface-variant/60'}`}>
            <span className="relative z-10">Casualties</span>
            {view === 'shame' && <div className="absolute bottom-0 left-0 w-full h-1 bg-red-500 animate-in slide-in-from-left duration-300"></div>}
          </button>
          <button onClick={() => setView('history')} className={`flex-1 py-5 transition-all duration-300 relative group ${view === 'history' ? 'text-secondary' : 'text-on-surface-variant/40 hover:text-on-surface-variant/60'}`}>
            <span className="relative z-10">Sagas</span>
            {view === 'history' && <div className="absolute bottom-0 left-0 w-full h-1 bg-secondary animate-in slide-in-from-left duration-300"></div>}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar bg-transparent relative z-10">
          {view === 'history' ? (
              <div className="p-6 space-y-6">
                  {seasonHistory.map(s => (
                      <div key={s.seasonNumber} className="bg-surface-variant/30 p-5 rounded-2xl border border-outline/10 flex justify-between items-center transition-all hover:border-primary/30 group manga-shadow">
                          <div>
                              <div className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em]">Saga {s.seasonNumber}</div>
                              <div className="text-xl font-headline font-black text-on-surface italic group-hover:text-primary transition-colors transform -skew-x-6">{s.seasonName}</div>
                          </div>
                          <div className="text-right">
                              <div className="text-[9px] font-black text-primary uppercase tracking-widest">Champion</div>
                              <div className="text-base font-headline font-black text-on-surface transform -skew-x-6">{players.find(p => p.id === s.winnerId)?.name}</div>
                          </div>
                      </div>
                  ))}
                  <div className="p-6 bg-primary/5 rounded-2xl border-2 border-dashed border-primary/20 text-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-primary/5 animate-pulse"></div>
                      <IconClock size={24} className="mx-auto text-primary mb-3 relative z-10" />
                      <p className="text-[11px] font-headline font-black text-primary uppercase tracking-[0.3em] relative z-10 transform -skew-x-12">Current Arc: The Saga Continues</p>
                  </div>
              </div>
          ) : (
            <div className="relative">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-variant/50 sticky top-0 border-b border-outline/10 text-[10px] font-headline font-black uppercase text-on-surface-variant/40 z-20">
                  <tr>
                    <th className="p-5 w-14 text-center">RANK</th>
                    <th className="p-5">WARRIOR</th>
                    <th className="p-5 text-right">{view === 'legends' ? 'ELO' : 'LOSSES'}</th>
                    <th className="p-5 text-right">{view === 'legends' ? 'POWER' : ''}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline/5">
                  {sortedPlayers
                    .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
                    .map((p, idx) => {
                    const power = getPower(p);
                    const elo = p.elo || 1200;
                    const isTop3 = idx < 3 && view === 'legends';
                    const rowClass = isTop3 ? 'bg-primary/5' : '';
                    const rankColor = idx === 0 ? 'text-primary text-2xl' : idx === 1 ? 'text-secondary text-xl' : idx === 2 ? 'text-tertiary-container text-lg' : 'text-on-surface-variant/40 text-base';

                    return (
                      <tr key={p.id} className={`hover:bg-surface-variant/20 transition-all group ${rowClass}`}>
                        <td className={`p-5 text-center font-headline font-black italic transform -skew-x-12 ${rankColor}`}>{idx + 1}</td>
                        <td className="p-5">
                          <div className="flex items-center gap-3">
                            <span className={`font-headline font-black italic uppercase tracking-tight transform -skew-x-6 text-lg ${isTop3 ? 'text-on-surface' : 'text-on-surface-variant/60'}`}>{p.name}</span>
                            {p.id === trophyHolderId && <IconTrophy size={16} className="text-primary animate-pulse drop-shadow-[0_0_8px_rgba(255,140,0,0.5)]" />}
                            {(p.currentStreak ?? p.stats?.currentStreak ?? 0) >= 3 && <IconZap size={14} className="text-secondary animate-bounce" />}
                          </div>
                          <div className="text-[9px] font-mono text-on-surface-variant/40 uppercase mt-1">
                             Battle Eff: {(((p.wins ?? p.stats?.wins ?? 0) / ((p.wins ?? p.stats?.wins ?? 0) + (p.losses ?? p.stats?.losses ?? 0) || 1)) * 100).toFixed(0)}% • {p.wins ?? p.stats?.wins ?? 0}W-{p.losses ?? p.stats?.losses ?? 0}L
                          </div>
                        </td>
                        <td className={`p-5 text-right font-mono font-bold ${view === 'legends' ? 'text-primary' : 'text-red-500'}`}>
                          {view === 'legends' ? elo : (p.losses ?? p.stats?.losses ?? 0)}
                        </td>
                        <td className="p-5 text-right">
                          {view === 'legends' && (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                              <span className="text-xs font-black text-primary font-mono">{power.toLocaleString()}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;