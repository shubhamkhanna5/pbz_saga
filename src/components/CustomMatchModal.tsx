
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
  onUpdateDragonBalls?: (playerId: string, delta: number) => void;
}

const CustomMatchModal: React.FC<CustomMatchModalProps> = ({ players, onSave, onCancel, isDarkMode, onUpdateDragonBalls }) => {
  const [teamA, setTeamA] = useState<string[]>([]);
  const [teamB, setTeamB] = useState<string[]>([]);
  const [scoreA, setScoreA] = useState<string>('');
  const [scoreB, setScoreB] = useState<string>('');
  const [matchType, setMatchType] = useState<'singles' | 'doubles'>('doubles');
  const [awardedDBPlayers, setAwardedDBPlayers] = useState<Set<string>>(new Set());
  const [activeDropdown, setActiveDropdown] = useState<{ team: 'A' | 'B'; index: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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
    const finalScoreA = scoreA === '' ? 0 : parseInt(scoreA, 10);
    const finalScoreB = scoreB === '' ? 0 : parseInt(scoreB, 10);

    onSave(cleanA, cleanB, finalScoreA, finalScoreB, matchType);
    vibrate('success');
  };

  const sortedPlayers = [...players].sort((a, b) => a.name.localeCompare(b.name));

  const renderPlayerSelect = (team: 'A' | 'B', index: number) => {
    const currentId = team === 'A' ? teamA[index] : teamB[index];
    const otherTeam = team === 'A' ? teamB : teamA;
    const sameTeamOtherIndices = (team === 'A' ? teamA : teamB).filter((_, i) => i !== index);

    const selectedPlayer = players.find(p => p.id === currentId);
    const isOpen = activeDropdown?.team === team && activeDropdown?.index === index;

    const filteredPlayers = sortedPlayers.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="space-y-2 relative">
        {/* Searchable Custom Dropdown Trigger */}
        <button
          type="button"
          onClick={() => {
            if (isOpen) {
              setActiveDropdown(null);
            } else {
              setActiveDropdown({ team, index });
              setSearchQuery('');
            }
            vibrate('light');
          }}
          className={`w-full bg-zinc-950 border-2 ${isOpen ? 'border-primary shadow-[0_0_12px_rgba(168,85,247,0.25)]' : 'border-zinc-800'} rounded-xl px-4 py-3 text-white font-black text-xs uppercase tracking-widest flex items-center justify-between cursor-pointer hover:border-zinc-700 transition-all text-left relative z-10`}
        >
          <span className="truncate">
            {selectedPlayer ? selectedPlayer.name.toUpperCase() : 'SELECT FIGHTER'}
          </span>
          <span className="text-zinc-500 font-mono text-[9px] ml-2 leading-none">
            {isOpen ? '▲' : '▼'}
          </span>
        </button>

        {/* Dropdown Options List */}
        {isOpen && (
          <div className="absolute left-0 right-0 mt-1 z-50 bg-zinc-950 border-2 border-zinc-800 rounded-xl p-2 shadow-2xl space-y-2 max-h-56 overflow-y-auto w-full">
            <div className="sticky top-0 bg-zinc-950 pb-1.5 pt-0.5 z-10 border-b border-zinc-800/80">
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="SEARCH FIGHTER..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white font-black text-[10px] uppercase tracking-wider outline-none focus:border-primary placeholder-zinc-600 block"
              />
            </div>
            <div className="space-y-0.5 pt-1">
              {filteredPlayers.length === 0 ? (
                <div className="text-[9px] text-zinc-600 font-black uppercase text-center py-4 tracking-wider">
                  No Fighters Found
                </div>
              ) : (
                filteredPlayers.map(p => {
                  const isSelectedElsewhere = otherTeam.includes(p.id) || sameTeamOtherIndices.includes(p.id);
                  const isSelectedThis = p.id === currentId;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={isSelectedElsewhere}
                      onClick={() => {
                        handlePlayerSelect(p.id, team, index);
                        setActiveDropdown(null);
                        setSearchQuery('');
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg font-black text-[11px] uppercase tracking-wider transition-colors flex items-center justify-between
                        ${isSelectedThis 
                          ? 'bg-primary text-white font-black' 
                          : isSelectedElsewhere 
                          ? 'text-zinc-600 cursor-not-allowed bg-zinc-900/10' 
                          : 'text-zinc-300 hover:bg-zinc-800/60 hover:text-white'}`}
                    >
                      <span className="truncate">{p.name.toUpperCase()}</span>
                      {isSelectedThis && <span className="text-[7.5px] bg-white/20 px-1 py-0.5 rounded text-white font-bold shrink-0 ml-2">SELECTED</span>}
                      {isSelectedElsewhere && <span className="text-[7.5px] text-zinc-600 font-bold shrink-0 ml-2">TAKEN</span>}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
        
        {currentId && onUpdateDragonBalls && (
          <div className="flex items-center gap-2 px-1">
            <motion.button
              whileTap={awardedDBPlayers.has(currentId) ? {} : { scale: 1.2 }}
              disabled={awardedDBPlayers.has(currentId)}
              onClick={() => {
                onUpdateDragonBalls(currentId, 1);
                setAwardedDBPlayers(prev => new Set(prev).add(currentId));
              }}
              className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all flex items-center justify-center gap-1.5 relative overflow-hidden ${
                awardedDBPlayers.has(currentId)
                  ? 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                  : 'bg-aura-gold/10 text-aura-gold border border-aura-gold/30 hover:bg-aura-gold/20'
              }`}
            >
              {awardedDBPlayers.has(currentId) ? '✓ DB AWARDED' : '+1 DRAGON BALL'}
              {!awardedDBPlayers.has(currentId) && (
                <motion.div
                  className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-aura-gold rounded-full"
                  animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0.8, 0.4] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
              )}
            </motion.button>
            <button
              onClick={() => {
                onUpdateDragonBalls(currentId, -1);
                if (awardedDBPlayers.has(currentId)) {
                  setAwardedDBPlayers(prev => {
                    const next = new Set(prev);
                    next.delete(currentId);
                    return next;
                  });
                }
              }}
              className="px-2 py-1.5 rounded-lg bg-zinc-800 text-zinc-500 border border-zinc-700 text-[10px] hover:bg-zinc-700 transition-all font-black"
            >
              -1
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto pb-32"
    >
      {/* Click-outside backdrop to close any open searchable selects */}
      {activeDropdown && (
        <div 
          className="fixed inset-0 z-10 bg-transparent"
          onClick={() => {
            setActiveDropdown(null);
            setSearchQuery('');
          }}
        />
      )}

      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-zinc-900 border-2 border-zinc-800 rounded-[2rem] sm:rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden my-auto relative z-20 font-sans"
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
                  type="text" 
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="0"
                  value={scoreA}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setScoreA(val);
                  }}
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
                  type="text" 
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="0"
                  value={scoreB}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setScoreB(val);
                  }}
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
