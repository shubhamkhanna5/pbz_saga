
import React, { useState } from 'react';
import { AppState, Player, SkillLevel } from '../types';
import { IconUserPlus, IconTrash, IconCheck, IconX, IconZap, IconUsers, IconSearch } from './ui/Icons';
import { generateId } from '../utils/storage';
import { vibrate } from '../utils/godMode';
import { useDialog } from './ui/DialogProvider';

interface RosterManagerProps {
  players: Player[];
  onAddPlayer: (player: Player) => void;
  onRemovePlayer: (id: string) => void;
  onUpdatePresence: (id: string, isPresent: boolean) => void;
  isDarkMode?: boolean;
}

const RosterManager: React.FC<RosterManagerProps> = ({ 
  players, 
  onAddPlayer, 
  onRemovePlayer, 
  onUpdatePresence,
  isDarkMode
}) => {
  const { showConfirm } = useDialog();
  const [newName, setNewName] = useState('');
  const [newSkill, setNewSkill] = useState<SkillLevel>(SkillLevel.Intermediate);
  const [searchQuery, setSearchQuery] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedName = newName.trim();
    if (!normalizedName) return;

    // Prevent duplicate names
    if (players.some(p => p.name.toLowerCase() === normalizedName.toLowerCase())) {
        vibrate('error');
        return;
    }

    const defaultStats = { wins: 0, losses: 0, currentStreak: 0 };

    const newPlayer: Player = {
      id: generateId(),
      name: normalizedName.toUpperCase(),
      skill: newSkill,
      gamesPlayed: 0,
      isPresent: true, 
      stats: {
        ...defaultStats,
        clutchWins: 0,
        bagelsGiven: 0,
        totalPoints: 0,
        bonusPoints: 0,
        noShows: 0,
        singles: { ...defaultStats },
        doubles: { ...defaultStats }
      }
    };

    onAddPlayer(newPlayer);
    setNewName('');
  };

  const filteredPlayers = players.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
     if (a.isPresent === b.isPresent) return a.name.localeCompare(b.name);
     return a.isPresent ? -1 : 1;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Header */}
      <div className="text-center space-y-2 mt-4">
         <h2 className="text-4xl font-headline font-black italic tracking-tighter text-on-surface uppercase transform -skew-x-12">
           Z-<span className="text-primary">FIGHTERS</span>
         </h2>
         <p className="text-on-surface-variant font-bold uppercase text-[10px] tracking-[0.3em]">Roster Management Protocol</p>
      </div>

      {/* Quick Add Form */}
      <div className="space-y-4">
        <form onSubmit={handleAdd} className="dbz-card p-6 space-y-5 relative overflow-hidden manga-shadow">
            <div className="absolute top-0 left-0 w-1.5 bg-primary h-full opacity-80"></div>
            <div className="flex items-center gap-2 mb-2">
                <IconZap size={14} className="text-primary animate-pulse" />
                <h3 className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.3em]">Recruit Fighter</h3>
            </div>
            <div className="flex gap-3">
                <input 
                    type="text" 
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="FIGHTER NAME"
                    className="flex-1 bg-surface-variant/50 border-2 border-outline/10 text-on-surface rounded-xl px-5 py-4 font-headline font-black italic uppercase tracking-widest placeholder:text-on-surface-variant/30 focus:outline-none focus:border-primary transition-all"
                />
                <button 
                    type="submit"
                    disabled={!newName.trim()}
                    className="bg-primary text-on-primary w-16 rounded-xl font-black shadow-lg disabled:opacity-30 disabled:grayscale transition-all hover:scale-105 active:scale-95 flex items-center justify-center manga-skew"
                >
                    <IconUserPlus size={24} className="manga-skew-reverse" />
                </button>
            </div>
        </form>

        {/* Search Bar */}
        <div className="relative group">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                <IconSearch size={18} className="text-on-surface-variant/40 group-focus-within:text-primary transition-colors" />
            </div>
            <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="SEARCH Z-FIGHTERS..."
                className="w-full bg-surface-variant/30 border-2 border-outline/10 text-on-surface rounded-2xl pl-14 pr-6 py-4 font-headline font-black italic uppercase tracking-widest placeholder:text-on-surface-variant/30 focus:outline-none focus:border-primary/50 transition-all manga-shadow"
            />
        </div>
      </div>

      {/* Fighter List */}
      <div className="space-y-4">
        <div className="flex justify-between items-end px-2">
            <h3 className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.4em]">Z-ROSTER ({players.length})</h3>
            <span className="text-[8px] font-black text-on-surface-variant/60 uppercase">Status Update Available</span>
        </div>
        
        {sortedPlayers.length === 0 && (
            <div className="text-center py-16 dbz-card border-2 border-dashed border-outline/20">
                <p className="text-on-surface-variant font-black uppercase text-[10px] tracking-widest italic">The arena is empty...</p>
            </div>
        )}

        <div className="space-y-3">
            {sortedPlayers
                .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
                .map(player => (
                <div 
                    key={player.id} 
                    className={`flex items-center justify-between p-5 rounded-2xl border transition-all duration-500 relative overflow-hidden manga-shadow ${
                        player.isPresent 
                        ? 'bg-white border-primary aura-glow' 
                        : 'bg-surface-variant/30 border-outline/10 opacity-60'
                    }`}
                >
                    <div 
                        className="flex-1 cursor-pointer" 
                        onClick={() => onUpdatePresence(player.id, !player.isPresent)}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all duration-500 ${
                                player.isPresent 
                                ? 'bg-primary border-primary text-on-primary' 
                                : 'bg-surface-variant border-outline/10 text-transparent'
                            }`}>
                                <IconCheck size={20} className="drop-shadow-sm" />
                            </div>
                            <div>
                                <span className={`font-headline font-black italic uppercase tracking-tight text-xl transition-colors duration-500 ${player.isPresent ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                                    {player.name.toUpperCase()}
                                </span>
                                <div className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest mt-0.5 transition-colors duration-500">
                                    {player.isPresent ? 'READY FOR BATTLE' : 'OFFLINE'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={() => {
                            vibrate('medium');
                            showConfirm(`Are you sure you want to remove ${player.name} from the roster? All their stats will be lost.`, () => {
                                onRemovePlayer(player.id);
                            });
                        }}
                        className="p-3 text-on-surface-variant/40 hover:text-primary transition-colors active:scale-95"
                    >
                        <IconTrash size={20} />
                    </button>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default RosterManager;
