
import React from 'react';
import { Player, AppState } from '../types';
import { IconX, IconTrophy, IconActivity } from './ui/Icons';
import { calculateCareerStats } from '../utils/statsLogic';
import { calculatePowerLevel, getPlayerBadges, getAuraClass } from '../utils/godMode';
import { BadgeChip } from './BadgeChip';

interface CareerProfileModalProps {
  player: Player;
  state: AppState;
  onClose: () => void;
}

const CareerProfileModal: React.FC<CareerProfileModalProps> = ({ player, state, onClose }) => {
  const stats = calculateCareerStats(player, state);
  const powerLevel = calculatePowerLevel(player.stats || player);
  const activeTraits = getPlayerBadges(player, state.players);
  const aura = getAuraClass(player);
  const persistentBadges = player.badges || [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 animate-in fade-in zoom-in duration-300 backdrop-blur-md">
      <div className="w-full max-w-sm bg-surface rounded-[2.5rem] overflow-hidden border-2 border-primary/20 shadow-2xl relative flex flex-col max-h-[90vh] manga-shadow">
        <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2.5 text-on-surface-variant/40 hover:text-primary bg-surface-variant/30 rounded-full transition-all z-20 hover:scale-110 active:scale-90"
        >
            <IconX size={20} />
        </button>

        {/* Hero Section */}
        <div className="relative bg-surface-variant/30 p-10 text-center border-b border-outline/10 overflow-hidden">
            {/* Background Glow */}
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-gradient-to-b from-primary/20 to-transparent blur-3xl rounded-full pointer-events-none animate-pulse-slow`} />
            
            <div className={`relative w-28 h-28 mx-auto mb-6 rounded-[2rem] flex items-center justify-center text-5xl font-black shadow-2xl border-4 transition-all transform hover:rotate-6 ${aura ? 'border-primary shadow-primary/20 text-on-surface bg-surface' : 'border-outline/10 bg-surface text-on-surface-variant/20'}`}>
                <span className="transform -skew-x-12 italic">{player.name.charAt(0)}</span>
            </div>
            
            <h2 className="text-4xl font-headline font-black italic text-on-surface uppercase tracking-tighter relative z-10 transform -skew-x-12 drop-shadow-md">{player.name}</h2>
            <div className="flex justify-center items-center gap-3 mt-4 relative z-10">
                <div className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-lg flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                        PL: {powerLevel.toLocaleString()}
                    </span>
                </div>
                <div className="px-3 py-1 bg-surface-variant/50 border border-outline/10 rounded-lg">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60">
                        {stats.overall.winRate} WR
                    </span>
                </div>
            </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar bg-transparent">
            
            {/* Overall Summary */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-surface-variant/20 p-4 rounded-2xl border border-outline/5 text-center manga-shadow group hover:border-primary/30 transition-colors">
                    <div className="text-2xl font-headline font-black text-on-surface italic transform -skew-x-12 group-hover:text-primary transition-colors">{stats.overall.games}</div>
                    <div className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em] mt-1">Games</div>
                </div>
                <div className="bg-surface-variant/20 p-4 rounded-2xl border border-outline/5 text-center manga-shadow group hover:border-primary/30 transition-colors">
                    <div className="text-2xl font-headline font-black text-primary italic transform -skew-x-12 group-hover:scale-110 transition-transform">{stats.overall.wins}</div>
                    <div className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em] mt-1">Wins</div>
                </div>
                <div className="bg-surface-variant/20 p-4 rounded-2xl border border-outline/5 text-center manga-shadow group hover:border-red-500/30 transition-colors">
                    <div className="text-2xl font-headline font-black text-red-500 italic transform -skew-x-12 group-hover:scale-110 transition-transform">{stats.overall.losses}</div>
                    <div className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em] mt-1">Losses</div>
                </div>
            </div>

            {/* Persistent Badges (Hall of Fame) */}
            {persistentBadges.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-3 px-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                        <h3 className="text-[11px] font-black text-primary uppercase tracking-[0.3em]">Hall of Fame Honors</h3>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {persistentBadges.map((b) => (
                            <BadgeChip 
                                key={`${b.badgeId}-${b.earnedAt}`} 
                                badgeId={b.badgeId} 
                                earnedAt={b.earnedAt}
                                sagaName={b.sagaName}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Active Traits (Computed) */}
            {activeTraits.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-3 px-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-secondary"></div>
                        <h3 className="text-[11px] font-black text-on-surface-variant/40 uppercase tracking-[0.3em]">Active Traits</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {activeTraits.map((b) => (
                            <div key={b.label} className="flex items-center gap-3 bg-surface-variant/20 p-3 rounded-2xl border border-outline/5 manga-shadow hover:border-secondary/30 transition-colors group">
                                <span className="text-2xl group-hover:scale-110 transition-transform">{b.icon}</span>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${b.color}`}>{b.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* League Stats */}
            <div className="bg-zinc-900/50 rounded-2xl border border-white/5 overflow-hidden">
                <div className="bg-zinc-900 p-3 flex items-center gap-2 border-b border-white/5">
                    <IconActivity size={14} className="text-primary" />
                    <span className="text-xs font-black text-zinc-300 uppercase tracking-wider">League Career</span>
                </div>
                <div className="grid grid-cols-4 p-4 gap-2 text-center">
                     <div>
                         <div className="text-sm font-black text-white">{stats.league.games}</div>
                         <div className="text-[8px] font-bold text-zinc-600 uppercase">Games</div>
                     </div>
                     <div>
                         <div className="text-sm font-black text-white">{stats.league.points}</div>
                         <div className="text-[8px] font-bold text-zinc-600 uppercase">Pts</div>
                     </div>
                     <div>
                         <div className="text-sm font-black text-primary">{stats.league.ppg}</div>
                         <div className="text-[8px] font-bold text-zinc-600 uppercase">PPG</div>
                     </div>
                     <div>
                         <div className="text-sm font-black text-zinc-400">{stats.league.winRate}</div>
                         <div className="text-[8px] font-bold text-zinc-600 uppercase">Win%</div>
                     </div>
                </div>
            </div>
            
            <div className="text-center text-[9px] text-zinc-600 font-bold uppercase tracking-widest pt-4">
                PickleBallZ Official Record
            </div>
        </div>
      </div>
    </div>
  );
};

export default CareerProfileModal;
