
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { AppState, Game, Player, Session, Tournament, League, TournamentMatch, GameEvent, PBZHighlight } from './types';
import { loadState, saveState, generateId } from './utils/storage';
import { runScheduler, finalizeGame, updateStatsForGame, finalizeGameSilently } from './utils/engine';
import { createGroups, generateGroupMatches, generateKnockoutBracket, updateBracketProgression, assignCourtsToMatches } from './utils/tournamentLogic';
import { MATCH_RULES, isValidScore } from './utils/rules';
import { applyNoShow, isLeagueDayComplete, finalizePlayedMatch } from './utils/leagueLogic';
import { vibrate } from './utils/godMode';
import { SyncStatus } from './components/SyncStatusPill';

import { upsertPlayers, syncFullRoster } from './services/playerService';
import { addSinglesMatch, addDoublesMatch, upsertMatches } from './services/matchService';
import { getActiveLeague, getAllLeagues, upsertLeagues, deleteLeague } from './services/leagueService';
import { upsertSession, getLatestSession } from './services/sessionService';
import { upsertTournaments, getActiveTournament, getAllTournaments } from './services/tournamentService';
import { getPlayers } from './services/queryService';
import Layout from './components/Layout';
import LeagueManager from './components/LeagueManager';
import LeaderboardsManager from './components/LeaderboardsManager';
import RosterManager from './components/RosterManager';
import TournamentManager from './components/TournamentManager';
import AdminUnlockModal from './components/AdminUnlockModal';
import HomeScreen from './components/HomeScreen';
import ScoreModal from './components/ScoreModal';
import PlayerStatsHub from './components/PlayerStatsHub';
import BackupRestoreManager from './components/BackupRestoreManager';
import { useDialog } from './components/ui/DialogProvider';
import { IconLock } from './components/ui/Icons';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(loadState());
  const [isRestoring, setIsRestoring] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'league' | 'roster' | 'leaderboards' | 'stats' | 'backup'>('home');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  // THEME STATE (Forced Dark Mode)
  const isDarkMode = true;

  // ADMIN STATE
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const { showAlert, showConfirm } = useDialog();

  // SUPABASE LEAGUE STATE
  const [supabaseLeague, setSupabaseLeague] = useState<any>(null);
  const [isLeagueLoading, setIsLeagueLoading] = useState(true);

  // Backup Concurrency Locks
  const isBackingUpRef = useRef(false);
  const isResettingRef = useRef(false);
  
  // State Ref for Heartbeat (Always holds fresh state without re-rendering)
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // Auto-save effect (Guarded against restore race conditions)
  useEffect(() => {
    if (!isRestoring) {
      saveState(state);
    }
  }, [state, isRestoring]);

  // --- GLOBAL AUTO-BACKUP EFFECT ---
  // Debounced sync for "everything auto backed up"
  const performGlobalSync = useCallback(async () => {
    const manualRestore = localStorage.getItem("manual_restore") === "true";
    if (isRestoring || isResettingRef.current || isOffline || manualRestore) return;
    
    setSyncStatus('syncing');
    console.log("🔄 SYNC START: Pushing local changes...");
    try {
        // 1. Sync Players
        if (stateRef.current.players.length > 0) {
            await syncFullRoster(stateRef.current.players);
        }

        // 2. Sync Active League
        if (stateRef.current.activeLeague) {
            await upsertLeagues([stateRef.current.activeLeague]);
            
            // Sync matches for the active league
            const allMatches = (stateRef.current.activeLeague.days || []).flatMap(day => 
                (day.matches || []).map(m => ({ ...m, leagueId: stateRef.current.activeLeague!.id, dayId: day.id }))
            );
            if (allMatches.length > 0) {
                await upsertMatches(allMatches);
            }
        }

        // 3. Sync Session
        if (stateRef.current.activeSession) {
            await upsertSession(stateRef.current.activeSession);
        }

        // 4. Sync Tournament
        if (stateRef.current.activeTournament) {
            await upsertTournaments([stateRef.current.activeTournament]);
        }

        setSyncStatus('synced');
        console.log("⚡ SYNC COMPLETE: Local data is now authoritative in Cloud");

        // ✅ AUTO-CLEAR MANUAL RESTORE: After a successful authoritative push, we return to cloud-first
        if (localStorage.getItem("manual_restore") === "true") {
            console.log("✨ Authoritative push successful. Disabling manual_restore flag.");
            localStorage.removeItem("manual_restore");
        }
    } catch (err) {
        console.error("❌ Sync failed:", err);
        setSyncStatus('error');
    }
  }, [isRestoring, isOffline]);

  useEffect(() => {
    if (isRestoring || isResettingRef.current) return;

    const timer = setTimeout(performGlobalSync, 1000); // 1s debounce
    return () => clearTimeout(timer);
  }, [state.players, state.activeLeague, state.activeSession, state.activeTournament, isRestoring, performGlobalSync]);

  // Network Recovery Listener
  useEffect(() => {
    const handleOnline = () => {
        console.log("🌐 Network back online, triggering sync...");
        setIsOffline(false);
        performGlobalSync();
        
        // Retry pending matches
        const pending = localStorage.getItem('pbz_pending_matches');
        if (pending) {
            try {
                const matches = JSON.parse(pending);
                if (matches.length > 0) {
                    console.log(`🔄 Retrying ${matches.length} pending matches...`);
                    upsertMatches(matches).then(() => {
                        localStorage.removeItem('pbz_pending_matches');
                    });
                }
            } catch (e) {}
        }
    };
    const handleOffline = () => {
        console.log("📶 Network offline");
        setIsOffline(true);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
  }, [performGlobalSync]);

  // --- SUPABASE-FIRST BOOT SEQUENCE ---
  const bootSequence = useCallback(async (retryCount = 0) => {
    if (isOffline) {
        setSyncStatus('offline');
        setIsLeagueLoading(false);
        return;
    }

    setSyncStatus('syncing'); 
    try {
        const manualRestore = localStorage.getItem("manual_restore") === "true";
        if (manualRestore) {
            console.warn("⚠️ MANUAL RESTORE MODE: Cloud hydration skipped to protect local state.");
            setSyncStatus('manual');
            setIsLeagueLoading(false);
            return;
        }

        console.log("🚀 BOOT: Pulling latest data from Supabase...");
        
        // 1. Fetch data with Individual Try-Catch for Robustness
        let players: Player[] = [];
        let league: League | null = null;
        let allLeagues: League[] = [];
        let tournament: Tournament | null = null;
        let session: Session | null = null;

        try { players = await getPlayers().catch(e => { console.warn("Player fetch failed", e); return []; }); } catch(e) {}
        try { league = await getActiveLeague().catch(e => { console.warn("Active league fetch failed", e); return null; }); } catch(e) {}
        try { allLeagues = await getAllLeagues().catch(e => { console.warn("All leagues fetch failed", e); return []; }); } catch(e) {}
        try { tournament = await getActiveTournament().catch(e => { console.warn("Tournament fetch failed", e); return null; }); } catch(e) {}
        try { session = await getLatestSession().catch(e => { console.warn("Session fetch failed", e); return null; }); } catch(e) {}

        // Repair mappings
        const repairedLeague = league ? {
            ...league,
            days: (league.days || []).map((day: any) => ({
                ...day,
                matches: (day.matches || []).map((match: any) => ({
                    ...match,
                    isCustom: match.isCustom || match.is_custom || (match.events && Array.isArray(match.events) && match.events.some((e: any) => e.type === 'custom_marker')) || false,
                    timestamp: match.timestamp || (match.events && Array.isArray(match.events) && match.events.find((e: any) => e.type === 'custom_marker')?.timestamp) || null
                }))
            }))
        } : null;

        const otherLeagues = allLeagues
            .filter((l: any) => l.id !== repairedLeague?.id)
            .map((l: any) => ({
                ...l,
                days: (l.days || []).map((day: any) => ({
                    ...day,
                    matches: (day.matches || []).map((match: any) => ({
                        ...match,
                        isCustom: match.isCustom || match.is_custom || false,
                        timestamp: match.timestamp || null
                    }))
                }))
            }));

        setSupabaseLeague(repairedLeague);

        // Hydrate Local State
        setState(prev => {
            // MERGE LOGIC: Prefer Supabase as Authority (unless offline data exists and is newer)
            // But for PBZ, Supabase is usually the source of truth
            
            const mergedPlayers = [...prev.players];
            (players || []).forEach(sp => {
                const localIdx = mergedPlayers.findIndex(p => p.id === sp.id);
                if (localIdx === -1) {
                    mergedPlayers.push(sp);
                } else {
                    // Update existing
                    mergedPlayers[localIdx] = sp;
                }
            });

            // Cleanup duplicates by name
            const cleanedPlayers = mergedPlayers.reduce((acc: Player[], current) => {
                const normalizedName = current.name?.toLowerCase().trim() || "";
                if (!normalizedName) return acc;
                const existing = acc.find(p => p.name.toLowerCase().trim() === normalizedName);
                if (!existing) {
                    acc.push(current);
                } else {
                    // Keep the one with more stats
                    const currentGames = (current.gamesPlayed || 0) + (current.stats?.wins || 0) + (current.stats?.losses || 0);
                    const existingGames = (existing.gamesPlayed || 0) + (existing.stats?.wins || 0) + (existing.stats?.losses || 0);
                    if (currentGames > existingGames) {
                        const idx = acc.indexOf(existing);
                        acc[idx] = current;
                    }
                }
                return acc;
            }, []);

            return {
                ...prev,
                players: cleanedPlayers,
                activeLeague: repairedLeague || prev.activeLeague,
                activeTournament: tournament || prev.activeTournament,
                activeSession: session || prev.activeSession,
                pastLeagues: otherLeagues.sort((a, b) => 
                    new Date(b.created_at || 0).getTime() - 
                    new Date(a.created_at || 0).getTime()
                )
            };
        });

        setSyncStatus('synced');
        console.log("✅ BOOT COMPLETE: Hydrated from Cloud");
    } catch (e) {
        console.error(`Saga Boot Error (Attempt ${retryCount + 1}):`, e);
        if (retryCount < 2 && !isOffline) {
            setTimeout(() => bootSequence(retryCount + 1), 3000);
        } else {
            setSyncStatus(isOffline ? 'offline' : 'error');
        }
    } finally {
        setIsLeagueLoading(false);
    }
  }, [isOffline]);

  const handleFullTwoWaySync = useCallback(async () => {
    if (isOffline) return;
    setSyncStatus('syncing');
    try {
        // 1. Push local changes first
        await performGlobalSync();
        // 2. Pull latest from cloud
        await bootSequence();
        setSyncStatus('synced');
    } catch (e) {
        setSyncStatus('error');
    }
  }, [isOffline, performGlobalSync, bootSequence]);

  useEffect(() => {
    bootSequence();
  }, [bootSequence]);

  // --- ACTIVE SAGA REALTIME SYNC (For Spectators) ---
  useEffect(() => {
    if (!state.activeLeague?.id) return;

    const leagueId = state.activeLeague.id;
    
    // Listen to ALL league changes for the active saga
    const leaguesChannel = supabase
      .channel(`active-saga-${leagueId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leagues',
          filter: `id=eq.${leagueId}`
        },
        (payload: any) => {
          console.log("🏆 CLOUD SAGA UPDATE DETECTED:", payload.new?.name || payload.old?.id);
          if (payload.eventType === 'DELETE') {
             setState(prev => ({ ...prev, activeLeague: null }));
             return;
          }
          
          setState(prev => {
            if (prev.activeLeague?.id === payload.new.id) {
                const updatedLeague: League = {
                    ...prev.activeLeague,
                    ...payload.new,
                    days: (payload.new.days || []).map((day: any) => ({
                        ...day,
                        matches: (day.matches || []).map((match: any) => ({
                            ...match,
                            isCustom: match.isCustom || match.is_custom || false,
                            timestamp: match.timestamp || null
                        }))
                    }))
                };
                return { ...prev, activeLeague: updatedLeague };
            }
            return prev;
          });
        }
      )
      .subscribe();

    // Listen to ALL matches for the active saga
    const matchesChannel = supabase
      .channel(`saga-matches-${leagueId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `league_id=eq.${leagueId}`
        },
        () => {
           console.log("🎾 MATCH UPDATE DETECTED - Refreshing Saga...");
           // For matches, we re-fetch the league to get the updated nested structure
           // This ensures all derived stats are correct
           getActiveLeague().then(repairedLeague => {
               if (repairedLeague) {
                   setState(prev => ({ 
                       ...prev, 
                       activeLeague: {
                           ...prev.activeLeague,
                           ...repairedLeague,
                           days: (repairedLeague.days || []).map((day: any) => ({
                               ...day,
                               matches: (day.matches || []).map((match: any) => ({
                                   ...match,
                                   isCustom: match.isCustom || match.is_custom || false,
                                   timestamp: match.timestamp || null
                               }))
                           }))
                       } as League
                   }));
               }
           });
        }
      )
      .subscribe();

    // Listen to ALL player updates to keep roster in sync (DB, Dragon Balls, etc)
    const playersChannel = supabase
      .channel('global-roster')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players'
        },
        (payload) => {
          const manualRestore = localStorage.getItem("manual_restore") === "true";
          if (manualRestore) return;
          
          console.log("👤 PLAYER UPDATE DETECTED:", payload.eventType);
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
            import('./services/queryService').then(({ getPlayers }) => {
              getPlayers().then(roster => {
                setState(prev => ({ ...prev, players: roster }));
              });
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(leaguesChannel);
      supabase.removeChannel(matchesChannel);
      supabase.removeChannel(playersChannel);
    };
  }, [state.activeLeague?.id]);

  // --- REMOVED LEGACY HEARTBEAT ---

  const handleHardReset = async () => {
      if (!isAdmin || isResettingRef.current) return;
      isResettingRef.current = true;

      const emptyState: AppState = {
          players: [],
          activeSession: null,
          activeGames: [],
          activeLeague: null,
          activeTournament: null,
          pastLeagues: [],
          pastTournaments: [],
          queue: [],
          seasonHistory: [] 
      };

      setIsRestoring(true);

      setState(emptyState);
      saveState(emptyState);

      try {
          // Cloud reset no longer needed with Supabase
      } catch (e) {
          console.warn("Cloud reset failed, local reset still applied", e);
      }

      setTimeout(() => setIsRestoring(false), 500);
      vibrate('heavy');
      isResettingRef.current = false;
  };

  const handleDeleteCurrentSaga = async () => {
    if (!state.activeLeague) {
        showAlert("NO ACTIVE SAGA", "There is no active saga to delete.");
        return;
    }
    
    try {
        await deleteLeague(state.activeLeague.id);
        setState(prev => ({
            ...prev,
            activeLeague: null
        }));
        showAlert("SAGA DELETED", "The current saga and all its matches have been removed.");
    } catch (err: any) {
        console.error("Delete Saga Error:", err);
        showAlert("DELETE FAILED", `Failed to delete saga: ${err.message}`);
    }
  };

  /**
   * Helper to create a point event if score increased
   */
  const createPointEvent = (
      oldScoreA: number, oldScoreB: number,
      newScoreA: number, newScoreB: number
  ): GameEvent | null => {
      if (newScoreA > oldScoreA) {
          return {
              id: generateId(),
              type: 'point',
              timestamp: Date.now(),
              team: 'A',
              scoreAfter: `${newScoreA}-${newScoreB}`
          };
      }
      if (newScoreB > oldScoreB) {
          return {
              id: generateId(),
              type: 'point',
              timestamp: Date.now(),
              team: 'B',
              scoreAfter: `${newScoreA}-${newScoreB}`
          };
      }
      return null;
  };

  /**
   * HANDLER: Highlight Trigger (Clip Generation)
   * Captures current timestamp and creates a 15s window (-6s, +9s).
   */
  const handleHighlightTrigger = (gameId: string) => {
      const now = Date.now();
      const highlight: PBZHighlight = {
          id: generateId(),
          triggerTime: now,
          clipStart: now - 6000,
          clipEnd: now + 9000,
          duration: 15000
      };

      setState(prev => {
          let next = { ...prev };
          let found = false;

          // 1. Session Games
          const gameIdx = next.activeGames.findIndex(g => g.id === gameId);
          if (gameIdx !== -1) {
              const oldGame = next.activeGames[gameIdx];
              const newHighlights = [...(oldGame.highlights || []), highlight];
              
              const newGames = [...next.activeGames];
              newGames[gameIdx] = { ...oldGame, highlights: newHighlights };
              next.activeGames = newGames;
              found = true;
          }

          // 2. Tournament Games
          if (!found && next.activeTournament) {
              const mIdx = next.activeTournament.matches.findIndex(m => m.id === gameId);
              if (mIdx !== -1) {
                  const oldMatch = next.activeTournament.matches[mIdx];
                  const newHighlights = [...(oldMatch.highlights || []), highlight];
                  
                  const newMatches = [...next.activeTournament.matches];
                  newMatches[mIdx] = { ...oldMatch, highlights: newHighlights };
                  next.activeTournament = { ...next.activeTournament, matches: newMatches };
                  found = true;
              }
          }

          // 3. League Games
          if (!found && next.activeLeague) {
              let dIdx = -1, mIdx = -1;
              (next.activeLeague.days || []).forEach((d, i) => {
                  const m = d.matches.findIndex(x => x.id === gameId);
                  if (m !== -1) { dIdx = i; mIdx = m; }
              });

              if (dIdx !== -1 && mIdx !== -1) {
                  const newDays = [...(next.activeLeague.days || [])];
                  const oldMatch = newDays[dIdx].matches[mIdx];
                  const newHighlights = [...(oldMatch.highlights || []), highlight];

                  const newMatches = [...newDays[dIdx].matches];
                  newMatches[mIdx] = { ...oldMatch, highlights: newHighlights };
                  newDays[dIdx] = { ...newDays[dIdx], matches: newMatches };
                  next.activeLeague = { ...next.activeLeague, days: newDays };
                  found = true;
              }
          }

          if (found) {
              console.log("🔥 Highlight Clip Marker Saved", highlight);
              return next;
          }
          return prev;
      });
  };

  const handleLiveScoreUpdate = (gameId: string, sA: number, sB: number) => {
    setState(prev => {
      let next = { ...prev };
      let found = false;

      // League Games
      if (next.activeLeague) {
         let dIdx = -1, mIdx = -1;
         (next.activeLeague.days || []).forEach((d, i) => {
             const m = d.matches.findIndex(x => x.id === gameId);
             if (m !== -1) { dIdx = i; mIdx = m; }
         });

         if (dIdx !== -1 && mIdx !== -1) {
             const newDays = [...(next.activeLeague.days || [])];
             const oldMatch = newDays[dIdx].matches[mIdx];
             const event = createPointEvent(oldMatch.scoreA || 0, oldMatch.scoreB || 0, sA, sB);
             const newEvents = event ? [...(oldMatch.events || []), event] : (oldMatch.events || []);

             const newMatches = [...newDays[dIdx].matches];
             newMatches[mIdx] = { 
                 ...oldMatch, 
                 scoreA: sA, 
                 scoreB: sB,
                 events: newEvents
             };
             newDays[dIdx] = { ...newDays[dIdx], matches: newMatches };
             next.activeLeague = { ...next.activeLeague, days: newDays };
             found = true;
         }
      }

      if (found) {
          return next;
      }
      return prev;
    });
  };

  // --- ACTIONS ---

  const handleGameEnd = useCallback((gameId: string, scoreA: number, scoreB: number) => {
    // League match handling is done via handleLeagueMatchScore
    // This is a fallback for other game types if they existed
  }, [state]);

  const handleStartSession = (courts: number, mode: 'singles'|'doubles'|'mixed') => {
      const activePlayers = state.players.filter(p => p.isPresent);
      const newSession: Session = {
          id: generateId(),
          date: Date.now(),
          activeCourts: courts,
          playMode: mode,
          rotationType: 'winners_stay',
          teamAssignmentMode: 'balanced',
          history: []
      };
      
      let nextState = {
          ...state,
          activeSession: newSession,
          activeTournament: null,
          queue: activePlayers.map(p => p.id),
          activeGames: []
      };

      nextState = runScheduler(nextState);
      setState(nextState);
      setActiveTab('session');

      // Immediate Sync
      upsertSession(newSession).catch(err => console.error("❌ Failed to sync session start:", err));
      syncFullRoster(nextState.players).catch(err => console.error("❌ Failed to sync roster on session start:", err));
  };

  const handleEndSession = () => {
      setState(prev => ({ ...prev, activeSession: null, activeGames: [], queue: [] }));
      // Session end: we don't delete from cloud, but we could mark it. 
      // For now, the global effect will handle the null activeSession.
  };

  const handleStartTournament = (
      name: string, 
      courts: number, 
      playerIds: string[],
      matchType: 'singles' | 'doubles',
      teamMode: 'random' | 'manual',
      teams: string[][]
  ) => {
      if (!isAdmin) return;

      let pastTournaments = [...state.pastTournaments];
      if (state.activeTournament && state.activeTournament.status === 'completed') {
          pastTournaments.unshift(state.activeTournament);
      }

      const groups = createGroups(teams);
      let groupMatches = generateGroupMatches(groups);
      groupMatches = assignCourtsToMatches(groupMatches, courts);

      const newTournament: Tournament = {
          id: generateId(),
          name,
          date: Date.now(),
          status: 'active',
          stage: 'group',
          matchType,
          teamMode,
          format: 'round_robin',
          courts,
          players: playerIds,
          teams,
          groups,
          matches: groupMatches
      };

      let nextState = {
          ...state,
          pastTournaments,
          activeTournament: newTournament,
          activeSession: null,
          activeGames: [],
          queue: []
      };
      
      setState(nextState);
      setActiveTab('tournament');

      // Immediate Sync
      upsertTournaments([newTournament]).catch(err => console.error("❌ Failed to sync tournament start:", err));
  };

  const handleEndTournament = () => {
      if (!state.activeTournament) return;
      
      const completed = { ...state.activeTournament, status: 'completed' as const };
      
      setState(prev => ({ 
          ...prev, 
          pastTournaments: [completed, ...prev.pastTournaments],
          activeTournament: null, 
          activeGames: [] 
      }));

      // Immediate Sync
      upsertTournaments([completed]).catch(err => console.error("❌ Failed to sync tournament end:", err));
  };

  const handleUpdateTournament = (tournament: Tournament) => {
      setState(prev => ({ ...prev, activeTournament: tournament }));
      upsertTournaments([tournament]).catch(err => console.error("❌ Failed to sync tournament update:", err));
  };

  const handleTournamentMatchEnd = (gameId: string, scoreA: number, scoreB: number) => {
      if (!state.activeTournament) return;
      
      const matchIndex = state.activeTournament.matches.findIndex(m => m.id === gameId);
      if (matchIndex === -1) return;

      const updatedMatches = [...state.activeTournament.matches];
      updatedMatches[matchIndex] = {
          ...updatedMatches[matchIndex],
          scoreA,
          scoreB,
          status: 'completed'
      };

      // Progress bracket if needed
      const completedMatch = updatedMatches[matchIndex];
      const nextMatches = updateBracketProgression(state.activeTournament, completedMatch);

      const nextTournament = {
          ...state.activeTournament,
          matches: nextMatches
      };

      setState(prev => ({
          ...prev,
          activeTournament: nextTournament
      }));

      upsertTournaments([nextTournament]).catch(err => console.error("❌ Failed to sync tournament match end:", err));
      vibrate('success');
  };

  const handleTournamentScoreUpdate = (gameId: string, sA: number, sB: number) => {
      if (!state.activeTournament) return;
      
      const matchIndex = state.activeTournament.matches.findIndex(m => m.id === gameId);
      if (matchIndex === -1) return;

      const updatedMatches = [...state.activeTournament.matches];
      updatedMatches[matchIndex] = {
          ...updatedMatches[matchIndex],
          scoreA: sA,
          scoreB: sB
      };

      const nextTournament = {
          ...state.activeTournament,
          matches: updatedMatches
      };

      setState(prev => ({
          ...prev,
          activeTournament: nextTournament
      }));

      upsertTournaments([nextTournament]).catch(err => console.error("❌ Failed to sync tournament score update:", err));
  };

  const handleAddPlayer = (p: Player) => {
      if (state.players.some(existing => existing.id === p.id)) {
          return;
      }
      
      upsertPlayers([p]).catch(err => console.error("❌ Failed to sync new player:", err));
      
      setState(prev => ({ ...prev, players: [...prev.players, p] }));
  };

  const handleRemovePlayer = (id: string) => {
      import('./services/playerService').then(({ deletePlayer }) => {
          deletePlayer(id).catch(err => console.error("❌ Failed to delete player from cloud:", err));
      });
      
      setState(prev => ({ ...prev, players: prev.players.filter(p => p.id !== id) }));
  };

  const handleTogglePresence = (id: string, isPresent: boolean) => {
      setState(prev => {
          const players = prev.players.map(p => p.id === id ? { ...p, isPresent } : p);
          const updatedPlayer = players.find(p => p.id === id);
          if (updatedPlayer) {
              upsertPlayers([updatedPlayer]).catch(err => console.error("❌ Failed to sync presence:", err));
          }
          return { ...prev, players };
      });
  };

  const handleUpdateDragonBalls = (playerId: string, delta: number) => {
      setState(prev => {
          const players = prev.players.map(p => 
              p.id === playerId 
                  ? { ...p, dragonBalls: Math.max(0, (p.dragonBalls || 0) + delta) } 
                  : p
          );
          const updatedPlayer = players.find(p => p.id === playerId);
          if (updatedPlayer) {
              upsertPlayers([updatedPlayer]).catch(err => console.error("❌ Failed to sync dragon balls:", err));
          }
          return { ...prev, players };
      });
      vibrate('medium');
  };
  
  const handleUndoGameEnd = () => {
      showAlert("Undo not yet implemented in God Mode engine.");
  };

  const handleUpdatePlayers = (updatedPlayers: Player[]) => {
      setSyncStatus('syncing');
      syncFullRoster(updatedPlayers).then(() => {
          setSyncStatus('synced');
      }).catch(err => {
          console.error('Failed to sync players to Supabase:', err);
          setSyncStatus('error');
      });
      
      setState(prev => ({ ...prev, players: updatedPlayers }));
  };

  const handleResetStats = () => {
      if (!isAdmin) return;
      
      showConfirm("⚠️ DANGER ZONE: RESET RANKINGS?\n\nThis will wipe all wins, losses, and power levels for every fighter.\n\nLegacy Saga/Tournament history will be preserved, but the main leaderboard will start from zero.", () => {
          showConfirm("Are you absolutely sure? This cannot be undone.", () => {
              const nextPlayers = state.players.map(p => ({
                  ...p,
                  gamesPlayed: 0,
                  stats: {
                      wins: 0,
                      losses: 0,
                      currentStreak: 0,
                      clutchWins: 0,
                      bagelsGiven: 0,
                      totalPoints: 0,
                      bonusPoints: 0,
                      noShows: 0,
                      singles: { wins: 0, losses: 0, currentStreak: 0 },
                      doubles: { wins: 0, losses: 0, currentStreak: 0 }
                  }
              }));
              
              setState(prev => ({
                  ...prev,
                  players: nextPlayers
              }));

              // Immediate Sync
              syncFullRoster(nextPlayers).catch(err => console.error("❌ Failed to sync reset stats:", err));

              vibrate('heavy');
          });
      });
  };

  const handleUpdateLeague = (league: League | null) => {
      if (!isAdmin) return;
      
      const isNewOrNull = !league || (state.activeLeague && state.activeLeague.id !== league.id);
      const prevCompleted = state.activeLeague && state.activeLeague.status === 'completed';
      
      let nextPastLeagues = [...state.pastLeagues];
      if (isNewOrNull && prevCompleted) {
          if (!nextPastLeagues.some(l => l.id === state.activeLeague!.id)) {
              nextPastLeagues.unshift(state.activeLeague!);
          }
      }
      
      // Sync to Supabase if league is not null
      if (league) {
          setSyncStatus('syncing');
          const syncLeagueData = async () => {
              try {
                  // 1. Sync the league itself
                  await upsertLeagues([league]);

                  // 2. Also sync players to ensure roster stats are updated in cloud
                  await syncFullRoster(state.players);

                  // 3. Extract and sync matches for scalability
                  const allMatches = (league.days || []).flatMap(day => 
                    (day.matches || []).map(m => ({ ...m, leagueId: league.id, dayId: day.id }))
                  );
                  if (allMatches.length > 0) {
                    await upsertMatches(allMatches);
                  }
                  
                  setSyncStatus('synced');
                  console.log("✅ League and matches synced to Supabase");
              } catch (err: any) {
                  console.error("❌ Failed to sync league update:", err);
                  setSyncStatus('error');
                  showAlert("SYNC ERROR", `Cloud save failed: ${err.message || 'Unknown error'}. Your changes are saved locally but might be lost on refresh.`);
              }
          };
          syncLeagueData();
      }
      
      setState(prev => ({
          ...prev,
          activeLeague: league,
          pastLeagues: nextPastLeagues
      }));
  };

  const handleLeagueNoShow = (matchId: string, playerId: string) => {
    if (!state.activeLeague || !isAdmin) return;

    const updatedLeague = applyNoShow(state.activeLeague, matchId, playerId);

    let dayId: string | undefined;
    for (const day of (updatedLeague.days || [])) {
        if (day.matches.some(m => m.id === matchId)) {
            dayId = day.id;
            break;
        }
    }

    const relatedGame = state.activeGames.find(
      g => g.leagueMatchId === matchId || g.id === matchId
    );

    // Update player stats for no-show
    const nextPlayers = state.players.map(p => {
        if (p.id === playerId) {
            const currentNoShows = p.noShows || p.stats?.noShows || 0;
            return {
                ...p,
                noShows: currentNoShows + 1,
                stats: {
                    ...(p.stats || {}),
                    noShows: currentNoShows + 1
                }
            };
        }
        return p;
    });

    let nextState: AppState = {
      ...state,
      players: nextPlayers,
      activeLeague: updatedLeague
    };

    if (relatedGame) {
      nextState = finalizeGameSilently(nextState, relatedGame.id);
    }
    
    setState(nextState);

    // Sync to Supabase
    setSyncStatus('syncing');
    const syncSaga = async () => {
        try {
            // 1. Sync the updated league
            await upsertLeagues([nextState.activeLeague!]);
            
            // 2. Sync the specific match
            const updatedMatch = nextState.activeLeague!.days.flatMap(d => d.matches).find(m => m.id === matchId);
            if (updatedMatch && dayId) {
                await upsertMatches([{ ...updatedMatch, leagueId: nextState.activeLeague!.id, dayId }]);
            }

            // 3. Sync players to ensure no-show count is updated in cloud
            await syncFullRoster(nextState.players);
            
            setSyncStatus('synced');
            console.log("✅ No-show and League state synced to Supabase");
        } catch (err) {
            console.error("❌ Supabase sync failed after no-show:", err);
            setSyncStatus('error');
        }
    };
    syncSaga();
  };

  const handleLeagueMatchScore = (dayId: string, matchId: string, sA: number, sB: number) => {
      if (!state.activeLeague || !isAdmin) return;

      if (!isValidScore(sA, sB)) {
          showAlert(`Score Rejected. Rules violated:\n- First to ${MATCH_RULES.POINTS_TO_WIN}\n- No ties\n- No scores > ${MATCH_RULES.POINTS_TO_WIN}`);
          return;
      }

      const nextLeague = { ...state.activeLeague };
      const days = [...(nextLeague.days || [])];
      const dayIndex = days.findIndex(d => d.id === dayId);
      if (dayIndex === -1) return;

      const day = { ...days[dayIndex] };
      const matches = [...day.matches];
      const matchIndex = matches.findIndex(m => m.id === matchId);
      if (matchIndex === -1) return;

      const match = matches[matchIndex];
      const wasCompleted = match.isCompleted;

      matches[matchIndex] = finalizePlayedMatch(match, sA, sB);
      day.matches = matches;
      days[dayIndex] = day;
      nextLeague.days = days;

      let nextPlayers = state.players;
      if (!wasCompleted) {
          nextPlayers = updateStatsForGame(
              state.players, 
              match.teamA, 
              match.teamB, 
              sA, 
              sB, 
              match.type
          );
      }
      
      const nextState = { 
          ...state, 
          activeLeague: nextLeague,
          players: nextPlayers 
      };

      // SYNC TO SUPABASE
      const syncToSupabase = async () => {
          const matchData = { ...matches[matchIndex], leagueId: nextLeague.id, dayId: day.id };
          try {
              setSyncStatus('syncing');
              // 1. Sync individual match record (for leaderboard and cross-device views)
              await upsertMatches([matchData]);

              // 2. Sync the entire league state (to preserve the match score in the league days/matches JSONB)
              await upsertLeagues([nextLeague]);
              
              // 3. Sync the updated players (to preserve stats like wins/losses/points)
              await syncFullRoster(nextPlayers);
              
              setSyncStatus('synced');
              console.log("✅ Match and League state synced to Supabase");
          } catch (err) {
              console.error("❌ Supabase sync failed, saving to fallback:", err);
              setSyncStatus('error');
              
              // Local Fallback
              const pending = JSON.parse(localStorage.getItem('pbz_pending_matches') || '[]');
              pending.push(matchData);
              localStorage.setItem('pbz_pending_matches', JSON.stringify(pending));
          }
      };

      if (!wasCompleted) {
          syncToSupabase();
      }

      setState(nextState);
  };

  const handleAdminSuccess = () => {
    setIsAdmin(true);
    setShowAdminModal(false);
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    vibrate('medium');
  };

  const handleRestoreState = (newState: AppState) => {
      setIsRestoring(true);
      setState(newState);
      saveState(newState); 
      setTimeout(() => {
          setIsRestoring(false);
      }, 1000);
  };

  const toggleDarkMode = () => {
    // Forced dark mode
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeScreen 
            onNavigate={setActiveTab} 
            isAdmin={isAdmin}
            onLogout={handleAdminLogout}
            activeLeague={state.activeLeague}
            players={state.players}
            isDarkMode={isDarkMode}
          />
        );
      case 'league':
        return (
          <LeagueManager 
            state={state}
            onUpdateLeague={handleUpdateLeague}
            onUpdatePlayers={handleUpdatePlayers}
            onMatchScore={handleLeagueMatchScore}
            onNoShow={handleLeagueNoShow}
            isAdmin={isAdmin}
            onScoreUpdate={handleLiveScoreUpdate}
            onHighlight={handleHighlightTrigger}
            onUpdateDragonBalls={handleUpdateDragonBalls}
            isDarkMode={isDarkMode}
            showAlert={showAlert}
          />
        );
      case 'leaderboards':
        return (
          <LeaderboardsManager 
            players={state.players}
            activeLeague={state.activeLeague}
            pastLeagues={state.pastLeagues}
            onResetStats={handleResetStats}
            isAdmin={isAdmin}
            onUpdateDragonBalls={handleUpdateDragonBalls}
            isDarkMode={isDarkMode}
          />
        );
      case 'roster':
        return (
          <RosterManager 
            players={state.players}
            onAddPlayer={handleAddPlayer}
            onRemovePlayer={handleRemovePlayer}
            onUpdatePresence={handleTogglePresence}
            isAdmin={isAdmin}
          />
        );
      case 'stats':
        return <PlayerStatsHub players={state.players} />;
      case 'backup':
        return (
          isAdmin ? (
            <BackupRestoreManager 
                appState={state}
                onRestore={handleRestoreState}
                onHardReset={handleHardReset}
                onDeleteCurrentSaga={handleDeleteCurrentSaga}
                onUpdateAutoSync={(enabled) => setState(prev => ({ ...prev, autoSync: enabled }))}
                onFullSync={handleFullTwoWaySync}
            />
          ) : (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-500">
              <div className="relative mb-8 group">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse-slow group-hover:bg-primary/40 transition-all"></div>
                <div className="w-24 h-24 bg-surface/90 backdrop-blur-md rounded-full flex items-center justify-center border-4 border-primary/30 shadow-[0_0_30px_rgba(168,85,247,0.3)] relative z-10 aura-glow">
                  <IconLock className="w-12 h-12 text-primary animate-pulse" />
                </div>
              </div>
              <h2 className="text-4xl font-headline font-black text-on-surface mb-3 italic uppercase tracking-tighter transform -skew-x-12 drop-shadow-md">God Mode Locked</h2>
              <p className="text-on-surface-variant/60 text-sm max-w-xs mb-10 font-medium leading-relaxed uppercase tracking-wide">
                Only those with the power of a God can access these forbidden techniques.
              </p>
              <button
                onClick={() => setShowAdminModal(true)}
                className="bg-primary hover:bg-primary-container text-white px-10 py-5 rounded-2xl font-headline font-black italic uppercase tracking-widest text-lg shadow-lg shadow-primary/30 transition-all active:scale-95 manga-skew"
              >
                <span className="manga-skew-reverse">Unlock God Mode</span>
              </button>
            </div>
          )
        );
      default:
        return null;
    }
  };

  return (
    <Layout 
        activeTab={activeTab}
        onNavigate={setActiveTab}
        isAdmin={isAdmin}
        title={
            activeTab === 'league' ? "Saga Battle" : 
            activeTab === 'leaderboards' ? "Hall of Fame" : 
            activeTab === 'roster' ? "Z-Fighters" : 
            activeTab === 'stats' ? "Career Stats" : 
            activeTab === 'backup' ? "God Mode" : ""
        }
        appState={state}
        onAppStateRestore={handleRestoreState}
        onHardReset={handleHardReset}
        syncStatus={syncStatus}
        onRetrySync={handleFullTwoWaySync}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        isOffline={isOffline}
        actions={
            isAdmin ? (
                <button 
                  onClick={handleAdminLogout}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-hype-900/30 border border-hype-500/20 rounded-full hover:bg-hype-900/50 transition-colors group"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-hype-400 animate-pulse group-hover:bg-red-500" />
                  <span className="text-[9px] font-black text-hype-400 uppercase tracking-widest group-hover:text-red-500">Admin Mode</span>
                </button>
            ) : (
                <button 
                    onClick={() => setShowAdminModal(true)}
                    className="p-2 text-zinc-500 hover:text-white transition-colors"
                >
                    <IconLock size={18} />
                </button>
            )
        }
    >
      {renderContent()}

      {showAdminModal && (
        <AdminUnlockModal 
          onSuccess={handleAdminSuccess}
          onCancel={() => setShowAdminModal(false)}
        />
      )}
    </Layout>
  );
};

export default App;
