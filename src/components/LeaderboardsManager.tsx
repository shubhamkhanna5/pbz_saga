import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Player, League, Tournament, LeagueStanding } from '../types';
import { useRealtimeLeaderboard } from '../hooks/useRealtimeLeaderboard';
import { getLeagueStats } from '../services/leagueHistoryService';
import { calculatePowerLevel, getAuraClass } from '../utils/godMode';
import { IconTrophy, IconClock, IconZap, IconFlame, IconSword, IconDumbbell, IconAlert, IconTrendingUp, IconActivity } from './ui/Icons';
import { calculateStandings as calculateTournamentStandings } from '../utils/tournamentLogic';
import { calculateLeagueStandings } from '../utils/leagueLogic';
import PlayerProfileModal from './PlayerProfileModal';

interface LeaderboardsManagerProps {
  players: Player[];
  activeLeague: League | null;
  activeTournament: Tournament | null;
  pastLeagues: League[];
  pastTournaments: Tournament[];
  onResetStats?: () => void;
  isAdmin?: boolean;
  isDarkMode?: boolean;
}

type Tab = 'league' | 'live';

// Hardcoded data for Saiyan Saga (p30d9dm1x)
const SAIYAN_SAGA_HARDCODED_STANDINGS = [
  { playerId: "oe3skdcma", points: 88.4, wins: 24, losses: 10, gamesPlayed: 34, ppg: 2.60, bonusPoints: 3, noShows: 1, eligibleForTrophies: true, elo: 1250 },
  { playerId: "awqcz4mq6", points: 68.0, wins: 17, losses: 10, gamesPlayed: 27, ppg: 2.52, bonusPoints: 1, noShows: 0, eligibleForTrophies: true, elo: 1220 },
  { playerId: "fuowaw9d0", points: 67.2, wins: 16, losses: 11, gamesPlayed: 27, ppg: 2.49, bonusPoints: 3, noShows: 0, eligibleForTrophies: true, elo: 1215 },
  { playerId: "d7xlrfvdn", points: 64.8, wins: 17, losses: 10, gamesPlayed: 27, ppg: 2.40, bonusPoints: 2, noShows: 3, eligibleForTrophies: true, elo: 1210 },
  { playerId: "mrauy20h3", points: 59.8, wins: 16, losses: 10, gamesPlayed: 26, ppg: 2.30, bonusPoints: 2, noShows: 1, eligibleForTrophies: true, elo: 1205 },
  { playerId: "4p4zbvg98", points: 33.8, wins: 10, losses: 3, gamesPlayed: 13, ppg: 2.60, bonusPoints: 1, noShows: 1, eligibleForTrophies: false, elo: 1240 },
  { playerId: "uynls38wb", points: 90.3, wins: 24, losses: 19, gamesPlayed: 43, ppg: 2.10, bonusPoints: 6, noShows: 0, eligibleForTrophies: true, elo: 1180 },
  { playerId: "22rjubyro", points: 56.0, wins: 12, losses: 16, gamesPlayed: 28, ppg: 2.00, bonusPoints: 1, noShows: 0, eligibleForTrophies: true, elo: 1170 },
  { playerId: "8aic760jt", points: 50.6, wins: 11, losses: 21, gamesPlayed: 32, ppg: 1.58, bonusPoints: 8, noShows: 0, eligibleForTrophies: true, elo: 1150 },
  { playerId: "z64w1cs7r", points: 60.8, wins: 10, losses: 30, gamesPlayed: 40, ppg: 1.52, bonusPoints: 5, noShows: 2, eligibleForTrophies: true, elo: 1140 }
];

const LeaderboardsManager: React.FC<LeaderboardsManagerProps> = ({
  players,
  activeLeague,
  activeTournament,
  pastLeagues,
  pastTournaments,
  onResetStats,
  isAdmin,
  isDarkMode
}) => {
  const { 
    leaderboard: liveLeaderboard, 
    loading: liveLoading, 
    error: liveError 
  } = useRealtimeLeaderboard();

  const localActiveStandings = useMemo(() => {
    if (!activeLeague) return [];
    try {
      return calculateLeagueStandings(activeLeague);
    } catch (err) {
      console.error("Error calculating local standings:", err);
      return [];
    }
  }, [activeLeague]);
  
  const [activeTab, setActiveTab] = useState<Tab>('live');
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<{player: Player, standing: LeagueStanding} | null>(null);
  
  // Past League Standings State
  const [pastStandings, setPastStandings] = useState<any[]>([]);
  const [isPastLoading, setIsPastLoading] = useState(false);
  const [pastError, setPastError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Sorting State
  const [leagueSort, setLeagueSort] = useState<'points' | 'ppg' | 'elo'>('ppg');

  // Fetch past standings when selectedLeagueId changes
  useEffect(() => {
    if (activeTab !== 'league') return;

    const allLeagues = [...(pastLeagues || [])];
    if (activeLeague) allLeagues.unshift(activeLeague);
    const uniqueLeagues = allLeagues.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
    const targetId = selectedLeagueId || uniqueLeagues[0]?.id;

    if (!targetId) return;

    // If it's the active league, we use liveLeaderboard from the hook
    if (activeLeague && targetId === activeLeague.id) {
        setPastStandings([]);
        return;
    }

    const fetchPast = async () => {
        setIsPastLoading(true);
        setPastError(null);
        try {
            const stats = await getLeagueStats(targetId);
            setPastStandings(stats);
        } catch (err: any) {
            console.error("Error fetching past league stats:", err);
            setPastError(err.message || "Failed to fetch standings");
        } finally {
            setIsPastLoading(false);
        }
    };

    fetchPast();
  }, [selectedLeagueId, activeTab, activeLeague, pastLeagues, retryCount]);

  const getPlayer = (id: string) => players.find(p => String(p.id) === String(id));

  const renderLeague = () => {
    const allLeagues = [...(pastLeagues || [])];
    if (activeLeague) allLeagues.unshift(activeLeague);
    
    const uniqueLeagues = allLeagues.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
    
    if (uniqueLeagues.length === 0) {
        return (
            <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6">
                <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4 border-2 border-zinc-800">
                    <IconTrophy className="w-8 h-8 text-zinc-700" />
                </div>
                <h3 className="text-lg font-black text-white uppercase italic mb-2">No Sagas Documented</h3>
                <p className="text-zinc-500 text-xs max-w-[200px]">The history books are empty. Complete a saga to see it here.</p>
            </div>
        );
    }

    const targetLeague = uniqueLeagues.find(l => l.id === selectedLeagueId) || uniqueLeagues[0];
    
    // ✅ USE SUPABASE DATA INSTEAD OF LOCAL RECOMPUTATION
    const isTargetActive = activeLeague && targetLeague.id === activeLeague.id;
    
    // Hardcoded override for Saiyan Saga
    let rawStandings = [];
    if (targetLeague.id === 'p30d9dm1x') {
        rawStandings = SAIYAN_SAGA_HARDCODED_STANDINGS;
    } else if (isTargetActive && localActiveStandings.length > 0) {
        rawStandings = localActiveStandings;
    } else {
        rawStandings = isTargetActive 
          ? (liveLeaderboard.length > 0 ? liveLeaderboard : (targetLeague.finalStandings || []))
          : (pastStandings.length > 0 ? pastStandings : (targetLeague.finalStandings || []));
    }

    console.log("RAW STANDINGS:", rawStandings);

    // Fallback to league.players if standings are still empty (old data format)
    let standings = (rawStandings || []).map(p => {
      const wins = p.wins || 0;
      const losses = p.losses || 0;
      const gamesPlayed = p.gamesPlayed || p.games_played || (wins + losses) || 0;
      const points = p.points || p.totalPoints || p.total_points || 0;
      const ppg = p.ppg || (gamesPlayed > 0 ? points / gamesPlayed : 0);
      
      return {
        playerId: p.playerId || p.player_id || p.id,
        wins,
        losses,
        points,
        ppg,
        gamesPlayed,
        elo: p.elo || 1200,
        eligibleForTrophies: true,
        ppgHistory: []
      };
    });

    if (standings.length === 0 && targetLeague.players && targetLeague.players.length > 0) {
        // If we have player names but no standings, create dummy standings for display
        standings = targetLeague.players.map(playerName => {
            const p = players.find(pl => pl.name === playerName);
            return {
                playerId: p?.id || playerName,
                wins: 0,
                losses: 0,
                points: 0,
                ppg: 0,
                gamesPlayed: 0,
                elo: 1200,
                eligibleForTrophies: false,
                ppgHistory: []
            };
        });
    }

    const sortedStandings = [...standings]
    .filter((v, i, a) => a.findIndex(t => t.playerId === v.playerId) === i) // Deduplicate by playerId
    .sort((a, b) => {
        if (leagueSort === 'elo') {
            return b.elo - a.elo || b.points - a.points;
        }
        if (leagueSort === 'ppg') {
            return b.ppg - a.ppg || b.points - a.points || b.wins - a.wins;
        }
        return b.points - a.points || b.ppg - a.ppg || b.wins - a.wins;
    });
    
    // getPlayer override locally to use main players list
    const getLeaguePlayer = (id: string) => players.find(p => String(p.id) === String(id)) || players.find(p => p.name === id);

    // Get top performers from the CORRECT standings
    const topPPG = sortedStandings.length > 0 
        ? sortedStandings.reduce((best, s) => (s.gamesPlayed > 0 && s.ppg > best.ppg) ? s : best, sortedStandings[0])
        : null;

    const mostWins = sortedStandings.length > 0
        ? sortedStandings.reduce((best, s) => s.wins > best.wins ? s : best, sortedStandings[0])
        : null;

    const ironman = sortedStandings.length > 0
        ? sortedStandings.reduce((best, s) => s.gamesPlayed > best.gamesPlayed ? s : best, sortedStandings[0])
        : null;

    const getPlayerName = (id: string) => getLeaguePlayer(id)?.name || 'Unknown';

    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-5"
      >
        {/* Selector */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {uniqueLeagues.map(l => (
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    key={l.id}
                    onClick={() => setSelectedLeagueId(l.id)}
                    className={`shrink-0 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                        targetLeague.id === l.id 
                        ? 'bg-primary border-primary text-on-primary shadow-xl' 
                        : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                    }`}
                >
                    {l.status === 'active' ? '⚡ ' : ''}{l.name || 'Unnamed Saga'}
                </motion.button>
            ))}
        </div>

        {/* Awards */}
        <div className="grid grid-cols-3 gap-3">
             {topPPG && topPPG.gamesPlayed > 0 && (
               <motion.div 
                 initial={{ opacity: 0, y: 20, scale: 0.9 }}
                 animate={{ opacity: 1, y: 0, scale: 1 }}
                 transition={{ 
                   type: "spring",
                   stiffness: 260,
                   damping: 20,
                   delay: 0.1 
                 }}
                 whileHover={{ y: -5, transition: { duration: 0.2 } }}
                 className="bg-zinc-950 border-2 border-aura-red/30 rounded-2xl p-3 text-center relative overflow-hidden group"
               >
                 <div className="absolute inset-0 bg-aura-red/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 <div className="text-[8px] font-black text-aura-red uppercase mb-1 tracking-tighter">🔥 DANGEROUS</div>
                 <div className="text-[10px] font-black text-white truncate italic">{getPlayerName(topPPG.playerId)}</div>
                 <div className="text-[8px] text-zinc-600 font-mono">{topPPG.ppg.toFixed(2)} PPG</div>
                 {topPPG.eligibleForTrophies && (
                    <div className="text-[6px] text-aura-gold mt-1 font-black animate-pulse">🏆 ELIGIBLE</div>
                 )}
               </motion.div>
             )}
             {mostWins && mostWins.wins > 0 && (
               <motion.div 
                 initial={{ opacity: 0, y: 20, scale: 0.9 }}
                 animate={{ opacity: 1, y: 0, scale: 1 }}
                 transition={{ 
                   type: "spring",
                   stiffness: 260,
                   damping: 20,
                   delay: 0.2 
                 }}
                 whileHover={{ y: -5, transition: { duration: 0.2 } }}
                 className="bg-zinc-950 border-2 border-primary/30 rounded-2xl p-3 text-center relative overflow-hidden group"
               >
                 <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 <div className="text-[8px] font-black text-primary uppercase mb-1 tracking-tighter">⚔️ VICTORIES</div>
                 <div className="text-[10px] font-black text-white truncate italic">{getPlayerName(mostWins.playerId)}</div>
                 <div className="text-[8px] text-zinc-600 font-mono">{mostWins.wins} Wins</div>
               </motion.div>
             )}
             {ironman && ironman.gamesPlayed > 0 && (
               <motion.div 
                 initial={{ opacity: 0, y: 20, scale: 0.9 }}
                 animate={{ opacity: 1, y: 0, scale: 1 }}
                 transition={{ 
                   type: "spring",
                   stiffness: 260,
                   damping: 20,
                   delay: 0.3 
                 }}
                 whileHover={{ y: -5, transition: { duration: 0.2 } }}
                 className="bg-zinc-950 border-2 border-aura-purple/30 rounded-2xl p-3 text-center relative overflow-hidden group"
               >
                 <div className="absolute inset-0 bg-aura-purple/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 <div className="text-[8px] font-black text-aura-purple uppercase mb-1 tracking-tighter">🛡️ IRON BODY</div>
                 <div className="text-[10px] font-black text-white truncate italic">{getPlayerName(ironman.playerId)}</div>
                 <div className="text-[8px] text-zinc-600 font-mono">{ironman.gamesPlayed} GP</div>
               </motion.div>
             )}
        </div>

        {/* Standings */}
        <div className="bg-zinc-950 rounded-[2.5rem] border-2 border-white/5 overflow-hidden p-6 space-y-6">
             <div className="text-center relative">
                 <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">{targetLeague.name}</h3>
                 <div className="flex items-center justify-center gap-2 mt-1">
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded ${targetLeague.status === 'active' ? 'bg-primary text-on-primary' : 'bg-zinc-800 text-zinc-500'}`}>
                        {targetLeague.status === 'active' ? 'ARC ACTIVE' : 'SAGA SEALED'}
                    </span>
                 </div>
             </div>

             {/* SORT TOGGLE REMOVED - SORTED BY PPG ONLY */}
             <div className="flex justify-between items-center">
                <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                    {isPastLoading && <span className="animate-pulse">Loading Standings...</span>}
                    {pastError && (
                        <div className="flex items-center gap-2">
                            <span className="text-aura-red">Error: {pastError}</span>
                            <button 
                                onClick={() => setRetryCount(prev => prev + 1)}
                                className="px-2 py-1 bg-zinc-900 rounded-lg text-primary hover:bg-zinc-800 transition-colors"
                            >
                                Retry
                            </button>
                        </div>
                    )}
                    {!isPastLoading && !pastError && <span>Ranked by Efficiency (PPG)</span>}
                </div>
             </div>

             <div className="space-y-3">
                 <AnimatePresence mode="popLayout">
                 {sortedStandings.map((s, idx) => {
                     const p = getLeaguePlayer(s.playerId);
                     const isChamp = idx === 0 && targetLeague.status === 'completed' && s.eligibleForTrophies;
                     
                     // ✅ Calculate trend from ppgHistory (preserve full precision comparison)
                     const trend = s.ppgHistory && s.ppgHistory.length >= 2
                        ? (s.ppgHistory[s.ppgHistory.length - 1] > s.ppgHistory[s.ppgHistory.length - 2] ? '↑' : 
                           s.ppgHistory[s.ppgHistory.length - 1] < s.ppgHistory[s.ppgHistory.length - 2] ? '↓' : '→')
                        : '→';
                     
                     const trendColor = trend === '↑' ? 'text-green-500' : trend === '↓' ? 'text-aura-red' : 'text-zinc-700';
                     const isAbsent = p && !p.isPresent;

                     return (
                         <motion.div 
                             layout
                             initial={{ opacity: 0, x: -20 }}
                             animate={{ opacity: 1, x: 0 }}
                             exit={{ opacity: 0, scale: 0.95 }}
                             transition={{ 
                                 duration: 0.3, 
                                 delay: idx * 0.03,
                                 layout: { type: "spring", stiffness: 300, damping: 30 }
                             }}
                             whileHover={{ x: 5, backgroundColor: "rgba(255,255,255,0.03)" }}
                             key={`${s.playerId}-${idx}`} 
                             onClick={() => p && setSelectedProfile({ player: p as any, standing: s })}
                             className={`group flex justify-between items-center p-4 rounded-2xl cursor-pointer transition-all border-2 ${
                                 isChamp 
                                     ? 'bg-aura-gold/10 border-aura-gold shadow-[0_0_20px_rgba(255,215,0,0.1)]' 
                                     : 'bg-zinc-900 border-transparent hover:border-white/10'
                             } ${isAbsent ? 'opacity-50 grayscale' : ''}`}
                         >
                             <div className="flex items-center gap-4">
                                 <div className={`w-8 h-8 flex items-center justify-center font-headline font-black italic transform -skew-x-12 ${
                                     isChamp ? 'text-aura-gold text-2xl' : idx < 3 ? 'text-primary text-sm' : 'text-zinc-600 text-sm'
                                 }`}>
                                     {isChamp ? '👑' : idx + 1}
                                 </div>
                                 <div>
                                     <div className={`font-headline font-black italic uppercase tracking-tight transform -skew-x-6 group-hover:text-primary transition-colors ${
                                         isChamp ? 'text-aura-gold' : 'text-white'
                                     }`}>
                                        {p?.name?.toUpperCase()}
                                        {s.eligibleForTrophies && !isChamp && <span className="ml-2 text-aura-gold text-[10px]">🏆</span>}
                                     </div>
                                     <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{s.wins}W / {s.losses}L</div>
                                 </div>
                             </div>
                             <div className="flex items-center gap-5">
                                 <div className={`text-sm font-black ${trendColor} w-4 text-center`}>{trend}</div>
                                 <div className="text-right">
                                     <div className={`text-base font-black italic ${leagueSort === 'points' ? 'text-white' : 'text-zinc-500'}`}>{leagueSort === 'elo' ? s.elo : s.points} {leagueSort === 'elo' ? 'ELO' : 'PTS'}</div>
                                     <div className={`text-[9px] font-mono uppercase ${leagueSort === 'ppg' ? 'text-primary font-bold' : 'text-zinc-600'}`}>{s.ppg.toFixed(2)} PPG</div>
                                 </div>
                             </div>
                         </motion.div>
                     )
                 })}
                 </AnimatePresence>
             </div>
        </div>
      </motion.div>
    );
  };

  const renderLive = () => {
    if (liveLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-6">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(168,85,247,0.4)]"></div>
                <div className="text-[10px] font-black text-primary uppercase tracking-[0.4em] animate-pulse">Connecting to Scouter Network...</div>
            </div>
        );
    }

    if (liveError) {
        if (liveError.includes('No active league found')) {
            return (
                <div className="flex flex-col items-center justify-center p-20 space-y-6 text-center">
                    <div className="w-24 h-24 bg-primary/10 rounded-[2rem] flex items-center justify-center border-4 border-primary/30 animate-float shadow-xl">
                        <IconTrophy className="w-12 h-12 text-primary" />
                    </div>
                    <div className="space-y-2">
                        <div className="text-2xl font-headline font-black text-on-surface uppercase italic tracking-tighter transform -skew-x-12">No Active Saga</div>
                        <div className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-widest max-w-[240px]">The battlefield is quiet. Activate a saga to see live rankings.</div>
                    </div>
                </div>
            );
        }
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-6 text-center">
                <div className="w-16 h-16 bg-red-900/20 rounded-2xl flex items-center justify-center border-2 border-red-500/30 shadow-lg">
                    <IconAlert size={32} className="text-red-500" />
                </div>
                <div className="space-y-2">
                    <div className="text-xl font-headline font-black text-red-500 uppercase italic tracking-tighter transform -skew-x-12">Saga Error</div>
                    <div className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-widest">{liveError}</div>
                </div>
            </div>
        );
    }

    const displayLeaderboard = activeLeague && localActiveStandings.length > 0
        ? localActiveStandings.map(s => ({
            playerId: s.playerId,
            name: players.find(pl => pl.id === s.playerId)?.name || s.playerId,
            points: s.points,
            gamesPlayed: s.gamesPlayed,
            wins: s.wins,
            ppg: s.ppg
          }))
        : (liveLeaderboard || []);

    const sortedLive = [...displayLeaderboard]
        .map(p => {
            const points = p.points || p.totalPoints || p.total_points || 0;
            const games = p.gamesPlayed || p.games_played || p.games || 0;
            const ppg = p.ppg || (games > 0 ? points / games : 0);
            return { ...p, points, games, ppg };
        })
        .filter(p => p.games > 0) // Remove players with no games
        .sort((a, b) => b.ppg - a.ppg || b.points - a.points);

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
        >
            <div className="dbz-card p-10 text-center relative overflow-hidden manga-shadow bg-surface/90 backdrop-blur-md border-primary/20">
                 <div className="absolute inset-0 bg-primary/5 pointer-events-none"></div>
                 <h3 className="text-4xl font-headline font-black italic text-primary uppercase tracking-tighter drop-shadow-xl transform -skew-x-12">Live Leaderboard</h3>
                 <p className="text-xs text-on-surface-variant font-black uppercase tracking-[0.4em] mt-2 animate-pulse">Ranked by Efficiency (PPG)</p>
            </div>

            <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                {sortedLive.map((p, idx) => {
                    const isTop3 = idx < 3;
                    const auraColor = idx === 0 ? 'border-aura-gold shadow-aura-gold/20' : 
                                    idx === 1 ? 'border-zinc-400 shadow-zinc-400/10' : 
                                    idx === 2 ? 'border-aura-red shadow-aura-red/10' : 'border-white/5';

                    return (
                        <motion.div 
                            layout
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ 
                                duration: 0.3, 
                                delay: idx * 0.03,
                                layout: { type: "spring", stiffness: 300, damping: 30 }
                            }}
                            whileHover={{ x: 5, backgroundColor: "rgba(255,255,255,0.03)" }}
                            key={p.playerId ? `live-${p.playerId}-${idx}` : `live-idx-${idx}`}
                            className={`group flex items-center justify-between p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer ${
                                isTop3 
                                    ? `bg-surface/80 ${auraColor} shadow-2xl` 
                                    : 'bg-surface/40 border-white/5 hover:border-primary/20'
                            }`}
                        >
                            <div className="flex items-center gap-6">
                                <div className={`w-12 h-12 flex items-center justify-center font-headline font-black italic text-2xl transform -skew-x-12 ${
                                    idx === 0 ? 'text-aura-gold' : 
                                    idx === 1 ? 'text-zinc-400' : 
                                    idx === 2 ? 'text-aura-red' : 'text-zinc-700'
                                }`}>
                                    #{idx + 1}
                                </div>
                                <div>
                                    <div className={`text-xl font-headline font-black italic uppercase tracking-tighter transform -skew-x-6 group-hover:text-primary transition-colors ${
                                        idx === 0 ? 'text-aura-gold' : 'text-on-surface'
                                    }`}>
                                        {(p.name || p.player_name)?.toUpperCase()}
                                        {idx === 0 && <span className="ml-2">👑</span>}
                                    </div>
                                    <div className="text-[10px] font-black text-on-surface-variant/40 uppercase mt-0.5 tracking-widest">
                                        {p.games} Games Played • {p.wins} Wins
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-headline font-black text-primary italic leading-none">
                                    {p.ppg.toFixed(2)}
                                    <span className="text-[10px] ml-1 uppercase not-italic text-on-surface-variant/40">PPG</span>
                                </div>
                                <div className="text-[11px] font-black text-on-surface-variant/60 uppercase mt-1 tracking-widest">
                                    {p.points} Total Points
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
                </AnimatePresence>
            </div>
        </motion.div>
    );
  };

  return (
    <div className="space-y-10 pb-20">
      
      {/* Navigation Tabs */}
      <div className="flex flex-wrap justify-center gap-3 px-2">
        {[
          { id: 'live', label: 'CURRENT SAGA', icon: IconZap, color: 'primary' },
          { id: 'league', label: 'SAGA HISTORY', icon: IconActivity, color: 'primary' }
        ].map((tab) => (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-8 py-4 rounded-[2rem] font-headline font-black italic uppercase tracking-widest text-[11px] transition-all flex items-center gap-3 manga-skew border-2 ${
              activeTab === tab.id 
                ? `bg-${tab.color} border-${tab.color} text-on-primary shadow-[0_0_25px_rgba(0,0,0,0.2)] scale-105 z-10` 
                : 'bg-surface border-outline/10 text-on-surface-variant hover:border-primary/30'
            }`}
          >
            <tab.icon size={18} className="manga-skew-reverse" />
            <span className="manga-skew-reverse">{tab.label}</span>
          </motion.button>
        ))}
      </div>

      <div className="relative">
        <div className="absolute inset-0 bg-primary/5 blur-[120px] -z-10"></div>
        <AnimatePresence mode="wait">
            {activeTab === 'league' && (
                <motion.div
                    key="league-tab"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                >
                    {renderLeague()}
                </motion.div>
            )}
            {activeTab === 'live' && (
                <motion.div
                    key="live-tab"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                >
                    {renderLive()}
                </motion.div>
            )}
        </AnimatePresence>
      </div>

      {selectedProfile && (
        <PlayerProfileModal 
            player={selectedProfile.player}
            standing={selectedProfile.standing}
            onClose={() => setSelectedProfile(null)}
        />
      )}
    </div>
  );
};

export default LeaderboardsManager;
