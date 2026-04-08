import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useDialog } from './ui/DialogProvider';
import { AppState, League, LeagueDay, Player, LeagueMatch } from '../types';
import { generateLeagueDay, generatePodLeagueDay, calculateLeagueStandings, undoLastNoShow, buildSagaHistory, rebalanceAfterDropout, isLeagueDayComplete, adminOverrideScore, finalizePlayedMatch, applyNoShow, deleteLeagueDay } from '../utils/leagueLogic';
import { generateMatchDayPDF, generateLeagueGloryPDF } from '../utils/pdfGenerator';
import { IconTrophy, IconPlus, IconCheck, IconPlay, IconClock, IconUsers, IconAlert, IconZap, IconSettings, IconMinus, IconBrain, IconLock, IconUserPlus, IconTrash, IconCalendar, IconDownload } from './ui/Icons';
import { vibrate, computeProfileBadges } from '../utils/godMode';
import { awardBadge } from '../utils/badges';
import { generateId } from '../utils/storage';
import { isValidScore, MATCH_RULES } from '../utils/rules';
import { MATCH_CONFIG } from '../utils/leagueConfig';
import { exportAndSyncDay } from '../utils/dayExport';
import BracketView from './BracketView';
import ScoreModal from './ScoreModal';
import MatchActionModal from './MatchActionModal';
import DayRosterModal from './DayRosterModal';
import FreeAgentModal from './FreeAgentModal';
import CustomMatchModal from './CustomMatchModal';
import { selectScoreboardPlayers } from '../utils/selectors';
import LeagueIntelligencePanel from './LeagueIntelligencePanel';
import { updateStatsForGame, finalizeGameSilently } from '../utils/engine';
import { getRecentMatches } from '../services/queryService';
import { format } from 'date-fns';

interface LeagueManagerProps {
  state: AppState;
  onUpdateLeague: (league: League | null) => void;
  onUpdatePlayers: (players: Player[]) => void;
  onMatchScore: (dayId: string, matchId: string, sA: number, sB: number) => void;
  onNoShow: (matchId: string, playerId: string) => void;
  isAdmin?: boolean;
  onScoreUpdate?: (gameId: string, sA: number, sB: number) => void;
  onHighlight?: (gameId: string) => void;
  isDarkMode?: boolean;
}

const LeagueManager: React.FC<LeagueManagerProps> = ({ state, onUpdateLeague, onUpdatePlayers, onMatchScore, onNoShow, isAdmin, onScoreUpdate, onHighlight, isDarkMode }) => {
  const { showAlert, showConfirm } = useDialog();
  const [setupMode, setSetupMode] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [scoringMatch, setScoringMatch] = useState<{dayId: string, match: LeagueMatch} | null>(null);
  const [managingMatch, setManagingMatch] = useState<{dayId: string, match: LeagueMatch} | null>(null);
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [showFreeAgentModal, setShowFreeAgentModal] = useState(false);
  const [showIntelligence, setShowIntelligence] = useState(false);
  const [showCustomMatchModal, setShowCustomMatchModal] = useState(false);

  // Day Generation Config
  const [nextCourts, setNextCourts] = useState(MATCH_CONFIG.COURTS);
  const [nextHours, setNextHours] = useState(MATCH_CONFIG.TOTAL_TIME_MIN / 60);

  const [leagueName, setLeagueName] = useState("PBZ Frieza Saga");
  const [attendees, setAttendees] = useState<Set<string>>(new Set());

  const activeLeague = state.activeLeague;

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
    // Sort by timestamp if available, otherwise fallback to day/order
    return custom.sort((a, b) => {
      if (a.timestamp && b.timestamp) return b.timestamp - a.timestamp;
      if (a.dayNumber !== b.dayNumber) return b.dayNumber - a.dayNumber;
      return (b.orderIndex || 0) - (a.orderIndex || 0);
    });
  }, [activeLeague]);

  const playerMap = useMemo(() => {
    const map = new Map<string, Player>();
    state.players.forEach(p => map.set(p.id, p));
    return map;
  }, [state.players]);
  
  const scoreboardPlayers = useMemo(() => {
    return selectScoreboardPlayers(activeLeague, state.players, selectedDayId || undefined);
  }, [activeLeague, state.players, selectedDayId]);

  const getPlayer = (id: string) => {
      if (id.startsWith('BYE_')) return { name: 'BYE' } as Player;
      const sp = scoreboardPlayers.find(p => p.id === id);
      if (sp) return sp;
      return playerMap.get(id);
  };
  const getNames = (ids: string[]) => ids.map(id => getPlayer(id)?.name || 'Unknown').join(' & ');

  const presentLeaguePlayers = useMemo(() => {
      return state.players.filter(p => activeLeague?.players?.includes(p.id) && p.isPresent);
  }, [state.players, activeLeague]);

  const standings = useMemo(() => {
      try {
          if (!activeLeague) return [];
          if (activeLeague.status === 'completed' && activeLeague.finalStandings) {
              return activeLeague.finalStandings;
          }
          return calculateLeagueStandings(activeLeague);
      } catch (err) {
          console.error("Error calculating standings:", err);
          return [];
      }
  }, [activeLeague, state.players]);

  const handleCreateLeague = () => {
    const newLeague: League = {
      id: generateId(),
      name: leagueName,
      startDate: Date.now(),
      weeks: 4,
      daysPerWeek: 2,
      status: 'active',
      days: [],
      players: state.players.map(p => p.id),
      auditLog: []
    };
    onUpdateLeague(newLeague);
    setSetupMode(false);
    vibrate('success');
  };

  if (!activeLeague) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center"
      >
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 border-2 border-primary/30 animate-pulse">
          <IconTrophy className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2 italic uppercase tracking-tighter">No Active Saga</h2>
        <p className="text-zinc-500 text-sm max-w-xs mb-8 font-medium">
          The battlefield is empty. There is no active saga currently being fought in the Frieza Saga.
        </p>
        
        {isAdmin && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSetupMode(true)}
            className="bg-primary text-on-primary px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 transition-transform"
          >
            Initiate New Saga
          </motion.button>
        )}

        <AnimatePresence>
          {setupMode && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-zinc-900 border-2 border-zinc-800 rounded-3xl p-8 w-full max-w-md shadow-2xl"
              >
                <h3 className="text-xl font-black text-white mb-6 uppercase italic">Saga Configuration</h3>
                <div className="space-y-4 mb-8">
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase mb-2 block tracking-widest">Saga Name</label>
                    <input 
                      type="text" 
                      value={leagueName}
                      onChange={(e) => setLeagueName(e.target.value)}
                      className="w-full bg-zinc-950 border-2 border-zinc-800 rounded-xl px-4 py-3 text-white font-bold focus:border-primary outline-none transition-colors"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setSetupMode(false)}
                    className="flex-1 bg-zinc-800 text-zinc-400 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px]"
                  >
                    Abort
                  </button>
                  <button 
                    onClick={handleCreateLeague}
                    className="flex-1 bg-primary text-on-primary py-4 rounded-2xl font-black uppercase tracking-widest text-[10px]"
                  >
                    Activate
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  const handleGenerateDay = () => {
    if (!activeLeague || activeLeague.status === 'completed') return;
    if (attendees.size < 4) {
      showAlert("Need at least 4 fighters to generate a valid arc.");
      return;
    }

    const daysCount = (activeLeague.days || []).length;
    const nextDayIndex = daysCount;
    const nextWeek = Math.floor(nextDayIndex / 2) + 1;
    const nextDayNum = (nextDayIndex % 2) + 1;

    let playerIds: string[] = Array.from(attendees);

    // ⚡ [Override] Force full roster for Final Day (W4 D2)
    if (nextWeek === 4 && nextDayNum === 2) {
        playerIds = activeLeague.players || [];
        console.log("⚡ [Override] Forcing full roster for Final Day (W4 D2)");
    }

    if (playerIds.length < 4) {
      showAlert("Need at least 4 fighters to generate a valid arc.");
      return;
    }

    console.log("👥 Players passed to scheduler:", playerIds.length, playerIds);

    const history = buildSagaHistory(activeLeague);
    
    const newDay = generateLeagueDay(
        activeLeague.id,
        nextWeek,
        nextDayNum,
        playerIds,
        nextCourts, 
        nextHours,
        history
    );

    generateMatchDayPDF(activeLeague.name, newDay, state.players);

    const updatedLeague = {
      ...activeLeague,
      days: [...(activeLeague.days || []), newDay]
    };
    onUpdateLeague(updatedLeague);
    setSelectedDayId(newDay.id);
    vibrate('medium');

    // ⚡ Auto-Sync to Cloud
    if (state.autoSync) {
        console.log("⚡ Auto-Syncing new Saga to Cloud...");
        // Use a temporary state object because state.activeLeague is stale until next render
        const tempState = { ...state, activeLeague: updatedLeague };
        exportAndSyncDay(tempState, activeLeague.id, newDay.id, () => {});
    }
  };

  const handleGeneratePodDay = () => {
    if (!activeLeague) return;
    vibrate('medium');

    const daysPerWeek = activeLeague.daysPerWeek || 2; // Fallback to 2 if not set
    const week = Math.ceil((activeLeague.days.length + 1) / daysPerWeek);
    const dayNum = ((activeLeague.days.length) % daysPerWeek) + 1;

    // For Pod Saga, we now auto-scale to ensure full coverage (everyone plays everyone/with everyone)
    const cycles = 0; // 0 triggers auto-scale in generatePodSchedule

    const newDay = generatePodLeagueDay(
      activeLeague.id,
      week,
      dayNum,
      Array.from(attendees),
      cycles
    );

    generateMatchDayPDF(activeLeague.name, newDay, state.players);

    const updatedLeague = {
      ...activeLeague,
      days: [...(activeLeague.days || []), newDay]
    };
    onUpdateLeague(updatedLeague);
    setSelectedDayId(newDay.id);
    vibrate('medium');

    // ⚡ Auto-Sync to Cloud
    if (state.autoSync) {
        console.log("⚡ Auto-Syncing new Pod Saga to Cloud...");
        const tempState = { ...state, activeLeague: updatedLeague };
        exportAndSyncDay(tempState, activeLeague.id, newDay.id, () => {});
    }
  };

  const handleScoreClick = (dayId: string, matchId: string) => {
      if (activeLeague?.status === 'completed') return;
      if (!isAdmin) return; // Prevent non-admins from scoring directly here if strict? Actually bracket allows click. Let's allow but modal might check.
      
      const day = activeLeague?.days?.find(d => d.id === dayId);
      const match = day?.matches?.find(m => m.id === matchId);
      if (day && match) {
          if (match.status !== 'scheduled') {
             setManagingMatch({ dayId, match });
          } else {
             setScoringMatch({ dayId, match });
          }
          vibrate('light');
      }
  };

  const handleManageClick = (dayId: string, matchId: string) => {
      if (activeLeague?.status === 'completed') return;
      if (!isAdmin) return;

      const day = activeLeague?.days?.find(d => d.id === dayId);
      const match = day?.matches?.find(m => m.id === matchId);
      if (day && match) {
          setManagingMatch({ dayId, match });
          vibrate('light');
      }
  };

  const handleMarkNoShow = (playerId: string) => {
      if (!managingMatch || !activeLeague || !onNoShow) return;
      const { match } = managingMatch;
      onNoShow(match.id, playerId);
  };

  const handleUndoNoShow = () => {
      if (!managingMatch || !activeLeague) return;
      const { match } = managingMatch;
      showConfirm("Undo the last No-Show action for this match?", () => {
        const nextLeague = undoLastNoShow(activeLeague, match.id);
        onUpdateLeague(nextLeague);
        setManagingMatch(null); 
        vibrate('medium');
      });
  };

  const handleDropPlayer = (playerId: string) => {
    if (!activeLeague || !selectedDayId) return;
    const day = activeLeague.days?.find(d => d.id === selectedDayId);
    if (!day) return;

    if (isLeagueDayComplete(day)) {
        showAlert("Day is complete. Cannot drop players.");
        return;
    }

    const newLeague = rebalanceAfterDropout(
        activeLeague,
        selectedDayId,
        playerId
    );
    
    onUpdateLeague(newLeague);
    vibrate('heavy');
    setShowRosterModal(false);
  };

  const handleAddFreeAgent = (playerId: string) => {
      if (!activeLeague) return;
      
      // 1. Update League
      const updatedLeague = {
          ...activeLeague,
          players: [...activeLeague.players, playerId]
      };
      
      // 2. Update Player State (Mark as joined mid-season)
      const updatedPlayers = state.players.map(p => {
          if (p.id === playerId) {
              return {
                  ...p,
                  joinedAtDay: (activeLeague.days || []).length,
                  isMidSeason: true
              };
          }
          return p;
      });

      onUpdatePlayers(updatedPlayers);
      onUpdateLeague(updatedLeague);
  };

  const handleSaveScore = (sA: number, sB: number) => {
      if (scoringMatch) {
          onMatchScore(scoringMatch.dayId, scoringMatch.match.id, sA, sB);
          setScoringMatch(null);
      }
  };

  const handleSaveCustomMatch = (teamA: string[], teamB: string[], scoreA: number, scoreB: number, type: 'singles' | 'doubles') => {
    if (!activeLeague || !selectedDayId) return;

    const dayIndex = activeLeague.days?.findIndex(d => d.id === selectedDayId);
    if (dayIndex === undefined || dayIndex === -1) return;

    const updatedLeague = { ...activeLeague };
    const days = [...(updatedLeague.days || [])];
    const day = { ...days[dayIndex] };
    const matches = [...day.matches];

    const newMatch: LeagueMatch = {
      id: generateId(),
      dayId: selectedDayId,
      courtId: 1,
      round: Math.max(...matches.map(m => m.round), 0) + 1,
      teamA,
      teamB,
      scoreA,
      scoreB,
      isCompleted: true,
      type,
      status: 'completed',
      isCustom: true,
      timestamp: Date.now(),
      noShowPlayerIds: [],
      orderIndex: matches.length,
      events: [{ type: 'custom_marker', timestamp: Date.now() } as any],
      highlights: []
    };

    day.matches = [...matches, newMatch];
    days[dayIndex] = day;
    updatedLeague.days = days;

    console.log("⚔️ SAVING CUSTOM MATCH:", newMatch);

    const updatedPlayers = updateStatsForGame(
      state.players,
      teamA,
      teamB,
      scoreA,
      scoreB,
      type
    );

    onUpdatePlayers(updatedPlayers);
    onUpdateLeague(updatedLeague);
    setShowCustomMatchModal(false);
    vibrate('success');
  };

  const handleMatchOverride = (matchId: string, sA: number, sB: number) => {
      if (!activeLeague || !isAdmin) return;
      
      // Locate match
      let dayId: string | undefined;
      let dayIndex: number = -1;
      let matchIndex: number = -1;

      for (let d = 0; d < (activeLeague.days || []).length; d++) {
          const mIdx = (activeLeague.days || [])[d].matches.findIndex(m => m.id === matchId);
          if (mIdx !== -1) {
              dayId = (activeLeague.days || [])[d].id;
              dayIndex = d;
              matchIndex = mIdx;
              break;
          }
      }

      if (dayIndex === -1 || matchIndex === -1) return;

      const updatedLeague = { ...activeLeague };
      const days = [...(updatedLeague.days || [])];
      const day = { ...days[dayIndex] };
      const matches = [...day.matches];
      
      const oldMatch = matches[matchIndex];
      const newMatch = adminOverrideScore(oldMatch, sA, sB);
      
      matches[matchIndex] = newMatch;
      day.matches = matches;
      days[dayIndex] = day;
      updatedLeague.days = days;

      // Add to Audit Log
      updatedLeague.auditLog = [
          ...(updatedLeague.auditLog || []),
          {
              id: generateId(),
              timestamp: Date.now(),
              action: 'SCORE_OVERRIDE',
              matchId,
              snapshot: newMatch,
              details: `Score corrected to ${sA}-${sB}`
          }
      ];

      // Update Player Stats
      // Note: This is complex because we need to revert old stats if match was previously completed
      // For now, simpler approach: stats logic is additive. 
      // Correcting stats properly requires full re-calculation from scratch or reverting.
      // Given the "God Mode" complexity, let's assume admins accept that player cumulative stats might drift slightly 
      // OR we re-calculate stats for the whole league if possible.
      // But re-calc is expensive and state.players is global.
      // Just re-applying updateStatsForGame will double count if not careful.
      // Better to just update the league object for standings (which are computed from matches).
      // The global player profile stats will remain as they were unless we do a full rebuild.
      // Since `calculateLeagueStandings` iterates all matches, the LEAGUE STANDINGS will be correct.
      // The Player Profile Modal uses league standings, so it will be correct.
      // The only thing potentially incorrect is the global "Career Stats" if we don't fix it.
      // But let's stick to League integrity first.

      onUpdateLeague(updatedLeague);
      setManagingMatch(null);
      
      // Trigger backup removed
      const dayToBackup = (updatedLeague.days || [])[dayIndex];
      if (dayToBackup && isLeagueDayComplete(dayToBackup)) {
          // Re-trigger backup if needed
      }
  };

  const handleExportPDF = () => {
      if (!selectedDayId || !activeLeague) return;
      const day = (activeLeague.days || []).find(d => d.id === selectedDayId);
      if (!day) return;
      generateMatchDayPDF(activeLeague.name, day, state.players, showAlert);
  };

  const handleDeleteDay = () => {
    if (!activeLeague || !selectedDayId) return;
    const day = (activeLeague.days || []).find(d => d.id === selectedDayId);
    if (!day) return;

    const performDelete = () => {
      const { league: newLeague, players: newPlayers } = deleteLeagueDay(activeLeague, selectedDayId, state.players);
      onUpdateLeague(newLeague);
      onUpdatePlayers(newPlayers);
      setSelectedDayId(null);
      vibrate('heavy');
    };

    if (day.status !== 'generated') {
      showConfirm(
        "⚠️ WARNING: This day has started or completed matches.\nDeleting it will wipe all stats from this day and recalculate everything.\n\nAre you sure?",
        performDelete
      );
    } else {
      showConfirm("Delete this generated day?", performDelete);
    }
  };

  const handleSelectAll = () => {
      const presentIds = presentLeaguePlayers.map(p => p.id);
      const allSelected = presentIds.length > 0 && presentIds.every(id => attendees.has(id));
      if (allSelected) {
          setAttendees(new Set());
      } else {
          setAttendees(new Set(presentIds));
      }
      vibrate('light');
  };

  const handleEndLeague = () => {
    if (!activeLeague || !isAdmin) return;
    
    showConfirm("⚠️ END SAGA?\n\nThis will lock all results and generate the final report.", () => {
      const finalStandings = calculateLeagueStandings(activeLeague);
      let updatedPlayers = [...state.players];
      const sagaName = activeLeague.name;
      const leagueId = activeLeague.id;

      const champion = finalStandings.find(s => s.eligibleForTrophies);
      if (champion) {
          let p = updatedPlayers.find(p => p.id === champion.playerId);
          if (p) {
              const idx = updatedPlayers.indexOf(p);
              updatedPlayers[idx] = awardBadge(p, 'saga_champion', leagueId, sagaName);
          }
      }

      finalStandings.forEach(s => {
          const earnedIds = computeProfileBadges(s);
          let p = updatedPlayers.find(p => p.id === s.playerId);
          if (p && earnedIds.length > 0) {
               const idx = updatedPlayers.indexOf(p);
               let nextP = p;
               earnedIds.forEach(bId => {
                   nextP = awardBadge(nextP, bId, leagueId, sagaName);
               });
               updatedPlayers[idx] = nextP;
          }
      });

      onUpdatePlayers(updatedPlayers);
      const concludedLeague: League = {
        ...activeLeague,
        status: 'completed',
        finalStandings: finalStandings,
        endedAt: Date.now(),
        days: activeLeague.days || []
      };
      onUpdateLeague(concludedLeague);
      vibrate('success');
      
      // Auto-lock logic for final day
      const isFinalDay = (activeLeague.days || []).some(d => d.week === 4 && d.day === 2);
      if (isFinalDay) {
          console.log("🔒 [Lock] Final Day reached. Scoreboard locked.");
      }

      generateLeagueGloryPDF(concludedLeague.name, finalStandings, state.players, showAlert);
    });
  };

  const handleArchiveAndNewSaga = () => {
      showConfirm("Archive this completed saga and start a new one?", () => {
        onUpdateLeague(null);
        vibrate('medium');
      });
  };

  const isCompleted = activeLeague?.status === 'completed';
  const selectedDay = activeLeague?.days?.find(d => d.id === selectedDayId);
  const presentIds = presentLeaguePlayers.map(p => p.id);
  const allSelected = presentIds.length > 0 && presentIds.every(id => attendees.has(id));

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 pb-24 relative"
    >
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="dbz-card p-6 relative overflow-hidden manga-shadow bg-surface/90 backdrop-blur-md border-primary/20"
        >
            <div className="absolute inset-0 bg-primary/5 pointer-events-none"></div>
            <div className="flex justify-between items-start relative z-10">
             <div className="space-y-1">
                <h2 className="text-3xl font-headline font-black italic text-primary uppercase tracking-tighter drop-shadow-md transform -skew-x-12">{activeLeague?.name}</h2>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 border border-primary/20 rounded">
                        <IconZap size={10} className="text-primary fill-primary" />
                        <span className="text-[9px] text-primary font-black uppercase tracking-widest">ARC {(activeLeague?.days || []).length}</span>
                    </div>
                    {isCompleted && <span className="text-[9px] font-black bg-white text-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-md">CONCLUDED</span>}
                </div>
             </div>
             
             <div className="flex items-center gap-2">
                 {/* START NEW SAGA (Admin Only, visible when completed) */}
                    {isCompleted && isAdmin && (
                        <button 
                            onClick={handleArchiveAndNewSaga}
                            className="bg-primary text-on-primary px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 manga-skew"
                        >
                            <span className="manga-skew-reverse flex items-center gap-2">
                                <IconPlus size={14} /> NEW SAGA
                            </span>
                        </button>
                    )}

                     {/* INTELLIGENCE TOGGLE (Admin Only) */}
                     {isAdmin && !selectedDayId && !isCompleted && (
                         <button
                            onClick={() => setShowIntelligence(!showIntelligence)}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all manga-skew ${showIntelligence ? 'bg-primary border-primary text-on-primary shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'bg-surface-variant/50 border-outline/10 text-on-surface-variant hover:text-primary hover:border-primary/50'}`}
                         >
                             <IconBrain size={18} className="manga-skew-reverse" />
                         </button>
                     )}

                 {selectedDayId && (
                     <button onClick={() => setSelectedDayId(null)} className="text-[9px] font-black text-zinc-500 hover:text-white uppercase tracking-widest border-2 border-zinc-800 px-3 py-1.5 rounded-xl transition-all">SAGA HUB</button>
                 )}
                 </div>
            </div>
        </motion.div>

        {isCompleted && (
            <div className="mx-2 p-8 dbz-card relative overflow-hidden manga-shadow bg-surface/90 backdrop-blur-md border-primary/20 text-center space-y-4 animate-in zoom-in-95 duration-700">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent"></div>
                <div className="relative z-10">
                    <div className="w-20 h-20 bg-surface-variant/50 rounded-3xl flex items-center justify-center border-2 border-primary/40 mx-auto mb-4 shadow-2xl rotate-3 manga-skew">
                        <IconTrophy size={40} className="text-primary drop-shadow-glow manga-skew-reverse" />
                    </div>
                    <h3 className="text-2xl font-headline font-black italic text-primary uppercase tracking-tighter transform -skew-x-12">Saga Concluded</h3>
                    <p className="text-on-surface-variant font-medium max-w-md mx-auto leading-relaxed">The final chapter has been written. The legends of this saga are forever etched in the Hall of Fame.</p>
                </div>
                {isAdmin && (
                    <button 
                        onClick={handleArchiveAndNewSaga}
                        className="bg-primary text-on-primary px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all manga-skew"
                    >
                        <span className="manga-skew-reverse">ARCHIVE & START NEW SAGA</span>
                    </button>
                )}
            </div>
        )}

        {/* INTELLIGENCE PANEL */}
        {showIntelligence && activeLeague && isAdmin && !selectedDayId && (
            <LeagueIntelligencePanel 
                league={activeLeague}
                players={state.players}
                onClose={() => setShowIntelligence(false)}
            />
        )}

        {selectedDay ? (
            <div className="space-y-6 animate-in slide-in-from-right">
                <div className="flex justify-end gap-2">
                    {isAdmin && !isLeagueDayComplete(selectedDay) && (
                        <button
                            onClick={() => setShowRosterModal(true)}
                            className="text-[9px] font-black text-zinc-500 hover:text-white uppercase tracking-widest bg-zinc-900 border border-zinc-800 hover:border-white/20 px-4 py-2.5 rounded-xl transition-all flex items-center gap-2"
                        >
                            <IconUsers size={12} /> MANAGE SQUAD
                        </button>
                    )}
                    <button 
                        onClick={() => setShowCustomMatchModal(true)}
                        className="bg-primary/10 text-primary hover:bg-primary/20 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2"
                    >
                        <IconPlus size={12} /> CUSTOM MATCH
                    </button>
                    <button 
                        onClick={handleExportPDF}
                        className="bg-white text-black hover:bg-zinc-200 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_10px_20px_rgba(255,255,255,0.1)] active:scale-95 transition-all"
                    >
                        EXPORT SCROLL
                    </button>
                    {isAdmin && (
                        <button 
                            onClick={handleDeleteDay}
                            className="bg-red-900/20 text-red-500 hover:bg-red-900/40 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2"
                        >
                            <IconTrash size={12} /> DELETE DAY
                        </button>
                    )}
                </div>
                <BracketView 
                    day={selectedDay} 
                    players={scoreboardPlayers.map(sp => ({...sp, isPresent: true})) as any} 
                    onScoreMatch={handleScoreClick} 
                    onManageMatch={handleManageClick}
                    isAdmin={isAdmin}
                />
            </div>
        ) : (
            <>
                <div className="dbz-card overflow-hidden manga-shadow bg-surface/80 backdrop-blur-sm border-outline/10">
                    {/* ... Standings Table ... */}
                    <div className="p-5 border-b border-outline/10 bg-surface-variant/50 flex justify-between items-center">
                        <h3 className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.3em] flex items-center gap-2">
                            <IconTrophy size={14} className="text-primary" /> POWER STANDINGS
                        </h3>
                    </div>
                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left">
                            <thead className="bg-surface-variant/30 text-[9px] font-black uppercase text-on-surface-variant/60 border-b border-outline/10">
                                <tr>
                                    <th className="p-4 w-16 text-center">RANK</th>
                                    <th className="p-4">FIGHTER</th>
                                    <th className="p-4 text-right">PTS</th>
                                    <th className="p-4 text-right">PPG</th>
                                    <th className="p-4 text-right">W-L</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-outline/10">
                                {standings
                                    .filter(s => {
                                        const isFinalDay = activeLeague?.days?.some(d => d.week === 4 && d.day === 2);
                                        if (isFinalDay && activeLeague?.status === 'completed') {
                                            const finalDay = activeLeague.days?.find(d => d.week === 4 && d.day === 2);
                                            return finalDay?.attendees.includes(s.playerId);
                                        }
                                        return s.gamesPlayed > 0;
                                    })
                                    .map((s, idx) => {
                                        const p = scoreboardPlayers.find(sp => sp.id === s.playerId);
                                        const isChamp = idx === 0 && s.eligibleForTrophies; 
                                        const isIneligible = !s.eligibleForTrophies;
                                        const isAbsent = p && !p.isPresent;

                                        return (
                                            <tr key={s.playerId} className={`hover:bg-primary/5 transition-colors ${isChamp && activeLeague?.status === 'completed' ? "bg-primary/10" : ""} ${isIneligible || isAbsent ? "opacity-50 grayscale" : ""}`}>
                                            <td className={`p-4 text-center font-headline font-black italic ${isChamp ? "text-primary text-2xl" : "text-on-surface-variant/40"}`}>
                                                {isChamp ? "👑" : idx + 1}
                                            </td>
                                            <td className={`p-4 font-headline font-black italic uppercase tracking-tight ${isChamp ? "text-primary text-lg" : "text-on-surface"}`}>
                                                <div className="flex items-center gap-2">
                                                    {p?.name}
                                                    {isAbsent && <span className="text-[8px] border border-outline/20 text-on-surface-variant/60 px-1 rounded">ABSENT</span>}
                                                </div>
                                                {s.bonusPoints > 0 && <span className="ml-2 text-[8px] bg-primary/20 text-primary px-1 rounded">+{s.bonusPoints} BP</span>}
                                                {s.noShows > 0 && <span className="ml-2 text-[8px] bg-red-900/20 text-red-500 px-1 rounded">{s.noShows} NS</span>}
                                            </td>
                                            <td className="p-4 text-right text-primary font-headline font-black italic text-lg">{s.points}</td>
                                            <td className="p-4 text-right text-on-surface-variant font-mono text-xs">{s.ppg.toFixed(2)}</td>
                                            <td className="p-4 text-right text-on-surface-variant font-black text-[10px]">{s.wins}-{s.losses}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* EXHIBITION CHRONICLES - Global Custom Match Log */}
                    {isAdmin && allCustomMatches.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-[10px] font-black text-hype-500 uppercase tracking-[0.4em]">EXHIBITION CHRONICLES</h3>
                                <span className="text-[9px] font-black text-hype-500/60 uppercase tracking-widest">{allCustomMatches.length} BATTLES</span>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                {allCustomMatches.slice(0, 5).map((match) => (
                                    <motion.div
                                        key={match.id}
                                        whileHover={{ scale: 1.01, x: 4 }}
                                        onClick={() => setSelectedDayId(match.dayId)}
                                        className="bg-zinc-900/40 border border-hype-500/20 p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-zinc-900/60 transition-all group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-hype-500/10 border border-hype-500/20 flex items-center justify-center text-hype-500 font-black italic text-xs">
                                                Z
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-hype-500 uppercase tracking-widest">CHAPTER {match.dayNumber}</span>
                                                    <span className="w-1 h-1 rounded-full bg-zinc-800"></span>
                                                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{match.type}</span>
                                                </div>
                                                <div className="text-xs font-black text-white italic uppercase mt-0.5">
                                                    {match.teamA.map(id => playerMap.get(id)?.name).join(' & ')} vs {match.teamB.map(id => playerMap.get(id)?.name).join(' & ')}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-black text-hype-500 italic">
                                                {match.scoreA} - {match.scoreB}
                                            </div>
                                            <div className="text-[8px] font-black text-zinc-600 uppercase tracking-tighter mt-0.5 group-hover:text-hype-500 transition-colors">
                                                VIEW BATTLE
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                                {allCustomMatches.length > 5 && (
                                    <p className="text-center text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] py-2 italic">
                                        + {allCustomMatches.length - 5} MORE EXHIBITION BATTLES
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em] px-2">CHRONICLES</h3>
                        <div className="grid grid-cols-1 gap-3">
                        {(activeLeague?.days?.length || 0) === 0 && (
                            <div className="text-center py-12 bg-zinc-900/20 rounded-[2.5rem] border-2 border-dashed border-zinc-800">
                                <p className="text-zinc-700 font-black uppercase text-[9px] tracking-widest italic">The arena awaits its first legend...</p>
                            </div>
                        )}
                        {activeLeague?.days?.map(day => (
                            <div 
                                key={day.id} 
                                onClick={(e) => {
                                    if (isAdmin && e.shiftKey && activeLeague) {
                                        e.stopPropagation();
                                        exportAndSyncDay(state, activeLeague.id, day.id, showAlert);
                                        vibrate('success');
                                    } else {
                                        setSelectedDayId(day.id);
                                    }
                                }}
                                className="p-6 dbz-card bg-surface/90 backdrop-blur-sm rounded-3xl flex justify-between items-center border-2 border-outline/5 cursor-pointer hover:border-primary/50 transition-all group manga-shadow relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="flex items-center gap-5 relative z-10">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-headline font-black italic text-base transition-all group-hover:scale-110 manga-skew ${day.day === 1 ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-secondary/20 text-secondary border border-secondary/30'}`}>
                                        <span className="manga-skew-reverse">D{day.day}</span>
                                    </div>
                                    <div>
                                        <div className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em]">
                                            WEEK {day.week} {day.matches.filter(m => m.isCustom).length > 0 && (
                                                <span className="text-hype-500 ml-2">• {day.matches.filter(m => m.isCustom).length} CUSTOM</span>
                                            )}
                                        </div>
                                        <div className="text-on-surface font-headline font-black italic uppercase tracking-tight text-lg group-hover:text-primary transition-colors transform -skew-x-6">THE HYBRID CLASH</div>
                                    </div>
                                </div>
                                <div className="bg-surface-variant/50 p-3 rounded-xl text-on-surface-variant/40 group-hover:text-primary group-hover:bg-primary/10 transition-all manga-skew relative z-10">
                                    <IconPlay size={20} className="fill-current manga-skew-reverse" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                    {!isCompleted && (
                        isAdmin ? (
                            <div className="dbz-card p-8 relative overflow-hidden manga-shadow bg-surface/90 backdrop-blur-md border-primary/20 space-y-8 mt-10">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full pointer-events-none"></div>
                                
                                <div className="flex justify-between items-center relative z-10">
                                     <h4 className="text-primary font-headline font-black italic uppercase tracking-widest text-base flex items-center gap-3 transform -skew-x-12">
                                         <div className="w-1.5 h-6 bg-primary shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div> PREPARE NEXT CHAPTER
                                     </h4>
                                     <div className="flex items-center gap-4">
                                         <button onClick={() => setShowFreeAgentModal(true)} className="text-[10px] font-black text-primary uppercase tracking-widest border-b-2 border-primary/20 hover:border-primary transition-all flex items-center gap-1.5">
                                            <IconUserPlus size={14} /> Recruit
                                         </button>
                                         <button onClick={handleSelectAll} className="text-[10px] font-black text-primary uppercase tracking-widest border-b-2 border-primary/20 hover:border-primary transition-all">
                                            {allSelected ? 'Reset' : 'Check All'}
                                         </button>
                                     </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-6 relative z-10">
                                    <div className="bg-surface-variant/30 p-4 rounded-2xl border border-outline/10 flex flex-col gap-3 manga-skew">
                                        <span className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-widest manga-skew-reverse">ARENAS</span>
                                        <div className="flex items-center justify-between manga-skew-reverse">
                                            <button onClick={() => setNextCourts(Math.max(1, nextCourts - 1))} className="w-10 h-10 rounded-xl bg-surface-variant/50 text-on-surface-variant hover:text-primary hover:border-primary/50 border border-outline/10 flex items-center justify-center transition-all"><IconMinus size={16} /></button>
                                            <span className="text-2xl font-headline font-black text-primary italic">{nextCourts}</span>
                                            <button onClick={() => setNextCourts(Math.min(6, nextCourts + 1))} className="w-10 h-10 rounded-xl bg-surface-variant/50 text-on-surface-variant hover:text-primary hover:border-primary/50 border border-outline/10 flex items-center justify-center transition-all"><IconPlus size={16} /></button>
                                        </div>
                                    </div>
                                    <div className="bg-surface-variant/30 p-4 rounded-2xl border border-outline/10 flex flex-col gap-3 manga-skew">
                                        <span className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-widest manga-skew-reverse">HOURS</span>
                                        <div className="flex items-center justify-between manga-skew-reverse">
                                            <button onClick={() => setNextHours(Math.max(0.5, nextHours - 0.5))} className="w-10 h-10 rounded-xl bg-surface-variant/50 text-on-surface-variant hover:text-primary hover:border-primary/50 border border-outline/10 flex items-center justify-center transition-all"><IconMinus size={16} /></button>
                                            <span className="text-2xl font-headline font-black text-primary italic">{nextHours}</span>
                                            <button onClick={() => setNextHours(Math.min(12, nextHours + 0.5))} className="w-10 h-10 rounded-xl bg-surface-variant/50 text-on-surface-variant hover:text-primary hover:border-primary/50 border border-outline/10 flex items-center justify-center transition-all"><IconPlus size={16} /></button>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 max-h-60 overflow-y-auto no-scrollbar bg-surface-variant/20 p-6 rounded-3xl border-2 border-outline/5 relative z-10">
                                     {presentLeaguePlayers.map(p => (
                                         <label key={p.id} className="flex items-center gap-4 text-[11px] text-on-surface-variant/60 font-black uppercase tracking-tight p-3 cursor-pointer hover:bg-primary/5 rounded-2xl transition-all group">
                                             <input 
                                                type="checkbox" 
                                                checked={attendees.has(p.id)}
                                                onChange={() => {
                                                    const next = new Set(attendees);
                                                    if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
                                                    setAttendees(next);
                                                }}
                                                className="w-5 h-5 accent-primary rounded-lg border-2 border-outline/20"
                                             />
                                             <span className={`transition-all ${attendees.has(p.id) ? 'text-primary italic transform -skew-x-6' : 'group-hover:text-on-surface'}`}>{p.name}</span>
                                         </label>
                                     ))}
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4">
                                    <button 
                                        onClick={handleGenerateDay}
                                        disabled={attendees.size < 4}
                                        className="flex-[2] py-6 bg-primary text-on-primary font-headline font-black italic uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-primary/30 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale relative z-10 manga-skew group overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <span className="manga-skew-reverse block text-lg">GENERATE TODAY'S MATCHES</span>
                                    </button>

                                    <button 
                                        onClick={handleGeneratePodDay}
                                        disabled={attendees.size < 4}
                                        className="flex-[1] py-6 bg-secondary text-on-secondary font-headline font-black italic uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-secondary/30 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale relative z-10 manga-skew group overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <span className="manga-skew-reverse block text-lg">POD SAGA</span>
                                    </button>

                                    <button 
                                        onClick={async () => {
                                            vibrate('medium');
                                            try {
                                                const lastDay = activeLeague.days[activeLeague.days.length - 1];
                                                if (lastDay) {
                                                    await exportAndSyncDay(state, activeLeague.id, lastDay.id);
                                                    showAlert("CLOUD SYNC", "Saga data has been pushed to Supabase and a backup JSON was downloaded.");
                                                } else {
                                                    showAlert("NO DATA", "Generate a day first before syncing.");
                                                }
                                            } catch (err) {
                                                console.error("Sync error:", err);
                                                showAlert("SYNC FAILED", "Could not sync to cloud. Check connection.");
                                            }
                                        }}
                                        className="flex-1 py-6 bg-surface-variant/20 border-2 border-outline/10 text-on-surface-variant font-black italic uppercase tracking-widest rounded-2xl hover:bg-surface-variant/40 transition-all flex items-center justify-center gap-3"
                                    >
                                        <IconDownload size={20} />
                                        <span>Sync Cloud</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="dbz-card bg-surface-variant/20 border-2 border-outline/5 p-8 rounded-[2.5rem] text-center mt-10">
                                <p className="text-on-surface-variant/40 font-headline font-black uppercase text-xs tracking-widest italic">Next Chapter Pending Admin Activation</p>
                            </div>
                        )
                    )}
                </div>
                
                {!isCompleted && (activeLeague?.days?.length || 0) > 0 && isAdmin && (
                    <div className="pt-10 px-2">
                        <button 
                            onClick={handleEndLeague}
                            className="w-full py-6 bg-surface-variant/30 border-2 border-primary/20 text-primary rounded-[2rem] text-xs font-black uppercase tracking-[0.4em] hover:bg-primary/10 transition-all active:scale-95 shadow-2xl manga-shadow manga-skew relative overflow-hidden group"
                        >
                            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <span className="manga-skew-reverse flex items-center justify-center gap-4 relative z-10">
                                <IconZap size={24} className="fill-primary text-primary animate-pulse" />
                                SEAL THIS SAGA
                            </span>
                        </button>
                    </div>
                )}

                {isCompleted && isAdmin && (
                    <div className="pt-8 px-2 pb-12">
                        <button 
                            onClick={handleArchiveAndNewSaga}
                            className="w-full py-5 bg-primary text-on-primary font-black italic uppercase tracking-[0.3em] rounded-2xl transition-all hover:scale-[1.02] active:scale-95 shadow-2xl shadow-purple-950/40"
                        >
                            <span className="flex items-center justify-center gap-3">
                                <IconPlus size={20} /> START A NEW SAGA
                            </span>
                        </button>
                    </div>
                )}
            </>
        )}

        {showRosterModal && selectedDay && (
            <DayRosterModal 
                day={selectedDay}
                players={state.players}
                onDrop={handleDropPlayer}
                onClose={() => setShowRosterModal(false)}
            />
        )}

        {showFreeAgentModal && activeLeague && (
            <FreeAgentModal 
                allPlayers={state.players}
                activeLeaguePlayerIds={activeLeague.players}
                onAddPlayer={handleAddFreeAgent}
                onClose={() => setShowFreeAgentModal(false)}
            />
        )}

        {scoringMatch && (
            <ScoreModal 
                game={{
                    id: scoringMatch.match.id,
                    courtId: scoringMatch.match.courtId,
                    mode: scoringMatch.match.type,
                    teamA: scoringMatch.match.teamA,
                    teamB: scoringMatch.match.teamB,
                    scoreA: scoringMatch.match.scoreA || 0,
                    scoreB: scoringMatch.match.scoreB || 0,
                    isFinished: scoringMatch.match.isCompleted,
                    highlights: scoringMatch.match.highlights || []
                } as any}
                teamANames={getNames(scoringMatch.match.teamA)}
                teamBNames={getNames(scoringMatch.match.teamB)}
                onSave={handleSaveScore}
                onCancel={() => setScoringMatch(null)}
                onScoreChange={(sA, sB) => onScoreUpdate && onScoreUpdate(scoringMatch.match.id, sA, sB)}
                onHighlight={() => onHighlight && onHighlight(scoringMatch.match.id)} // Pass highlight handler
            />
        )}

        <AnimatePresence>
            {showCustomMatchModal && (
                <CustomMatchModal 
                    players={state.players}
                    onSave={handleSaveCustomMatch}
                    onCancel={() => setShowCustomMatchModal(false)}
                    isDarkMode={isDarkMode}
                />
            )}
        </AnimatePresence>

        {managingMatch && (
            <MatchActionModal 
                match={managingMatch.match}
                players={state.players}
                onMarkNoShow={handleMarkNoShow}
                onClose={() => setManagingMatch(null)}
                isAdmin={isAdmin}
                onUndoNoShow={handleUndoNoShow}
                onOverrideScore={handleMatchOverride}
            />
        )}
    </motion.div>
  );
};

export default LeagueManager;