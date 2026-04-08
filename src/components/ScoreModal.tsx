
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { IconCheck, IconX, IconMinus, IconPlus, IconAlert, IconZap, IconDownload, IconFlame } from './ui/Icons';
import { Game, Player } from '../types';
import { vibrate } from '../utils/godMode';
import { MATCH_RULES, isValidScore } from '../utils/rules';
import { buildHighlightJSON, downloadHighlightJSON } from '../utils/pbzHighlightExport';

interface ScoreModalProps {
  game: Game;
  onSave: (scoreA: number, scoreB: number) => void;
  onCancel: () => void;
  teamANames: string;
  teamBNames: string;
  teamAPlayers?: Player[];
  teamBPlayers?: Player[];
  onScoreChange?: (scoreA: number, scoreB: number) => void;
  onHighlight?: () => void;
  isAdmin?: boolean;
  onUpdateDragonBalls?: (playerId: string, delta: number) => void;
}

const ScoreModal: React.FC<ScoreModalProps> = ({ 
  game, onSave, onCancel, teamANames, teamBNames, 
  teamAPlayers, teamBPlayers,
  onScoreChange, onHighlight, isAdmin, onUpdateDragonBalls 
}) => {
  const [scoreA, setScoreA] = useState(game.scoreA || 0);
  const [scoreB, setScoreB] = useState(game.scoreB || 0);

  const [flashA, setFlashA] = useState(false);
  const [flashB, setFlashB] = useState(false);
  const [highlightFlash, setHighlightFlash] = useState(false);
  const [awardedDBPlayers, setAwardedDBPlayers] = useState<Set<string>>(new Set());

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

  const quickFill = (winner: 'A' | 'B') => {
      const winScore = MATCH_RULES.POINTS_TO_WIN;
      if (winner === 'A') {
          setScoreA(winScore);
          if (onScoreChange) onScoreChange(winScore, scoreB);
      } else {
          setScoreB(winScore);
          if (onScoreChange) onScoreChange(scoreA, winScore);
      }
      vibrate('medium');
  };

  const valid = isValidScore(scoreA, scoreB);
  const isBagel = (scoreA === MATCH_RULES.POINTS_TO_WIN && scoreB === 0) || (scoreB === MATCH_RULES.POINTS_TO_WIN && scoreA === 0);
  const isGoldenPoint = (scoreA === MATCH_RULES.POINTS_TO_WIN && scoreB === MATCH_RULES.POINTS_TO_WIN - 1) || (scoreB === MATCH_RULES.POINTS_TO_WIN && scoreA === MATCH_RULES.POINTS_TO_WIN - 1);
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
        
        <div className="p-8 bg-surface/80 border-b-2 border-outline/5 flex justify-between items-center relative z-10">
          <div className="manga-skew">
            <h2 className="text-2xl font-headline font-black italic text-on-surface uppercase tracking-tighter manga-skew-reverse">
              BATTLE <span className="text-primary">RESULT</span>
            </h2>
            <p className="text-[9px] font-black text-on-surface-variant/60 uppercase tracking-[0.4em] mt-1 manga-skew-reverse">
              ARENA {game.courtId} • {game.mode.toUpperCase()}
            </p>
          </div>
          <motion.button 
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={onCancel}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-variant/20 border-2 border-outline/5 text-on-surface-variant hover:bg-destructive hover:text-zinc-950 hover:border-destructive transition-all shadow-lg"
          >
            <IconX size={20} />
          </motion.button>
        </div>

        <div className="p-6 sm:p-8 space-y-6 relative z-10">
          {/* Main Scoreboard Area */}
          <div className="flex flex-col gap-6">
            {/* Team Alpha */}
            <div className="relative group">
              <div className="flex items-center justify-between gap-4 mb-3">
                <div className="flex-1">
                  <span className="block text-[9px] font-black text-primary/60 uppercase tracking-[0.4em] mb-1 manga-skew">
                    <span className="manga-skew-reverse block">TEAM ALPHA</span>
                  </span>
                  <div className="space-y-1">
                    {teamAPlayers ? teamAPlayers.map(p => (
                      <div key={p.id} className="flex items-center gap-2">
                        <h3 className={`text-xl font-headline font-black italic transform -skew-x-12 leading-tight ${scoreA === MATCH_RULES.POINTS_TO_WIN ? 'text-primary' : 'text-on-surface'}`}>
                            {p.name.toUpperCase()}
                        </h3>
                        {isAdmin && onUpdateDragonBalls && (
                          <div className="flex items-center gap-1">
                            <motion.button 
                              whileTap={awardedDBPlayers.has(p.id) ? {} : { scale: 1.4 }}
                              disabled={awardedDBPlayers.has(p.id)}
                              onClick={() => {
                                onUpdateDragonBalls(p.id, 1);
                                setAwardedDBPlayers(prev => new Set(prev).add(p.id));
                              }}
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black transition-all ${
                                awardedDBPlayers.has(p.id)
                                  ? 'bg-zinc-800 text-zinc-600 border border-zinc-700 cursor-not-allowed opacity-50'
                                  : 'bg-aura-gold/20 text-aura-gold border border-aura-gold/40 hover:bg-aura-gold/40 hover:shadow-[0_0_15px_rgba(255,140,0,0.4)] active:bg-aura-gold active:text-black'
                              }`}
                            >
                              {awardedDBPlayers.has(p.id) ? '✓' : '+1DB'}
                            </motion.button>
                            <motion.button 
                              whileTap={{ scale: 0.8 }}
                              onClick={() => {
                                onUpdateDragonBalls(p.id, -1);
                                if (awardedDBPlayers.has(p.id)) {
                                  setAwardedDBPlayers(prev => {
                                    const next = new Set(prev);
                                    next.delete(p.id);
                                    return next;
                                  });
                                }
                              }}
                              className="w-7 h-7 rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700 flex items-center justify-center text-[9px] font-black hover:bg-zinc-700 transition-all"
                            >
                              -1
                            </motion.button>
                          </div>
                        )}
                      </div>
                    )) : (
                      <h3 className={`text-xl font-headline font-black italic transform -skew-x-12 leading-tight ${scoreA === MATCH_RULES.POINTS_TO_WIN ? 'text-primary' : 'text-on-surface'}`}>
                          {teamANames.toUpperCase()}
                      </h3>
                    )}
                  </div>
                </div>
                <div className={`text-6xl font-headline font-black italic transform -skew-x-12 ${scoreA === MATCH_RULES.POINTS_TO_WIN ? 'text-primary animate-pulse' : 'text-on-surface'}`}>
                  {scoreA}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <motion.button 
                  whileTap={{ scale: 0.9 }}
                  onClick={() => decrement(setScoreA, scoreA, true)}
                  className="w-16 h-20 rounded-2xl bg-surface-variant/20 border-2 border-outline/5 text-on-surface-variant flex items-center justify-center hover:bg-surface-variant/40 transition-all"
                >
                  <IconMinus size={24} />
                </motion.button>
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={() => increment(setScoreA, scoreA, true)}
                  className={`flex-1 h-20 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border-2
                    ${scoreA === MATCH_RULES.POINTS_TO_WIN ? 'bg-surface-variant/10 border-outline/5 text-on-surface-variant/30' : 'bg-primary/20 border-primary/40 text-primary shadow-[0_0_20px_rgba(168,85,247,0.2)] hover:bg-primary/30'}`}
                >
                  <IconPlus size={28} />
                  <span className="font-black italic uppercase tracking-widest text-[10px]">Point</span>
                </motion.button>
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={() => quickFill('A')}
                  className={`w-24 h-20 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border-2
                    ${scoreA === MATCH_RULES.POINTS_TO_WIN ? 'bg-primary text-on-primary border-primary shadow-lg' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-primary/50 hover:text-primary'}`}
                >
                  <IconCheck size={24} />
                  <span className="font-black italic uppercase tracking-widest text-[9px]">Winner</span>
                </motion.button>
              </div>
            </div>

            {/* VS Divider */}
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-outline/20 to-transparent"></div>
              <div className="w-8 h-8 rounded-full border-2 border-outline/10 flex items-center justify-center bg-surface">
                <span className="text-[10px] font-black italic text-on-surface-variant/40">VS</span>
              </div>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent via-outline/20 to-transparent"></div>
            </div>

            {/* Team Bravo */}
            <div className="relative group">
              <div className="flex items-center justify-between gap-4 mb-3">
                <div className="flex-1">
                  <span className="block text-[9px] font-black text-secondary/60 uppercase tracking-[0.4em] mb-1 manga-skew">
                    <span className="manga-skew-reverse block">TEAM BRAVO</span>
                  </span>
                  <div className="space-y-1">
                    {teamBPlayers ? teamBPlayers.map(p => (
                      <div key={p.id} className="flex items-center gap-2">
                        <h3 className={`text-xl font-headline font-black italic transform -skew-x-12 leading-tight ${scoreB === MATCH_RULES.POINTS_TO_WIN ? 'text-secondary' : 'text-on-surface'}`}>
                            {p.name.toUpperCase()}
                        </h3>
                        {isAdmin && onUpdateDragonBalls && (
                          <div className="flex items-center gap-1">
                            <motion.button 
                              whileTap={awardedDBPlayers.has(p.id) ? {} : { scale: 1.4 }}
                              disabled={awardedDBPlayers.has(p.id)}
                              onClick={() => {
                                onUpdateDragonBalls(p.id, 1);
                                setAwardedDBPlayers(prev => new Set(prev).add(p.id));
                              }}
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black transition-all ${
                                awardedDBPlayers.has(p.id)
                                  ? 'bg-zinc-800 text-zinc-600 border border-zinc-700 cursor-not-allowed opacity-50'
                                  : 'bg-aura-gold/20 text-aura-gold border border-aura-gold/40 hover:bg-aura-gold/40 hover:shadow-[0_0_15px_rgba(255,140,0,0.4)] active:bg-aura-gold active:text-black'
                              }`}
                            >
                              {awardedDBPlayers.has(p.id) ? '✓' : '+1DB'}
                            </motion.button>
                            <motion.button 
                              whileTap={{ scale: 0.8 }}
                              onClick={() => {
                                onUpdateDragonBalls(p.id, -1);
                                if (awardedDBPlayers.has(p.id)) {
                                  setAwardedDBPlayers(prev => {
                                    const next = new Set(prev);
                                    next.delete(p.id);
                                    return next;
                                  });
                                }
                              }}
                              className="w-7 h-7 rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700 flex items-center justify-center text-[9px] font-black hover:bg-zinc-700 transition-all"
                            >
                              -1
                            </motion.button>
                          </div>
                        )}
                      </div>
                    )) : (
                      <h3 className={`text-xl font-headline font-black italic transform -skew-x-12 leading-tight ${scoreB === MATCH_RULES.POINTS_TO_WIN ? 'text-secondary' : 'text-on-surface'}`}>
                          {teamBNames.toUpperCase()}
                      </h3>
                    )}
                  </div>
                </div>
                <div className={`text-6xl font-headline font-black italic transform -skew-x-12 ${scoreB === MATCH_RULES.POINTS_TO_WIN ? 'text-secondary animate-pulse' : 'text-on-surface'}`}>
                  {scoreB}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <motion.button 
                  whileTap={{ scale: 0.9 }}
                  onClick={() => decrement(setScoreB, scoreB, false)}
                  className="w-16 h-20 rounded-2xl bg-surface-variant/20 border-2 border-outline/5 text-on-surface-variant flex items-center justify-center hover:bg-surface-variant/40 transition-all"
                >
                  <IconMinus size={24} />
                </motion.button>
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={() => increment(setScoreB, scoreB, false)}
                  className={`flex-1 h-20 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border-2
                    ${scoreB === MATCH_RULES.POINTS_TO_WIN ? 'bg-surface-variant/10 border-outline/5 text-on-surface-variant/30' : 'bg-secondary/20 border-secondary/40 text-secondary shadow-[0_0_20px_rgba(30,64,175,0.2)] hover:bg-secondary/30'}`}
                >
                  <IconPlus size={28} />
                  <span className="font-black italic uppercase tracking-widest text-[10px]">Point</span>
                </motion.button>
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={() => quickFill('B')}
                  className={`w-24 h-20 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border-2
                    ${scoreB === MATCH_RULES.POINTS_TO_WIN ? 'bg-secondary text-on-secondary border-secondary shadow-lg' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-secondary/50 hover:text-secondary'}`}
                >
                  <IconCheck size={24} />
                  <span className="font-black italic uppercase tracking-widest text-[9px]">Winner</span>
                </motion.button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="px-8 py-8 bg-surface/80 border-t-2 border-outline/5 space-y-6 relative z-10">
          <div className="h-6 flex items-center justify-center">
              <AnimatePresence>
                {isBagel && (
                  <motion.div 
                    initial={{ scale: 0, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0 }}
                    className="transform -skew-x-12"
                  >
                      <span className="text-[10px] font-black text-destructive uppercase tracking-[0.4em] border-2 border-destructive/40 px-4 py-1.5 rounded-xl bg-destructive/10 shadow-[0_0_20px_rgba(239,68,68,0.2)] skew-x-12 block">
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
                      <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em] border-2 border-primary/40 px-4 py-1.5 rounded-xl bg-primary/10 shadow-[0_0_20px_rgba(255,140,0,0.2)] skew-x-12 block">
                          ULTRA INSTINCT CLUTCH
                      </span>
                  </motion.div>
                )}
              </AnimatePresence>
          </div>
          
          <div className="flex gap-3">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  vibrate('medium');
                  onSave(0, 0);
                }}
                className="flex-1 h-16 rounded-2xl border-2 border-outline/10 bg-surface-variant/10 text-on-surface-variant/60 hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive flex flex-col items-center justify-center gap-0.5 transition-all"
              >
                <IconX size={18} />
                <span className="text-[9px] font-black uppercase tracking-widest">SKIP</span>
              </motion.button>

              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleHighlightClick}
                className={`flex-1 h-20 rounded-3xl border-2 flex flex-col items-center justify-center gap-1 transition-all relative overflow-hidden group/highlight
                    ${highlightFlash ? 'bg-primary border-primary text-on-primary shadow-[0_0_30px_rgba(168,85,247,0.6)]' : 'bg-surface-variant/20 border-outline/10 text-on-surface-variant hover:border-primary/50 hover:text-primary'}`}
              >
                <div className={`absolute inset-0 bg-primary/10 opacity-0 group-hover/highlight:opacity-100 transition-opacity`}></div>
                <IconFlame size={24} className={highlightFlash ? 'animate-bounce' : ''} />
                <span className="text-[10px] font-black uppercase tracking-widest">Highlight ({highlightCount})</span>
              </motion.button>

              <motion.button 
                whileHover={valid ? { scale: 1.02 } : {}}
                whileTap={valid ? { scale: 0.98 } : {}}
                onClick={handleSave}
                disabled={!valid}
                className={`flex-[2] h-20 font-headline font-black italic text-xl uppercase tracking-[0.3em] rounded-3xl flex items-center justify-center gap-4 transition-all duration-700 shadow-2xl overflow-hidden relative group/save transform -skew-x-12
                    ${valid 
                        ? 'bg-primary text-on-primary border-2 border-primary/50 aura-glow' 
                        : 'bg-surface-variant/20 text-on-surface-variant/40 border-2 border-outline/5 cursor-not-allowed'}`}
              >
                {valid && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover/save:animate-shimmer"></div>}
                <span className="relative z-10 skew-x-12 flex items-center gap-3">
                  {valid ? 'SEAL SAGA' : 'INVALID'}
                  {valid && <IconCheck size={28} className="fill-white" />}
                </span>
              </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ScoreModal;
