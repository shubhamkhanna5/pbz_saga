
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Player } from '../types';
import { IconX, IconCheck, IconUsers, IconZap } from './ui/Icons';
import { vibrate } from '../utils/godMode';
import { generateId } from '../utils/storage';

interface CustomMatchModalProps {
  players: Player[];
  onSave: (teamA: string[], teamB: string[], scoreA: number, scoreB: number, type: 'singles' | 'doubles') => void;
  onCancel: () => void;
  isDarkMode?: boolean;
}

const CustomMatchModal: React.FC<CustomMatchModalProps> = ({ players, onSave, onCancel, isDarkMode }) => {
  const [teamA, setTeamA] = useState<string[]>([]);
  const [teamB, setTeamB] = useState<string[]>([]);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [matchType, setMatchType] = useState<'singles' | 'doubles'>('doubles');

  const handlePlayerSelect = (playerId: string, team: 'A' | 'B', index: number) => {
    if (team === 'A') {
      const newTeam = [...teamA];
      // Ensure array has enough slots
      while (newTeam.length <= index) newTeam.push('');
      newTeam[index] = playerId;
      setTeamA(newTeam);
    } else {
      const newTeam = [...teamB];
      while (newTeam.length <= index) newTeam.push('');
      newTeam[index] = playerId;
      setTeamB(newTeam);
    }
    vibrate('light');
  };

  const handleSave = () => {
    const needed = matchType === 'singles' ? 1 : 2;
    const cleanA = teamA.filter(Boolean);
    const cleanB = teamB.filter(Boolean);
    
    if (cleanA.length !== needed || cleanB.length !== needed) {
      return;
    }
    onSave(cleanA, cleanB, scoreA, scoreB, matchType);
    vibrate('success');
  };

  const sortedPlayers = [...players].sort((a, b) => a.name.localeCompare(b.name));

  const renderPlayerSelect = (team: 'A' | 'B', index: number) => {
    const currentId = team === 'A' ? teamA[index] : teamB[index];
    const otherTeam = team === 'A' ? teamB : teamA;
    const sameTeamOtherIndices = (team === 'A' ? teamA : teamB).filter((_, i) => i !== index);

    return (
      <select
        value={currentId || ''}
        onChange={(e) => handlePlayerSelect(e.target.value, team, index)}
        className="w-full bg-zinc-950 border-2 border-zinc-800 rounded-xl px-4 py-3 text-white font-black text-xs uppercase tracking-widest focus:border-primary outline-none appearance-none cursor-pointer"
      >
        <option value="">Select Fighter</option>
        {sortedPlayers.map(p => {
          const isSelectedElsewhere = otherTeam.includes(p.id) || sameTeamOtherIndices.includes(p.id);
          return (
            <option key={p.id} value={p.id} disabled={isSelectedElsewhere}>
              {p.name.toUpperCase()}
            </option>
          );
        })}
      </select>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto pb-32"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-zinc-900 border-2 border-zinc-800 rounded-[2rem] sm:rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden my-auto"
      >
        <div className="p-4 sm:p-8 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30">
              <IconZap className="text-primary" size={18} />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white uppercase italic tracking-tighter">Custom Battle</h3>
          </div>
          <button onClick={onCancel} className="p-1 text-zinc-500 hover:text-white transition-colors">
            <IconX size={24} />
          </button>
        </div>

        <div className="p-4 sm:p-8 space-y-6 sm:space-y-10">
          {/* Match Type Toggle */}
          <div className="flex p-1 bg-zinc-950 rounded-2xl border border-zinc-800">
            <button 
              onClick={() => { setMatchType('singles'); setTeamA([]); setTeamB([]); }}
              className={`flex-1 py-2.5 sm:py-3 rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest transition-all ${matchType === 'singles' ? 'bg-primary text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Singles
            </button>
            <button 
              onClick={() => { setMatchType('doubles'); setTeamA([]); setTeamB([]); }}
              className={`flex-1 py-2.5 sm:py-3 rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest transition-all ${matchType === 'doubles' ? 'bg-primary text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Doubles
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-12">
            {/* Team A Selection */}
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center justify-between px-2">
                <label className="text-[10px] sm:text-[11px] font-black text-primary uppercase tracking-[0.3em]">Team Alpha</label>
                <div className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                  {teamA.filter(Boolean).length} / {matchType === 'singles' ? 1 : 2}
                </div>
              </div>
              
              <div className="space-y-3">
                {renderPlayerSelect('A', 0)}
                {matchType === 'doubles' && renderPlayerSelect('A', 1)}
              </div>

              <div className="flex items-center gap-4 bg-zinc-950 p-2 rounded-2xl border-2 border-zinc-800 focus-within:border-primary/50 transition-all">
                <span className="text-[10px] font-black text-zinc-500 uppercase ml-4 tracking-widest">Score</span>
                <input 
                  type="number" 
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={scoreA}
                  onChange={(e) => setScoreA(parseInt(e.target.value) || 0)}
                  className="flex-1 bg-transparent text-white font-headline font-black text-3xl sm:text-4xl text-center outline-none py-2"
                />
              </div>
            </div>

            {/* Team B Selection */}
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center justify-between px-2">
                <label className="text-[10px] sm:text-[11px] font-black text-secondary uppercase tracking-[0.3em]">Team Bravo</label>
                <div className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                  {teamB.filter(Boolean).length} / {matchType === 'singles' ? 1 : 2}
                </div>
              </div>

              <div className="space-y-3">
                {renderPlayerSelect('B', 0)}
                {matchType === 'doubles' && renderPlayerSelect('B', 1)}
              </div>

              <div className="flex items-center gap-4 bg-zinc-950 p-2 rounded-2xl border-2 border-zinc-800 focus-within:border-secondary/50 transition-all">
                <span className="text-[10px] font-black text-zinc-500 uppercase ml-4 tracking-widest">Score</span>
                <input 
                  type="number" 
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={scoreB}
                  onChange={(e) => setScoreB(parseInt(e.target.value) || 0)}
                  className="flex-1 bg-transparent text-white font-headline font-black text-3xl sm:text-4xl text-center outline-none py-2"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-8 bg-zinc-950/50 border-t border-zinc-800 flex gap-3 sm:gap-4">
          <button 
            onClick={onCancel}
            className="flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-zinc-800 text-zinc-400 font-black uppercase tracking-widest text-[9px] sm:text-[10px]"
          >
            Abort
          </button>
          <button 
            onClick={handleSave}
            disabled={teamA.filter(Boolean).length !== (matchType === 'singles' ? 1 : 2) || teamB.filter(Boolean).length !== (matchType === 'singles' ? 1 : 2)}
            className={`flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[9px] sm:text-[10px] transition-all ${teamA.filter(Boolean).length === (matchType === 'singles' ? 1 : 2) && teamB.filter(Boolean).length === (matchType === 'singles' ? 1 : 2) ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
          >
            Confirm Battle
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CustomMatchModal;
