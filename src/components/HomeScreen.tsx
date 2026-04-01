
import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { IconZap, IconPlay, IconActivity, IconAlert, IconCheck, IconX, IconTrophy, IconUsers } from './ui/Icons';
import { League, Player } from '../types';
import { analyzeSagaIntegrity } from '../utils/leagueLogic';

interface HomeScreenProps {
  onNavigate: (tab: any) => void;
  isAdmin?: boolean;
  onLogout?: () => void;
  activeLeague?: League | null;
  players?: Player[];
  isDarkMode?: boolean;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate, isAdmin, onLogout, activeLeague, players, isDarkMode }) => {
  
  const integrity = useMemo(() => {
      if (!isAdmin || !activeLeague || !players) return null;
      return analyzeSagaIntegrity(activeLeague, players);
  }, [isAdmin, activeLeague, players]);

  const sagaTitle = activeLeague?.name || 'PICKLEBALL Z';
  const sagaSubtitle = activeLeague?.status === 'completed' ? 'SAGA CONCLUDED' : 'THE ULTIMATE BATTLE';
  const sagaStatus = activeLeague?.status === 'completed' ? 'RESULTS SEALED' : 'SAGA IN PROGRESS';

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 100 }
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center min-h-[90vh] text-center -mx-4 -mt-4 -mb-32 w-[calc(100%+2rem)] relative overflow-hidden pt-12 transition-colors duration-500"
    >
      
      {/* Background Contrast Split */}
      <div className="absolute inset-0 flex pointer-events-none opacity-30 z-0">
          <div className="flex-1 bg-gradient-to-br from-primary/30 to-transparent blur-[120px] -translate-x-1/2 transition-colors duration-500"></div>
          <div className="flex-1 bg-gradient-to-bl from-secondary/30 to-transparent blur-[120px] translate-x-1/2 transition-colors duration-500"></div>
      </div>

      {/* Character Image Section (Prominent DBZ Warrior) */}
      <motion.div 
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 0.07, x: 20 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="absolute top-0 right-0 w-[400px] h-[400px] pointer-events-none -translate-y-20 overflow-hidden z-0"
      >
          <img 
              src="https://images.unsplash.com/photo-1607604276483-4efdd6d43bb6?auto=format&fit=crop&q=80&w=1200" 
              alt="Warrior" 
              className="w-full h-full object-cover grayscale brightness-200 contrast-150 mix-blend-screen animate-pulse-slow"
              referrerPolicy="no-referrer"
          />
      </motion.div>

      {/* Main Content Group */}
      <div className="relative z-20 flex flex-col items-center gap-10 flex-1 justify-center pb-12 w-full max-w-lg px-6">
        
        {/* Logo Section */}
        <motion.div variants={itemVariants} className="relative group">
            <div className="absolute inset-0 bg-primary/40 blur-[60px] rounded-full animate-pulse-slow group-hover:bg-primary/60 transition-all duration-1000"></div>
            <motion.div 
              whileHover={{ rotate: 12, scale: 1.1 }}
              className="relative z-10 animate-float"
            >
                <div className="w-32 h-32 rounded-[2.5rem] bg-surface border-4 border-primary/30 shadow-[0_0_60px_rgba(168,85,247,0.4)] flex items-center justify-center relative overflow-hidden aura-glow transition-all duration-700">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-secondary/20"></div>
                    <div className="text-6xl text-primary font-headline font-black italic drop-shadow-2xl transform -skew-x-12">Z</div>
                </div>
            </motion.div>
        </motion.div>
        
        {/* Title Section */}
        <motion.div variants={itemVariants} className="space-y-4 relative z-10">
            <div className="manga-skew inline-block">
                <h1 className="text-7xl font-headline font-black italic tracking-tighter drop-shadow-2xl manga-skew-reverse">
                    <span className="text-on-surface">{sagaTitle.split(' ')[0]}</span>
                    <span className="text-primary"> {sagaTitle.split(' ').slice(1).join(' ')}</span>
                </h1>
            </div>
            <div className="flex items-center justify-center gap-6">
                <div className="h-0.5 w-12 bg-gradient-to-r from-transparent to-primary/60"></div>
                <p className="text-primary font-black uppercase tracking-[0.6em] text-xs animate-pulse drop-shadow-sm">
                    {sagaSubtitle}
                </p>
                <div className="h-0.5 w-12 bg-gradient-to-l from-transparent to-primary/60"></div>
            </div>
        </motion.div>

        {/* Stats Grid (Bento Style) */}
        <div className="grid grid-cols-2 gap-4 w-full relative z-10">
            <motion.div 
              variants={itemVariants}
              whileHover={{ y: -5, scale: 1.02 }}
              className="relative overflow-hidden bg-surface/80 backdrop-blur-md border-2 border-primary/10 p-6 rounded-[2rem] flex flex-col items-center gap-2 shadow-xl manga-shadow group/stat hover:border-primary/30 transition-all"
            >
                <div className="absolute top-0 right-0 w-12 h-12 bg-primary/5 -translate-y-6 translate-x-6 rounded-full group-hover/stat:scale-150 transition-transform duration-700"></div>
                <IconUsers size={24} className="text-primary" />
                <span className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-[0.3em]">WARRIORS</span>
                <span className="text-3xl font-headline font-black text-on-surface italic transform -skew-x-12">{players?.length || 0}</span>
            </motion.div>
            <motion.div 
              variants={itemVariants}
              whileHover={{ y: -5, scale: 1.02 }}
              className="relative overflow-hidden bg-surface/80 backdrop-blur-md border-2 border-secondary/10 p-6 rounded-[2rem] flex flex-col items-center gap-2 shadow-xl manga-shadow group/stat hover:border-secondary/30 transition-all"
            >
                <div className="absolute top-0 right-0 w-12 h-12 bg-secondary/5 -translate-y-6 translate-x-6 rounded-full group-hover/stat:scale-150 transition-transform duration-700"></div>
                <IconTrophy size={24} className="text-secondary" />
                <span className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-[0.3em]">BATTLES</span>
                <span className="text-3xl font-headline font-black text-on-surface italic transform -skew-x-12">{activeLeague?.matches?.length || 0}</span>
            </motion.div>
        </div>

        {/* Buttons Section */}
        <div className="flex flex-col gap-5 w-full relative z-20">
            <motion.button 
                variants={itemVariants}
                whileHover={{ scale: 1.02, x: 5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigate('league')}
                className="group relative bg-primary text-on-primary font-headline font-black italic uppercase tracking-[0.3em] py-7 px-10 rounded-[2.5rem] shadow-2xl shadow-primary/40 transition-all flex items-center justify-center gap-4 text-2xl transform -skew-x-12 overflow-hidden aura-glow"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
                <span className="relative z-10 skew-x-12 flex items-center gap-4">
                  SAGA BATTLE <IconPlay size={32} className="fill-white" />
                </span>
            </motion.button>
            
            <motion.button 
                variants={itemVariants}
                whileHover={{ scale: 1.02, x: -5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigate('leaderboards')}
                className="group relative bg-surface border-2 border-outline/10 text-on-surface font-headline font-black italic uppercase tracking-[0.2em] py-5 px-10 rounded-[2rem] hover:bg-surface-variant/10 hover:border-primary/30 transition-all transform -skew-x-12 overflow-hidden"
            >
                <div className="absolute inset-0 bg-primary/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                <span className="relative z-10 skew-x-12 block">
                  HALL OF FAME
                </span>
            </motion.button>
        </div>

      </div>

      {/* Saga Elements Section */}
      <motion.div 
        variants={itemVariants}
        className="relative z-10 flex flex-col items-center pb-32 pointer-events-none"
      >
          <div className="text-[160px] leading-none filter drop-shadow-[0_0_60px_rgba(168,85,247,0.4)] animate-pulse-slow opacity-80 transform scale-x-[-1] relative z-0">
            🐉
          </div>
          <p className="text-[10px] font-black text-primary uppercase tracking-[0.6em] -mt-6 mb-10 drop-shadow-md">
            {sagaStatus}
          </p>
          
          {/* Dragon Balls */}
          <div className="flex gap-5 -mt-12 relative z-10">
            {[...Array(7)].map((_, i) => (
                <motion.div 
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1 + (i * 0.1), type: 'spring' }}
                  key={i} 
                  className="w-10 h-10 rounded-full bg-surface border-2 border-primary/30 shadow-[0_0_20px_rgba(168,85,247,0.4)] flex items-center justify-center relative overflow-hidden group"
                  style={{ 
                      animation: `float ${4 + i * 0.4}s ease-in-out infinite`, 
                      animationDelay: `${i * 0.2}s`,
                      marginTop: `${Math.abs(i - 3) * 10}px` // Arch effect
                  }}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent"></div>
                    <div className="text-primary font-black text-xs relative z-10">★</div>
                </motion.div>
            ))}
          </div>
      </motion.div>

      {/* Admin Integrity Protocol */}
      {isAdmin && (
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="relative z-20 mx-6 mb-12 p-5 bg-on-surface text-surface border-2 border-primary rounded-lg shadow-2xl max-w-sm w-full text-left"
        >
            <div className="flex justify-between items-start mb-4 border-b border-surface/20 pb-3">
                <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                        <IconActivity size={14} className="text-primary-container" /> SAGA INTEGRITY PROTOCOL
                    </h3>
                    <p className="text-[8px] font-mono text-surface/60 uppercase mt-1">SYS.ADMIN.V8.0</p>
                </div>
                {activeLeague && integrity && (
                    <div className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-wider ${integrity.status === 'valid' ? 'bg-green-900/30 text-green-400 border border-green-900' : 'bg-red-900/30 text-red-400 border border-red-900'}`}>
                        {integrity.status === 'valid' ? 'STATUS: NOMINAL' : 'STATUS: ALERT'}
                    </div>
                )}
            </div>

            {activeLeague && integrity ? (
                <div className="space-y-3 mb-6 font-mono">
                    {integrity.warnings.length === 0 ? (
                        <div className="flex items-center gap-3 p-3 bg-surface/5 rounded border border-surface/10">
                            <IconCheck size={14} className="text-green-400" />
                            <p className="text-[9px] text-surface/80 uppercase">
                                No scheduling anomalies detected.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {integrity.warnings.map((w) => (
                                <div key={w} className="flex items-start gap-2 p-2 bg-red-950/20 rounded border border-red-900/50">
                                    <IconAlert size={14} className="text-red-400 shrink-0 mt-0.5" />
                                    <span className="text-[9px] text-red-300 uppercase leading-relaxed">{w}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center py-4 mb-4 border border-dashed border-surface/20 rounded bg-surface/5">
                    <p className="text-[9px] text-surface/40 font-bold uppercase tracking-widest">Data Stream Offline</p>
                </div>
            )}

            <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onLogout}
                className="w-full py-3 bg-red-900/20 hover:bg-red-900/40 border border-red-900/50 text-red-400 hover:text-red-300 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
            >
                <IconX size={14} /> TERMINATE SESSION
            </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default HomeScreen;
