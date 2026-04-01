
import React, { useState } from 'react';
import { Player } from '../types';
import { IconUserPlus, IconX, IconCheck } from './ui/Icons';
import { vibrate } from '../utils/godMode';

interface FreeAgentModalProps {
  allPlayers: Player[];
  activeLeaguePlayerIds: string[];
  onAddPlayer: (playerId: string) => void;
  onClose: () => void;
}

const FreeAgentModal: React.FC<FreeAgentModalProps> = ({ allPlayers, activeLeaguePlayerIds, onAddPlayer, onClose }) => {
  const [search, setSearch] = useState('');

  const freeAgents = allPlayers
    .filter(p => !activeLeaguePlayerIds.includes(p.id))
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleAdd = (id: string) => {
      vibrate('success');
      onAddPlayer(id);
      onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 animate-in fade-in duration-200 backdrop-blur-md">
      <div className="w-full max-w-sm bg-zinc-950 rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-6 bg-zinc-900 border-b border-white/5 flex justify-between items-center shrink-0">
            <div>
                <h2 className="text-xl font-black italic text-white uppercase tracking-tighter">Recruit Free Agent</h2>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
                    Mid-Season Join
                </p>
            </div>
            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white bg-zinc-800 rounded-full transition-colors">
                <IconX size={20} />
            </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-white/5 bg-zinc-900/50">
            <input 
                autoFocus
                type="text" 
                placeholder="Search Roster..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm font-bold placeholder:text-zinc-600 focus:outline-none focus:border-primary transition-all"
            />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
            {freeAgents.length === 0 ? (
                <div className="text-center py-10 text-zinc-600 font-black uppercase text-xs italic tracking-widest">
                    No Eligible Fighters Found
                </div>
            ) : (
                freeAgents.map(p => (
                    <button
                        key={p.id}
                        onClick={() => handleAdd(p.id)}
                        className="w-full flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl border border-white/5 hover:bg-zinc-900 hover:border-primary/50 transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-primary transition-colors">
                                <IconUserPlus size={16} />
                            </div>
                            <div className="text-left">
                                <div className="text-sm font-black text-white italic uppercase">{p.name}</div>
                                <div className="text-[9px] text-zinc-500 uppercase font-bold">Reserves</div>
                            </div>
                        </div>
                        <IconCheck size={16} className="text-transparent group-hover:text-primary -translate-x-2 group-hover:translate-x-0 transition-all" />
                    </button>
                ))
            )}
        </div>
      </div>
    </div>
  );
};

export default FreeAgentModal;
