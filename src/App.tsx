
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { AppState, Game, Player, Session, Tournament, League, TournamentMatch, GameEvent, PBZHighlight } from './types';
import { loadState, saveState, generateId } from './utils/storage';
import { runScheduler, finalizeGame, updateStatsForGame, finalizeGameSilently } from './utils/engine';
import { createGroups, generateGroupMatches, generateKnockoutBracket, updateBracketProgression, assignCourtsToMatches } from './utils/tournamentLogic';
import { isValidScore } from './utils/rules';
import { applyNoShow, isLeagueDayComplete, finalizePlayedMatch } from './utils/leagueLogic';
import { vibrate } from './utils/godMode';
import { SyncStatus } from './components/SyncStatusPill';

import { upsertPlayers } from './services/playerService';
import { addSinglesMatch, addDoublesMatch, upsertMatches } from './services/matchService';
import { getActiveLeague, getAllLeagues, upsertLeagues, deleteLeague } from './services/leagueService';
import { getPlayers } from './services/queryService';
import Layout from './components/Layout';
import LeagueManager from './components/LeagueManager';
import LeaderboardsManager from './components/LeaderboardsManager';
import RosterManager from './components/RosterManager';
import AdminUnlockModal from './components/AdminUnlockModal';
import HomeScreen from './components/HomeScreen';
import ScoreModal from './components/ScoreModal';
import PlayerStatsHub from './components/PlayerStatsHub';
import BackupRestoreManager from './components/BackupRestoreManager';
import { useDialog } from './components/ui/DialogProvider';
import { IconLock } from './components/ui/Icons';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(loadState());
  const [isRestoring, setIsRestoring] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'league' | 'roster' | 'leaderboards' | 'stats' | 'backup'>('home');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  
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

  // --- SUPABASE-FIRST BOOT SEQUENCE ---
  const bootSequence = useCallback(async (retryCount = 0) => {
    setSyncStatus('syncing'); 
    try {
        // Create a timeout for the entire boot sequence - increased to 30s
        const bootPromise = (async () => {
            // 1. Fetch Players from Supabase
            const players = await getPlayers();
            
            // 2. Fetch Active League from Supabase
            const league = await getActiveLeague().catch(() => null);
            setSupabaseLeague(league);
            console.log("🏆 ACTIVE LEAGUE FETCHED:", league?.name);

            // 3. Fetch All Leagues (to populate past leagues)
            const allLeagues = await getAllLeagues().catch(() => []);
            const pastLeagues = allLeagues.filter((l: any) => l.id !== league?.id);
            console.log("📚 OTHER LEAGUES FETCHED:", pastLeagues.length, pastLeagues.map(l => l.name));

            return { players, league, pastLeagues };
        })();

        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Boot Sequence Timeout')), 30000)
        );

        const { players, league, pastLeagues } = await Promise.race([bootPromise, timeoutPromise]) as any;

        // 4. Hydrate Local State
        setState(prev => {
            // Merge players: Prefer the version with more games played to avoid overwriting local stats with empty cloud data
            const mergedPlayers = [...prev.players];
            
            (players || []).forEach(sp => {
                const localIdx = mergedPlayers.findIndex(p => p.id === sp.id);
                if (localIdx === -1) {
                    mergedPlayers.push(sp);
                } else {
                    const localPlayer = mergedPlayers[localIdx];
                    const spGames = sp.gamesPlayed || sp.games_played || 0;
                    const localGames = localPlayer.gamesPlayed || (localPlayer.stats?.wins || 0) + (localPlayer.stats?.losses || 0);
                    
                    // If Supabase has more or equal games, or if local is empty, use Supabase
                    if (spGames >= localGames) {
                        mergedPlayers[localIdx] = sp;
                    }
                }
            });

            // --- CLEANUP: Deduplicate by name and remove empty "extra" players ---
            const cleanedPlayers = mergedPlayers.reduce((acc: Player[], current) => {
                const normalizedName = current.name?.toLowerCase().trim() || "";
                if (!normalizedName) return acc;

                const existing = acc.find(p => p.name.toLowerCase().trim() === normalizedName);
                
                // Calculate total games across all possible stat fields
                const currentGames = (current.gamesPlayed || 0) + 
                                   (current.wins || 0) + 
                                   (current.losses || 0) +
                                   (current.stats?.wins || 0) + 
                                   (current.stats?.losses || 0);
                
                // Check if player is in ANY active or past league
                const isInActiveLeague = league?.players?.some((p: any) => String(p.id) === String(current.id));
                const isInPastLeagues = (pastLeagues || []).some(pl => 
                    pl.players?.some((p: any) => String(p.id) === String(current.id)) ||
                    pl.finalStandings?.some((s: any) => String(s.playerId) === String(current.id))
                );
                
                // If no games and not in any league (active or past), it's an "extra" name
                if (currentGames === 0 && !isInActiveLeague && !isInPastLeagues) {
                    return acc;
                }

                if (!existing) {
                    acc.push(current);
                } else {
                    // If duplicate name, keep the one with more games/stats or the one in the active league
                    const existingGames = (existing.gamesPlayed || 0) + 
                                        (existing.wins || 0) + 
                                        (existing.losses || 0) +
                                        (existing.stats?.wins || 0) + 
                                        (existing.stats?.losses || 0);
                    
                    const existingInActive = league?.players?.some((p: any) => String(p.id) === String(existing.id));
                    
                    if (currentGames > existingGames || (isInActiveLeague && !existingInActive)) {
                        const idx = acc.indexOf(existing);
                        acc[idx] = current;
                    }
                }
                return acc;
            }, []);

            // Merge past leagues
            const mergedPastLeagues = [...(prev.pastLeagues || [])];
            (pastLeagues || []).forEach(sl => {
                const localIdx = mergedPastLeagues.findIndex(l => l.id === sl.id);
                if (localIdx === -1) {
                    mergedPastLeagues.push(sl);
                } else {
                    // Prefer Supabase if it has more data (e.g. finalStandings)
                    const spData = sl.finalStandings?.length || 0;
                    const localData = mergedPastLeagues[localIdx].finalStandings?.length || 0;
                    if (spData >= localData) {
                        mergedPastLeagues[localIdx] = sl;
                    }
                }
            });

            const newState = {
                ...prev,
                players: cleanedPlayers,
                activeLeague: league || prev.activeLeague,
                pastLeagues: mergedPastLeagues.sort((a, b) => 
                    new Date(b.createdAt || b.created_at || 0).getTime() - 
                    new Date(a.createdAt || a.created_at || 0).getTime()
                )
            };
            console.log("🔄 STATE HYDRATED:", newState.players.length, "players,", newState.pastLeagues.length, "past leagues");
            return newState;
        });

        setSyncStatus('synced');
    } catch (e) {
        console.error(`Saga Boot Error (Attempt ${retryCount + 1}):`, e);
        if (retryCount < 2) {
            // Retry after 3 seconds
            setTimeout(() => bootSequence(retryCount + 1), 3000);
        } else {
            setSyncStatus('offline');
        }
    } finally {
        setIsLeagueLoading(false);
    }
  }, []);

  useEffect(() => {
    bootSequence();
  }, [bootSequence]);

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
  };

  const handleEndSession = () => {
      setState(prev => ({ ...prev, activeSession: null, activeGames: [], queue: [] }));
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
  };

  const handleAddPlayer = (p: Player) => {
      setState(prev => {
          if (prev.players.some(existing => existing.id === p.id)) {
              return prev;
          }
          return { ...prev, players: [...prev.players, p] };
      });
  };

  const handleRemovePlayer = (id: string) => {
      setState(prev => ({ ...prev, players: prev.players.filter(p => p.id !== id) }));
  };

  const handleTogglePresence = (id: string, isPresent: boolean) => {
      setState(prev => {
          const players = prev.players.map(p => p.id === id ? { ...p, isPresent } : p);
          return { ...prev, players };
      });
  };
  
  const handleUndoGameEnd = () => {
      showAlert("Undo not yet implemented in God Mode engine.");
  };

  const handleUpdatePlayers = (updatedPlayers: Player[]) => {
      setState(prev => {
          if (prev.autoSync) {
              upsertPlayers(updatedPlayers).catch(err => {
                  console.error('Failed to sync players to Supabase:', err);
              });
          }
          return { ...prev, players: updatedPlayers };
      });
  };

  const handleResetStats = () => {
      if (!isAdmin) return;
      
      showConfirm("⚠️ DANGER ZONE: RESET RANKINGS?\n\nThis will wipe all wins, losses, and power levels for every fighter.\n\nLegacy Saga/Tournament history will be preserved, but the main leaderboard will start from zero.", () => {
          showConfirm("Are you absolutely sure? This cannot be undone.", () => {
              setState(prev => ({
                  ...prev,
                  players: prev.players.map(p => ({
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
                  }))
              }));
              vibrate('heavy');
          });
      });
  };

  const handleUpdateLeague = (league: League | null) => {
      if (!isAdmin) return;
      
      setState(prev => {
          const isNewOrNull = !league || (prev.activeLeague && prev.activeLeague.id !== league.id);
          const prevCompleted = prev.activeLeague && prev.activeLeague.status === 'completed';
          
          let nextPastLeagues = [...prev.pastLeagues];
          if (isNewOrNull && prevCompleted) {
              if (!nextPastLeagues.some(l => l.id === prev.activeLeague!.id)) {
                  nextPastLeagues.unshift(prev.activeLeague!);
              }
          }
          
          // Sync to Supabase if league is not null and autoSync is enabled
          if (league && prev.autoSync) {
              upsertLeagues([league]).catch(err => {
                  console.error('Failed to sync league to Supabase:', err);
                  setSyncStatus('error');
              });

              // Extract and sync matches for scalability
              const allMatches = (league.days || []).flatMap(day => 
                (day.matches || []).map(m => ({ ...m, leagueId: league.id, dayId: day.id }))
              );
              if (allMatches.length > 0) {
                upsertMatches(allMatches).catch(err => {
                  console.error('Failed to sync matches to Supabase:', err);
                });
              }
          }
          
          return {
              ...prev,
              activeLeague: league,
              pastLeagues: nextPastLeagues
          };
      });
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

    let nextState: AppState = {
      ...state,
      activeLeague: updatedLeague
    };

    if (relatedGame) {
      nextState = finalizeGameSilently(nextState, relatedGame.id);
    }
    
    setState(nextState);

    // Sync to Supabase
    if (state.autoSync) {
        upsertLeagues([updatedLeague]).catch(err => {
            console.error("❌ Failed to sync league after no-show:", err);
        });
    }
  };

  const handleLeagueMatchScore = (dayId: string, matchId: string, sA: number, sB: number) => {
      if (!state.activeLeague || !isAdmin) return;

      if (!isValidScore(sA, sB)) {
          showAlert("Score Rejected. Rules violated:\n- First to 11\n- No ties\n- No scores > 11");
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
      
      // SYNC TO SUPABASE
      const syncToSupabase = async () => {
          try {
              // 1. Sync individual match record (for leaderboard views)
              if (match.type === 'singles') {
                  const p1 = state.players.find(p => p.id === match.teamA[0]);
                  const p2 = state.players.find(p => p.id === match.teamB[0]);
                  if (p1 && p2) {
                      const isWinnerA = sA > sB;
                      await addSinglesMatch({
                          winner: isWinnerA ? p1.name : p2.name,
                          loser: isWinnerA ? p2.name : p1.name,
                          winnerScore: isWinnerA ? sA : sB,
                          loserScore: isWinnerA ? sB : sA,
                          context: 'league'
                      });
                  }
              } else {
                  const p1 = state.players.find(p => p.id === match.teamA[0]);
                  const p2 = state.players.find(p => p.id === match.teamA[1]);
                  const p3 = state.players.find(p => p.id === match.teamB[0]);
                  const p4 = state.players.find(p => p.id === match.teamB[1]);
                  if (p1 && p2 && p3 && p4) {
                      await addDoublesMatch({
                          team1Player1: p1.name,
                          team1Player2: p2.name,
                          team2Player1: p3.name,
                          team2Player2: p4.name,
                          winningTeam: sA > sB ? 1 : 2,
                          team1Score: sA,
                          team2Score: sB,
                          context: 'league'
                      });
                  }
              }

              // 2. Sync the entire league state (to preserve the match score in the league days/matches JSONB)
              if (state.autoSync) {
                  await upsertLeagues([nextLeague]);
              }

              console.log("✅ Match and League state synced to Supabase");
          } catch (err) {
              console.error("❌ Supabase sync failed:", err);
          }
      };

      if (!wasCompleted) {
          syncToSupabase();
      }

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
            isDarkMode={isDarkMode}
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
            activeTab === 'league' ? "League Mode" : 
            activeTab === 'leaderboards' ? "Hall of Fame" : 
            activeTab === 'roster' ? "Roster" : 
            activeTab === 'stats' ? "Career Stats" : 
            activeTab === 'backup' ? "God Mode" : ""
        }
        appState={state}
        onAppStateRestore={handleRestoreState}
        onHardReset={handleHardReset}
        syncStatus={syncStatus}
        onRetrySync={bootSequence}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
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
