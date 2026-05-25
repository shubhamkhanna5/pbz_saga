
import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { IconZap, IconPlay, IconActivity, IconAlert, IconCheck, IconX, IconTrophy, IconUsers } from './ui/Icons';
import { League, Player } from '../types';
import { analyzeSagaIntegrity } from '../utils/leagueLogic';
import homeIcon from './icon.png';

// ==========================================
// CODE-BASED BACKGROUND CONFIGURATION
// You may change the image URL below to set your own custom backdrop.
// ==========================================
export const HOME_BACKGROUND_IMAGE = "https://i.pinimg.com/736x/ec/5a/df/ec5adf338ac07dcc22b59fe0e9894283.jpg";

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

  const allCustomMatches = useMemo(() => {
    if (!activeLeague?.days) return [];
    const custom: any[] = [];
    activeLeague.days.forEach(day => {
      (day.matches || []).forEach(match => {
        const isCustom = match.isCustom || 
                        (match as any).is_custom || 
                        (match.events && Array.isArray(match.events) && match.events.some((e: any) => e.type === 'custom_marker')) ||
                        (typeof match.events === 'string' && (match.events as string).includes('custom_marker'));
        
        if (isCustom) {
          custom.push({ ...match, dayNumber: day.day });
        }
      });
    });
    return custom.sort((a, b) => {
      if (a.timestamp && b.timestamp) return b.timestamp - a.timestamp;
      if (a.dayNumber !== b.dayNumber) return b.dayNumber - a.dayNumber;
      return (b.orderIndex || 0) - (a.orderIndex || 0);
    });
  }, [activeLeague]);

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
      className="flex flex-col items-center justify-between h-[calc(100vh-11rem)] xs:h-[calc(100dvh-10.5rem)] w-full text-center relative overflow-hidden transition-colors duration-500 py-3"
    >
      
      {/* Background Contrast Split */}
      <div className="absolute inset-0 flex pointer-events-none opacity-30 z-0">
          <div className="flex-1 bg-gradient-to-br from-primary/30 to-transparent blur-[120px] -translate-x-1/2 transition-colors duration-500"></div>
          <div className="flex-1 bg-gradient-to-bl from-secondary/30 to-transparent blur-[120px] translate-x-1/2 transition-colors duration-500"></div>
      </div>

      {/* Background Standoff Art (Goku and Vegeta Vibes) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <img 
            src={HOME_BACKGROUND_IMAGE} 
            alt="Goku vs Vegeta Confrontation"
            className="w-full h-full object-cover object-[center_35%] filter brightness-[0.6] contrast-[1.1] saturate-[1.1] scale-105 select-none"
            referrerPolicy="no-referrer"
          />
          {/* Subtle Overlay Gradients for Perfect Contrast and Depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-zinc-950/50"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,#090514_80%)] opacity-60"></div>
      </div>

      {/* Main Content Group */}
      <div className="relative z-20 flex flex-col items-center gap-5 sm:gap-6 flex-1 justify-center w-full max-w-md px-4">
        
        {/* Header Branding Group (Icon and Title closer) */}
        <div className="flex flex-col items-center gap-2 relative z-10 w-full mb-1">
            {/* Logo Section */}
            <motion.div variants={itemVariants} className="relative group">
                <motion.div 
                  whileHover={{ rotate: 12, scale: 1.1 }}
                  className="relative z-10 animate-float"
                >
                    <img 
                      src={homeIcon} 
                      alt="Frieza Icon" 
                      className="w-24 h-24 sm:w-28 sm:h-28 object-contain"
                    />
                </motion.div>
            </motion.div>
            
            {/* Title Section */}
            <motion.div variants={itemVariants} className="space-y-2 text-center">
                <div className="manga-skew inline-block">
                    <h1 className="text-4xl sm:text-5xl font-headline font-black italic tracking-tighter drop-shadow-2xl manga-skew-reverse">
                        <span className="text-on-surface">{sagaTitle.split(' ')[0]}</span>
                        <span className="text-primary"> {sagaTitle.split(' ').slice(1).join(' ')}</span>
                    </h1>
                </div>
                <div className="flex items-center justify-center gap-4">
                    <div className="h-0.5 w-8 bg-gradient-to-r from-transparent to-primary/60"></div>
                    <p className="text-primary font-black uppercase tracking-[0.4em] text-[10px] animate-pulse drop-shadow-sm">
                        {sagaSubtitle}
                    </p>
                    <div className="h-0.5 w-8 bg-gradient-to-l from-transparent to-primary/60"></div>
                </div>
            </motion.div>
        </div>

        {/* Stats Grid - Warriors Count only - Compact */}
        <div className="w-full relative z-10">
            <motion.div 
              variants={itemVariants}
              whileHover={{ y: -3, scale: 1.01 }}
              className="relative overflow-hidden bg-surface/80 backdrop-blur-md border border-primary/10 py-3 px-5 rounded-[1.5rem] flex items-center justify-between shadow-xl manga-shadow group/stat hover:border-primary/30 transition-all"
            >
                <div className="absolute top-0 right-0 w-12 h-12 bg-primary/5 -translate-y-6 translate-x-6 rounded-full group-hover/stat:scale-150 transition-transform duration-700"></div>
                <div className="flex items-center gap-3">
                    <IconUsers size={20} className="text-primary" />
                    <span className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-[0.2em]">ACTIVE Z-FIGHTERS</span>
                </div>
                <span className="text-2xl font-headline font-black text-on-surface italic transform -skew-x-12">{players?.length || 0}</span>
            </motion.div>
        </div>

        {/* Buttons Section */}
        <div className="flex flex-col gap-3 w-full relative z-20">
            <motion.button 
                variants={itemVariants}
                whileHover={{ scale: 1.02, x: 2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigate('league')}
                className="group relative bg-primary text-on-primary font-headline font-black italic uppercase tracking-[0.2em] py-4.5 px-6 rounded-[1.5rem] shadow-xl shadow-primary/30 transition-all flex items-center justify-center gap-3 text-lg transform -skew-x-6 overflow-hidden aura-glow"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
                <span className="relative z-10 skew-x-6 flex items-center gap-2">
                  SAGA BATTLE <IconPlay size={20} className="fill-white" />
                </span>
            </motion.button>
            
            <motion.button 
                variants={itemVariants}
                whileHover={{ scale: 1.02, x: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigate('leaderboards')}
                className="group relative bg-surface border-2 border-outline/10 text-on-surface font-headline font-black italic uppercase tracking-[0.15em] py-3.5 px-6 rounded-[1.5rem] hover:bg-surface-variant/10 hover:border-primary/30 transition-all transform -skew-x-6 overflow-hidden text-sm"
            >
                <div className="absolute inset-0 bg-primary/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                <span className="relative z-10 skew-x-6 block">
                  HALL OF FAME
                </span>
            </motion.button>
        </div>

      </div>



      {/* Admin Integrity Protocol */}
      {isAdmin && (
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="relative z-20 mx-4 mb-3 p-3.5 bg-on-surface text-surface border border-primary rounded-xl shadow-xl max-w-sm w-full text-left"
        >
            <div className="flex justify-between items-start mb-2.5 border-b border-surface/20 pb-2">
                <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                        <IconActivity size={14} className="text-primary-container" /> SAGA INTEGRITY PROTOCOL
                    </h3>
                    <p className="text-[8px] font-mono text-surface/60 uppercase mt-0.5">SYS.ADMIN.V8.0</p>
                </div>
                {activeLeague && integrity && (
                    <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${integrity.status === 'valid' ? 'bg-green-900/30 text-green-400 border border-green-900' : 'bg-red-900/30 text-red-400 border border-red-900'}`}>
                        {integrity.status === 'valid' ? 'STATUS: NOMINAL' : 'STATUS: ALERT'}
                    </div>
                )}
            </div>

            {activeLeague && integrity ? (
                <div className="space-y-2 mb-3 font-mono">
                    {integrity.warnings.length === 0 ? (
                        <div className="flex items-center gap-2 px-2 py-1.5 bg-surface/5 rounded border border-surface/10">
                            <IconCheck size={12} className="text-green-400" />
                            <p className="text-[9px] text-surface/80 uppercase">
                                No scheduling anomalies detected.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            {integrity.warnings.map((w) => (
                                <div key={w} className="flex items-start gap-1.5 p-1.5 bg-red-950/20 rounded border border-red-900/50">
                                    <IconAlert size={12} className="text-red-400 shrink-0 mt-0.5" />
                                    <span className="text-[9px] text-red-300 uppercase leading-relaxed">{w}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center py-2 mb-3 border border-dashed border-surface/20 rounded bg-surface/5">
                    <p className="text-[9px] text-surface/40 font-bold uppercase tracking-widest">Data Stream Offline</p>
                </div>
            )}

            <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onLogout}
                className="w-full py-2 bg-red-900/20 hover:bg-red-900/40 border border-red-900/50 text-red-400 hover:text-red-300 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
            >
                <IconX size={14} /> TERMINATE SESSION
            </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default HomeScreen;
