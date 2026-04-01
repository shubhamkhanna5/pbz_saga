import React, { useState } from 'react';
import { LeagueDay, Player } from '../types';
import { IconX, IconTrash, IconCheck, IconAlert } from './ui/Icons';
import { formatPlayerName } from '../utils/storage';
import { vibrate } from '../utils/godMode';

interface DayRosterModalProps {
  day: LeagueDay;
  players: Player[];
  onDrop: (playerId: string) => void;
  onClose: () => void;
}

const DayRosterModal: React.FC<DayRosterModalProps> = ({ day, players, onDrop, onClose }) => {
  const [confirmDropId, setConfirmDropId] = useState<string | null>(null);

  const getPlayer = (id: string) => players.find(p => p.id === id);

  const rosterStats = day.attendees.map(pid => {
      const p = getPlayer(pid);
      // Calculate day-specific stats
      let gamesPlayed = 0;
      let wins = 0;
      day.matches.forEach(m => {
          if (m.isCompleted && (m.teamA.includes(pid) || m.teamB.includes(pid))) {
              gamesPlayed++;
              const isA = m.teamA.includes(pid);
              if (m.scoreA !== undefined && m.scoreB !== undefined) {
                  if (isA && m.scoreA > m.scoreB) wins++;
                  if (!isA && m.scoreB > m.scoreA) wins++;
              }
          }
      });
      
      return {
          id: pid,
          name: p?.name || 'Unknown',
          gamesPlayed,
          wins
      };
  });

  const handleDropClick = (id: string) => {
      setConfirmDropId(id);
      vibrate('medium');
  };

  const handleConfirm = () => {
      if (confirmDropId) {
          onDrop(confirmDropId);
          setConfirmDropId(null);
      }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 animate-in fade-in duration-200 backdrop-blur-md">
      <div className="w-full max-w-sm bg-zinc-950 rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-6 bg-zinc-900 border-b border-white/5 flex justify-between items-center shrink-0">
            <div>
                <h2 className="text-xl font-black italic text-white uppercase tracking-tighter">SQUAD - DAY {day.day}</h2>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
                    {day.attendees.length} FIGHTERS FIELDED
                </p>
            </div>
            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white bg-zinc-800 rounded-full transition-colors">
                <IconX size={20} />
            </button>
        </div>

        {/* List or Confirmation */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar relative">
            
            {/* Overlay Confirmation */}
            {confirmDropId && (
                <div className="absolute inset-0 z-50 bg-zinc-950/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 space-y-6 text-center animate-in zoom-in-95 duration-200">
                    <div className="w-16 h-16 rounded-full bg-red-900/20 border-2 border-red-500 flex items-center justify-center text-red-500 mb-2 animate-pulse">
                        <IconAlert size={32} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white italic uppercase">Confirm Removal?</h3>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-2 leading-relaxed">
                            {getPlayer(confirmDropId)?.name} will be removed from all FUTURE matches today.
                        </p>
                    </div>
                    <div className="flex gap-3 w-full">
                        <button 
                            onClick={() => setConfirmDropId(null)}
                            className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-400 font-black uppercase text-xs tracking-widest hover:bg-zinc-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleConfirm}
                            className="flex-1 py-3 rounded-xl bg-red-600 text-zinc-950 font-black uppercase text-xs tracking-widest hover:bg-red-500 transition-colors shadow-lg shadow-red-900/20"
                        >
                            Drop
                        </button>
                    </div>
                </div>
            )}

            {rosterStats.map(stat => (
                <div key={stat.id} className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5 flex justify-between items-center group hover:bg-zinc-900 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                        <div>
                            <div className="font-black text-white italic uppercase">{stat.name}</div>
                            <div className="text-[9px] text-zinc-500 font-mono mt-0.5 uppercase tracking-wide">
                                {stat.gamesPlayed} GP • {stat.wins} WINS
                            </div>
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => handleDropClick(stat.id)}
                        className="bg-zinc-800 text-zinc-500 p-2 rounded-xl hover:bg-red-900/20 hover:text-red-500 transition-all border border-transparent hover:border-red-500/30 active:scale-95"
                        title="Drop Player from Remaining Matches"
                    >
                        <IconTrash size={16} />
                    </button>
                </div>
            ))}
            
            {rosterStats.length === 0 && (
                <div className="text-center py-10 text-zinc-600 font-black uppercase text-xs italic tracking-widest">
                    No active fighters
                </div>
            )}
        </div>

        {/* Footer Warning */}
        <div className="p-4 bg-zinc-900/50 border-t border-white/5">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-orange-900/10 border border-orange-500/20">
                <IconAlert size={16} className="text-orange-500 shrink-0 mt-0.5" />
                <p className="text-[9px] text-orange-200/80 font-medium leading-relaxed">
                    Dropping a player recalculates the remaining schedule instantly. Completed matches are preserved.
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default DayRosterModal;