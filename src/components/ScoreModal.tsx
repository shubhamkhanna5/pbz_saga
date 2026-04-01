
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { IconCheck, IconX, IconMinus, IconPlus, IconAlert, IconZap, IconDownload, IconFlame } from './ui/Icons';
import { Game } from '../types';
import { vibrate } from '../utils/godMode';
import { MATCH_RULES, isValidScore } from '../utils/rules';
import { buildHighlightJSON, downloadHighlightJSON } from '../utils/pbzHighlightExport';

interface ScoreModalProps {
  game: Game;
  onSave: (scoreA: number, scoreB: number) => void;
  onCancel: () => void;
  teamANames: string;
  teamBNames: string;
  onScoreChange?: (scoreA: number, scoreB: number) => void;
  onHighlight?: () => void;
}

const ScoreModal: React.FC<ScoreModalProps> = ({ game, onSave, onCancel, teamANames, teamBNames, onScoreChange, onHighlight }) => {
  const [scoreA, setScoreA] = useState(game.scoreA || 0);
  const [scoreB, setScoreB] = useState(game.scoreB || 0);

  const [flashA, setFlashA] = useState(false);
  const [flashB, setFlashB] = useState(false);
  const [highlightFlash, setHighlightFlash] = useState(false);

  useEffect(() => {
    if (scoreA === MATCH_RULES.POINTS_TO_WIN) {
        setFlashA(true);
        setTimeout(() => setFlashA(false), 600);
    }
  }, [scoreA]);

  useEffect(() => {
    if (scoreB === MATCH_RULES.POINTS_TO_WIN) {
        setFlashB(true);
        setTimeout(() => setFlashB(false), 600);
    }
  }, [scoreB]);

  const handleSave = () => {
    if (isValidScore(scoreA, scoreB)) {
        onSave(scoreA, scoreB);
    } else {
        vibrate('error');
    }
  };
  
  const handleExport = () => {
      const exportGame = { ...game, scoreA, scoreB };
      const json = buildHighlightJSON(exportGame, game.mode);
      const filename = `PBZ_HIGHLIGHTS_${game.id}_${Date.now()}.json`;
      downloadHighlightJSON(json, filename);
      vibrate('success');
  };

  const handleHighlightClick = () => {
      if (onHighlight) {
          onHighlight();
          vibrate('medium');
          setHighlightFlash(true);
          setTimeout(() => setHighlightFlash(false), 800);
      }
  };

  const increment = (setter: React.Dispatch<React.SetStateAction<number>>, current: number, isA: boolean) => {
      if (current < MATCH_RULES.MAX_POINTS) {
          const newVal = current + 1;
          setter(newVal);
          if (onScoreChange) {
              onScoreChange(isA ? newVal : scoreA, isA ? scoreB : newVal);
          }
          vibrate('light');
      }
  };

  const decrement = (setter: React.Dispatch<React.SetStateAction<number>>, current: number, isA: boolean) => {
      if (current > 0) {
          const newVal = current - 1;
          setter(newVal);
          if (onScoreChange) {
              onScoreChange(isA ? newVal : scoreA, isA ? scoreB : newVal);
          }
          vibrate('light');
      }
  };

  const valid = isValidScore(scoreA, scoreB);
  const isBagel = (scoreA === 11 && scoreB === 0) || (scoreB === 11 && scoreA === 0);
  const isGoldenPoint = (scoreA === 11 && scoreB === 10) || (scoreB === 11 && scoreA === 10);
  const highlightCount = game.highlights?.length || 0;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/95 p-4 backdrop-blur-2xl"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="w-full max-w-md bg-surface border-2 border-primary/20 rounded-[3rem] overflow-hidden shadow-[0_0_80px_rgba(255,140,0,0.2)] relative manga-shadow"
      >
        {/* Glow behind modal */}
        <div className={`absolute inset-0 opacity-30 blur-[120px] pointer-events-none transition-all duration-1000 ${scoreA > scoreB ? 'bg-primary' : scoreB > scoreA ? 'bg-secondary' : 'bg-primary/50'}`}></div>
        
        <div className="p-10 bg-surface/80 border-b-2 border-outline/5 flex justify-between items-center relative z-10">
          <div className="manga-skew">
            <h2 className="text-3xl font-headline font-black italic text-on-surface uppercase tracking-tighter manga-skew-reverse">
              BATTLE <span className="text-primary">RESULT</span>
            </h2>
            <p className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-[0.4em] mt-1 manga-skew-reverse">
              ARENA {game.courtId} • {game.mode.toUpperCase()}
            </p>
          </div>
          <motion.button 
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={onCancel}
            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-surface-variant/20 border-2 border-outline/5 text-on-surface-variant hover:bg-destructive hover:text-zinc-950 hover:border-destructive transition-all shadow-lg"
          >
            <IconX size={24} />
          </motion.button>
        </div>

        <div className="p-10 space-y-10 relative z-10">
          {/* Team A - Goku Energy */}
          <motion.div 
            layout
            className="p-8 rounded-[2.5rem] bg-surface-variant/10 border-2 border-outline/5 relative overflow-hidden group/teamA"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[60px] rounded-full -translate-y-16 translate-x-16 group-hover/teamA:bg-primary/10 transition-colors"></div>
            
            <div className="flex items-center justify-between gap-6 relative z-10">
              <div className="flex-1 min-w-0">
                <span className="block text-[10px] font-black text-primary/60 uppercase tracking-[0.4em] mb-2 manga-skew">
                  <span className="manga-skew-reverse block">TEAM ALPHA</span>
                </span>
                <span className={`block text-2xl font-headline font-black italic transform -skew-x-12 whitespace-normal ${scoreA === 11 ? 'text-primary drop-shadow-[0_0_15px_rgba(255,140,0,0.4)]' : 'text-on-surface'}`}>
                    {teamANames}
                </span>
              </div>
              
              <div className="flex items-center gap-5 shrink-0">
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => decrement(setScoreA, scoreA, true)}
                  className="w-16 h-16 flex items-center justify-center rounded-2xl bg-surface border-2 border-outline/10 text-on-surface-variant hover:bg-surface-variant hover:text-on-surface transition-all shadow-lg"
                >
                  <IconMinus size={28} />
                </motion.button>
                
                <div className={`w-20 text-center transition-all duration-500 ${flashA ? 'scale-125' : ''}`}>
                    <span className={`text-7xl font-headline font-black italic transform -skew-x-12 block ${scoreA === 11 ? 'text-primary drop-shadow-[0_0_20px_rgba(255,140,0,0.6)] animate-bounce' : 'text-on-surface'}`}>
                        {scoreA}
                    </span>
                </div>
                
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => increment(setScoreA, scoreA, true)}
                  className={`w-16 h-16 flex items-center justify-center rounded-2xl transition-all shadow-xl border-2
                      ${scoreA === 11 ? 'bg-surface-variant/20 border-outline/5 text-on-surface-variant/40' : 'bg-primary text-on-primary border-primary/50 shadow-[0_0_20px_rgba(255,140,0,0.3)]'}`}
                >
                  <IconPlus size={28} />
                </motion.button>
              </div>
            </div>
          </motion.div>

          <div className="flex items-center justify-center gap-6 py-2">
              <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent via-outline/10 to-transparent"></div>
              <div className="w-12 h-12 rounded-full bg-surface border-2 border-outline/5 flex items-center justify-center shadow-inner">
                <IconZap size={24} className="text-outline/20" />
              </div>
              <div className="h-0.5 flex-1 bg-gradient-to-l from-transparent via-outline/10 to-transparent"></div>
          </div>

          {/* Team B - Vegeta Energy */}
          <motion.div 
            layout
            className="p-8 rounded-[2.5rem] bg-surface-variant/10 border-2 border-outline/5 relative overflow-hidden group/teamB"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 blur-[60px] rounded-full -translate-y-16 translate-x-16 group-hover/teamB:bg-secondary/10 transition-colors"></div>
            
            <div className="flex items-center justify-between gap-6 relative z-10">
              <div className="flex-1 min-w-0">
                <span className="block text-[10px] font-black text-secondary/60 uppercase tracking-[0.4em] mb-2 manga-skew">
                  <span className="manga-skew-reverse block">TEAM BRAVO</span>
                </span>
                <span className={`block text-2xl font-headline font-black italic transform -skew-x-12 whitespace-normal ${scoreB === 11 ? 'text-secondary drop-shadow-[0_0_15px_rgba(30,64,175,0.4)]' : 'text-on-surface'}`}>
                    {teamBNames}
                </span>
              </div>
              
              <div className="flex items-center gap-5 shrink-0">
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => decrement(setScoreB, scoreB, false)}
                  className="w-16 h-16 flex items-center justify-center rounded-2xl bg-surface border-2 border-outline/10 text-on-surface-variant hover:bg-surface-variant hover:text-on-surface transition-all shadow-lg"
                >
                  <IconMinus size={28} />
                </motion.button>
                
                <div className={`w-20 text-center transition-all duration-500 ${flashB ? 'scale-125' : ''}`}>
                  <span className={`text-7xl font-headline font-black italic transform -skew-x-12 block ${scoreB === 11 ? 'text-secondary drop-shadow-[0_0_20px_rgba(30,64,175,0.6)] animate-bounce' : 'text-on-surface'}`}>
                      {scoreB}
                  </span>
                </div>
                
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => increment(setScoreB, scoreB, false)}
                  className={`w-16 h-16 flex items-center justify-center rounded-2xl transition-all shadow-xl border-2
                      ${scoreB === 11 ? 'bg-surface-variant/20 border-outline/5 text-on-surface-variant/40' : 'bg-secondary text-on-secondary border-secondary/50 shadow-[0_0_20px_rgba(30,64,175,0.3)]'}`}
                >
                  <IconPlus size={28} />
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
        
        <div className="px-10 py-10 bg-surface/80 border-t-2 border-outline/5 space-y-8 relative z-10">
          <div className="h-8 flex items-center justify-center">
              <AnimatePresence>
                {isBagel && (
                  <motion.div 
                    initial={{ scale: 0, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0 }}
                    className="transform -skew-x-12"
                  >
                      <span className="text-xs font-black text-destructive uppercase tracking-[0.4em] border-2 border-destructive/40 px-6 py-2 rounded-2xl bg-destructive/10 shadow-[0_0_30px_rgba(239,68,68,0.3)] skew-x-12 block">
                          DESTRUCTO DISC FINISH (+1 Bonus)
                      </span>
                  </motion.div>
                )}
                {isGoldenPoint && (
                  <motion.div 
                    initial={{ scale: 0, rotate: 10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0 }}
                    className="transform -skew-x-12"
                  >
                      <span className="text-xs font-black text-primary uppercase tracking-[0.4em] border-2 border-primary/40 px-6 py-2 rounded-2xl bg-primary/10 shadow-[0_0_30px_rgba(255,140,0,0.3)] skew-x-12 block">
                          ULTRA INSTINCT CLUTCH
                      </span>
                  </motion.div>
                )}
              </AnimatePresence>
          </div>
          
          <div className="flex gap-4">
              <motion.button 
                whileHover={valid ? { scale: 1.02 } : {}}
                whileTap={valid ? { scale: 0.98 } : {}}
                onClick={handleSave}
                disabled={!valid}
                className={`flex-1 h-24 font-headline font-black italic text-2xl uppercase tracking-[0.4em] rounded-[2.5rem] flex items-center justify-center gap-4 transition-all duration-700 shadow-2xl overflow-hidden relative group/save transform -skew-x-12
                    ${valid 
                        ? 'bg-primary text-on-primary border-2 border-primary/50 aura-glow' 
                        : 'bg-surface-variant/20 text-on-surface-variant/40 border-2 border-outline/5 cursor-not-allowed'}`}
              >
                {valid && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover/save:animate-shimmer"></div>}
                <span className="relative z-10 skew-x-12 flex items-center gap-4">
                  {valid ? 'SEAL SAGA' : 'INVALID'}
                  {valid && <IconCheck size={32} className="fill-white" />}
                </span>
              </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ScoreModal;
