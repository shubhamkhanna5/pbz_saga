
import React, { useEffect } from 'react';
import { Game, Player } from '../types';
import { getBattleState, BattleState, getMatchStakes, getPlayerBadges, getAuraClass } from '../utils/godMode';
import { formatPlayerName } from '../utils/storage';
import { IconZap } from './ui/Icons';

interface MatchCardProps {
  game: Game;
  players: Player[];
  onClick?: () => void;
  isFinalBattle?: boolean;
}

const BattleBadge: React.FC<{ state: BattleState }> = ({ state }) => {
  const map = {
    charging: {
      label: "ENERGY CHARGE",
      class: "bg-primary/10 text-primary border-2 border-primary/20 shadow-lg"
    },
    engaged: {
      label: "🔥 BATTLE LIVE",
      class: "bg-primary/20 text-primary border-2 border-primary/40 animate-pulse shadow-[0_0_15px_rgba(255,140,0,0.4)]"
    },
    resolved: {
      label: "KO / DONE",
      class: "bg-surface-variant/30 text-on-surface-variant/40 border-2 border-outline/5"
    }
  };

  return (
    <div className={`px-3 py-1.5 rounded-xl text-[9px] font-black tracking-[0.3em] uppercase transition-all duration-700 manga-skew ${map[state].class}`}>
      <span className="manga-skew-reverse block">{map[state].label}</span>
    </div>
  );
};

const MatchCard: React.FC<MatchCardProps> = ({ game, players, onClick, isFinalBattle }) => {
  const state = getBattleState(game);
  const stakes = getMatchStakes(game, players);
  
  const getPlayer = (id: string) => players.find(p => p.id === id);

  const renderTeam = (rawTeamIds: string[], align: 'left' | 'right') => {
    const teamIds = [...new Set(rawTeamIds)];
    return (
      <div className={`flex flex-wrap gap-2.5 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
        {teamIds.map(id => {
           const p = getPlayer(id);
           if (!p) return null;
           const aura = getAuraClass(p);
           const badges = getPlayerBadges(p, players);
           
           return (
             <div key={id} className={`flex flex-col gap-1.5 ${align === 'right' ? 'items-end' : 'items-start'} max-w-full group/player`}>
               <span className={`inline-block px-4 py-2 rounded-2xl text-sm sm:text-base font-headline font-black italic leading-tight break-words whitespace-normal max-w-full transition-all text-center uppercase tracking-tight transform -skew-x-12 group-hover/player:scale-110 group-hover/player:text-primary ${aura ? 'aura-glow border-2 border-primary shadow-lg text-on-surface bg-surface' : 'bg-surface-variant/20 border-2 border-outline/5 text-on-surface-variant/60'}`}>
                 <span className="skew-x-12 block">{formatPlayerName(p.name)}</span>
               </span>
               <div className={`flex gap-1 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
                  {badges.map((b) => (
                    <span key={b.label} className={`text-[7px] ${b.color} font-black uppercase tracking-widest bg-surface/90 px-1.5 py-0.5 rounded-lg border border-outline/10 shadow-sm`}>
                      {b.icon}
                    </span>
                  ))}
               </div>
             </div>
           );
        })}
      </div>
    );
  };

  return (
    <div
      onClick={onClick}
      className={`
        relative bg-surface border-2 rounded-[2.5rem] p-6 sm:p-8
        cursor-pointer overflow-hidden transition-all duration-700 active:scale-[0.97] shadow-2xl manga-shadow group/card
        ${state === 'charging' ? 'border-primary/20 bg-surface-variant/10' : 'border-outline/5'}
        ${state === 'engaged' ? 'border-primary shadow-[0_0_40px_rgba(255,140,0,0.2)] bg-surface aura-glow' : ''}
        ${state === 'resolved' ? 'border-outline/5 bg-surface-variant/5 opacity-40 grayscale hover:grayscale-0 hover:opacity-100' : ''}
        ${isFinalBattle ? 'border-primary shadow-[0_0_60px_rgba(255,140,0,0.4)]' : ''}
      `}
    >
        {/* Thematic Energy Lines background inside card */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
            <div className="absolute top-0 left-1/3 w-px h-full bg-primary transition-all duration-1000 group-hover/card:left-1/2"></div>
            <div className="absolute top-0 right-1/3 w-px h-full bg-secondary transition-all duration-1000 group-hover/card:right-1/2"></div>
        </div>

        {/* Background Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 blur-[100px] rounded-full -translate-y-24 translate-x-24 group-hover/card:bg-primary/10 transition-colors"></div>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="flex items-center gap-4">
                 <div className="bg-on-surface text-surface text-[10px] font-black uppercase px-3 py-1 rounded-lg italic transition-all duration-700 transform -skew-x-12 shadow-md group-hover/card:bg-primary group-hover/card:text-on-primary">
                    <span className="skew-x-12 block">ARENA {game.courtId}</span>
                 </div>
                 {isFinalBattle && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border-2 border-primary/40 rounded-lg animate-pulse shadow-lg transform -skew-x-12">
                        <IconZap size={12} className="text-primary fill-primary skew-x-12" />
                        <span className="text-[9px] font-black text-primary uppercase tracking-[0.3em] skew-x-12">ULTIMATE SHOWDOWN</span>
                    </div>
                 )}
            </div>
            <BattleBadge state={state} />
        </div>

        {/* Combatants Grid */}
        <div className="flex items-start justify-between gap-2 relative z-10">
            {/* Team A */}
            <div className="flex-1 min-w-0">
                {renderTeam(game.teamA, 'left')}
            </div>

            <div className="flex flex-col items-center shrink-0 px-2 mt-1">
                 <div className="text-sm font-black text-on-surface-variant/30 italic transition-colors duration-500">VS</div>
            </div>

            {/* Team B */}
            <div className="flex-1 min-w-0">
                {renderTeam(game.teamB, 'right')}
            </div>
        </div>

        {/* Match Details Overlay Text */}
        <div className="mt-4 pt-3 border-t border-outline/10 flex justify-between items-center text-[8px] font-black uppercase tracking-[0.3em] transition-colors duration-500">
            <span className={state === 'engaged' ? 'text-primary' : 'text-on-surface-variant/40'}>
                {game.mode === 'singles' ? 'SOLO DUEL' : 'TEAM COMBAT'}
            </span>
            <span className="text-on-surface-variant/40">
                {state === 'engaged' ? 'INTENSE BATTLE' : state === 'resolved' ? 'FIGHT CONCLUDED' : 'WAITING FOR BELL'}
            </span>
        </div>
    </div>
  );
};

export default MatchCard;
