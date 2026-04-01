
import React from 'react';
import { Player, LeagueStanding } from '../types';
import { IconX } from './ui/Icons';
import { computeProfileBadges } from '../utils/godMode';
import { BadgeChip } from './BadgeChip';

interface PlayerProfileModalProps {
  player: Player;
  standing: LeagueStanding;
  onClose: () => void;
}

const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({ player, standing, onClose }) => {
  if (!standing) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 animate-in fade-in zoom-in duration-200 backdrop-blur-sm">
        <div className="w-full max-w-sm bg-zinc-950 rounded-3xl p-8 border border-white/10 text-center space-y-4">
          <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">No League Data</h2>
          <p className="text-xs text-zinc-500 uppercase tracking-widest leading-relaxed">
            This player hasn't participated in the current league yet.
          </p>
          <button 
            onClick={onClose}
            className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-zinc-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const badges = computeProfileBadges(standing);
  
  // Determine Trend
  let trend = '→';
  let trendColor = 'text-zinc-500';
  
  if (standing.ppgHistory && standing.ppgHistory.length >= 2) {
    const last = standing.ppgHistory[standing.ppgHistory.length - 1];
    const prev = standing.ppgHistory[standing.ppgHistory.length - 2];
    if (last > prev) { trend = '↑'; trendColor = 'text-green-500'; }
    if (last < prev) { trend = '↓'; trendColor = 'text-red-500'; }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 animate-in fade-in zoom-in duration-200 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-zinc-950 rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative">
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white bg-zinc-900/50 rounded-full transition-colors z-10"
        >
            <IconX size={20} />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 text-center border-b border-white/5">
            <div className="w-20 h-20 bg-zinc-800 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl shadow-xl border border-white/5">
                {player.name.charAt(0)}
            </div>
            <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter">{player.name}</h2>
            <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-900 px-2 py-1 rounded">
                    Level {standing.points}
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-widest bg-zinc-900 px-2 py-1 rounded flex items-center gap-1 ${trendColor}`}>
                    Trend {trend}
                </span>
            </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 divide-x divide-white/5 border-b border-white/5 bg-zinc-900/30">
            <div className="p-4 text-center">
                <div className="text-xl font-black text-white">{standing.gamesPlayed}</div>
                <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Games</div>
            </div>
            <div className="p-4 text-center">
                <div className="text-xl font-black text-aura-gold">{standing.wins}</div>
                <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Wins</div>
            </div>
            <div className="p-4 text-center">
                <div className="text-xl font-black text-white">{standing.ppg.toFixed(1)}</div>
                <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">PPG</div>
            </div>
        </div>

        {/* Badges Section */}
        <div className="p-6">
            <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4">League Achievements</h3>
            
            {badges.length === 0 ? (
                <div className="text-center p-4 text-zinc-600 text-xs italic">
                    No honors earned in this league.
                </div>
            ) : (
                <div className="flex gap-2 flex-wrap">
                    {badges.map(bId => (
                        <BadgeChip key={bId} badgeId={bId} />
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default PlayerProfileModal;
