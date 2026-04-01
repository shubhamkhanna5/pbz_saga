
import React from 'react';
import { BADGE_DEFINITIONS, BadgeId } from "../utils/badges";

interface BadgeChipProps {
    badgeId: string; // string to allow flexible keys, but usually BadgeId
    earnedAt?: number;
    sagaName?: string;
}

export const BadgeChip: React.FC<BadgeChipProps> = ({ badgeId, earnedAt, sagaName }) => {
  const def = BADGE_DEFINITIONS[badgeId as BadgeId];
  if (!def) return null;

  const tierStyles = {
      normal: "border-zinc-700 bg-zinc-800/50",
      rare: "border-orange-500/50 bg-orange-900/10 shadow-[0_0_10px_rgba(249,115,22,0.1)]",
      seasonal: "border-aura-gold/50 bg-aura-gold/5 shadow-[0_0_15px_rgba(255,215,0,0.1)]"
  };

  return (
    <div className="relative group cursor-default z-10">
      <div className={`px-2 py-1 rounded-lg border text-xs flex items-center gap-1.5 transition-transform hover:scale-105 ${tierStyles[def.tier]}`}>
        <span className="text-sm">{def.icon}</span>
        <span className={`font-black uppercase tracking-wide ${def.color}`}>{def.label}</span>
      </div>

      {/* Tooltip */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        <div className="bg-zinc-950 border border-white/10 rounded-xl p-3 shadow-2xl">
          <p className="text-[10px] text-zinc-300 font-medium leading-relaxed">
            {def.description}
          </p>
          {(earnedAt || sagaName) && (
              <div className="mt-2 pt-2 border-t border-white/5 text-[9px] text-zinc-500 uppercase font-bold">
                  {sagaName && <div className="text-white truncate">{sagaName}</div>}
                  {earnedAt && <div>{new Date(earnedAt).toLocaleDateString()}</div>}
              </div>
          )}
        </div>
        {/* Arrow */}
        <div className="w-2 h-2 bg-zinc-950 border-r border-b border-white/10 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1"></div>
      </div>
    </div>
  );
};
