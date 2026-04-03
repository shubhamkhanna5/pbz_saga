
import React, { useState } from 'react';
import { useDialog } from './ui/DialogProvider';
import { AppState } from '../types';
import { INITIAL_STATE } from '../data/initialState';
import { migrateState } from '../utils/migrations';
import { IconCloud, IconCheck, IconAlert, IconTrash, IconUpload, IconDatabase, IconRefresh, IconDownload, IconCode } from './ui/Icons';
import SupabaseSchema from './SupabaseSchema';
import { supabase } from '../lib/supabase';
import { getPlayers } from '../services/queryService';
import { getActiveLeague, getAllLeagues, upsertLeagues } from '../services/leagueService';
import { upsertPlayers } from '../services/playerService';
import { upsertMatches } from '../services/matchService';

interface BackupRestoreManagerProps {
  appState: AppState;
  onRestore: (state: AppState) => void;
  onHardReset?: () => void;
  onDeleteCurrentSaga?: () => void;
  onUpdateAutoSync?: (enabled: boolean) => void;
}

const BackupRestoreManager: React.FC<BackupRestoreManagerProps> = ({ appState, onRestore, onHardReset, onDeleteCurrentSaga, onUpdateAutoSync }) => {
  const { showConfirm } = useDialog();
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'loading', message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSchema, setShowSchema] = useState(false);
  const [showManualJson, setShowManualJson] = useState(false);
  const [manualJson, setManualJson] = useState('');
  const [recoveryData, setRecoveryData] = useState<{ key: string, date: string }[]>([]);

  // Check for old database versions in localStorage
  React.useEffect(() => {
    const versions = ['picklequeue_db_v1', 'picklequeue_db_v2', 'picklequeue_db_v3_backup'];
    const found = versions.filter(v => localStorage.getItem(v)).map(v => ({
      key: v,
      date: v.includes('backup') ? 'Safety Backup' : 'Legacy Version'
    }));
    setRecoveryData(found);
  }, []);

  const handleRecover = (key: string) => {
    showConfirm(`RESTORE FROM ${key}?\n\nThis will replace your current state with data from an older version of the app.`, () => {
      try {
        const serialized = localStorage.getItem(key);
        if (serialized) {
          const state = JSON.parse(serialized);
          const migrated = migrateState(state, INITIAL_STATE);
          onRestore(migrated);
          setStatus({ type: 'success', message: `Successfully recovered from ${key}!` });
        }
      } catch (err) {
        setStatus({ type: 'error', message: 'Recovery failed: Invalid data format' });
      }
    });
  };

  const handleManualRestore = () => {
    if (!manualJson) return;
    try {
      const data = JSON.parse(manualJson);
      
      // Flexible restore: if it's just a players array, wrap it in a partial state
      let targetState: any = data;
      if (Array.isArray(data)) {
        targetState = { players: data };
      } else if (data.players && !data.activeLeague && !data.pastLeagues) {
        // Likely just a partial backup
        targetState = { ...INITIAL_STATE, ...data };
      }

      const migrated = migrateState(targetState, INITIAL_STATE);
      onRestore(migrated);
      setStatus({ type: 'success', message: 'Successfully restored from manual JSON!' });
      setShowManualJson(false);
      setManualJson('');
    } catch (err) {
      console.error("Manual Restore Error:", err);
      setStatus({ type: 'error', message: 'Invalid JSON format. Please check your data.' });
    }
  };

  const handleSupabaseSync = async () => {
    setIsLoading(true);
    setStatus({ type: 'loading', message: 'Syncing with Supabase...' });
    try {
      // Fetch players and active league from Supabase
      const [players, activeLeague, allLeagues] = await Promise.all([
        getPlayers(),
        getActiveLeague(true).catch(() => null),
        getAllLeagues().catch(() => [])
      ]);

      if (!players || players.length === 0) {
        throw new Error('No players found in Supabase');
      }

      const pastLeagues = allLeagues.filter((l: any) => l.status === 'completed');

      // ⚡ Robust Deduplication and Cleanup (Same as bootSequence)
      const uniquePlayers = (players || []).reduce((acc: any[], current: any) => {
          const normalizedName = current.name?.toLowerCase().trim() || "";
          if (!normalizedName) return acc;

          const existing = acc.find(p => p.name.toLowerCase().trim() === normalizedName || p.id === current.id);
          
          const currentGames = (current.gamesPlayed || 0) + 
                             (current.wins || 0) + 
                             (current.losses || 0) +
                             (current.stats?.wins || 0) + 
                             (current.stats?.losses || 0);
          
          if (!existing) {
              acc.push(current);
          } else {
              const existingGames = (existing.gamesPlayed || 0) + 
                                  (existing.wins || 0) + 
                                  (existing.losses || 0) +
                                  (existing.stats?.wins || 0) + 
                                  (existing.stats?.losses || 0);
              
              const existingInActive = activeLeague?.players?.some((p: any) => String(p.id) === String(existing.id));
              const currentInActive = activeLeague?.players?.some((p: any) => String(p.id) === String(current.id));
              
              if (currentGames > existingGames || (currentInActive && !existingInActive)) {
                  const idx = acc.indexOf(existing);
                  acc[idx] = current;
              }
          }
          return acc;
      }, []);

      // Merge with current state or create new state
      const newState: AppState = {
        ...appState,
        players: uniquePlayers.map((p: any) => ({
          ...p,
          isPresent: p.isPresent ?? true
        })),
        activeLeague: activeLeague ? {
          ...activeLeague,
          players: activeLeague.players || [],
          days: activeLeague.days || []
        } : null,
        pastLeagues: pastLeagues.map((l: any) => ({
          ...l,
          players: l.players || [],
          days: l.days || []
        }))
      };

      onRestore(newState);
      setStatus({ type: 'success', message: 'Successfully synced with Supabase!' });
    } catch (err: any) {
      console.error('Supabase Sync Error:', err);
      setStatus({ type: 'error', message: `Sync failed: ${err.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePushToSupabase = async (stateOverride?: AppState) => {
    const targetState = stateOverride || appState;
    setIsLoading(true);
    setStatus({ type: 'loading', message: 'Pushing data to Supabase...' });
    try {
      // 1. Push Players (Deduplicate first)
      if (targetState.players && targetState.players.length > 0) {
        const uniquePlayers = targetState.players.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
        
        // Upsert all current players
        await upsertPlayers(uniquePlayers);
        
        // Optional: Clean up players in Supabase that are no longer in our local roster
        // We only do this in God Mode manual push to ensure a clean state
        const currentPlayerIds = uniquePlayers.map(p => p.id);
        if (currentPlayerIds.length > 0) {
          const { error: deleteError } = await supabase
            .from('players')
            .delete()
            .not('id', 'in', `(${currentPlayerIds.join(',')})`);
          
          if (deleteError) {
            console.warn('Roster cleanup warning:', deleteError);
            // Don't fail the whole push if cleanup fails, but log it
          }
        }
      }

      // 2. Push Leagues (Active and Past - Deduplicate by id)
      const leaguesToPush = [];
      if (targetState.activeLeague) leaguesToPush.push(targetState.activeLeague);
      if (targetState.pastLeagues) leaguesToPush.push(...targetState.pastLeagues);
      
      const uniqueLeagues = leaguesToPush.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
      
      if (uniqueLeagues.length > 0) {
        await upsertLeagues(uniqueLeagues);
      }

      // 3. Push Matches (from all unique leagues - Deduplicate by id)
      const matchesToPush: any[] = [];
      const processLeagueMatches = (league: any) => {
        if (league.days) {
          league.days.forEach((day: any) => {
            if (day.matches) {
              day.matches.forEach((match: any) => {
                matchesToPush.push({
                  ...match,
                  leagueId: league.id,
                  dayId: day.id
                });
              });
            }
          });
        }
      };

      uniqueLeagues.forEach(processLeagueMatches);

      if (matchesToPush.length > 0) {
        const uniqueMatches = matchesToPush.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
        await upsertMatches(uniqueMatches);
      }

      setStatus({ type: 'success', message: 'Successfully pushed all data to Supabase!' });
    } catch (err: any) {
      console.error('Supabase Push Error:', err);
      setStatus({ type: 'error', message: `Push failed: ${err.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700">
      <div className="dbz-card p-10 relative overflow-hidden manga-shadow bg-surface/90 backdrop-blur-md border-primary/20 space-y-8">
        <div className="absolute top-0 right-0 w-48 h-48 opacity-10 pointer-events-none -translate-y-10 translate-x-10">
          <IconDatabase size={192} className="text-primary" />
        </div>

        <div className="text-center space-y-3 relative z-10">
          <div className="w-20 h-20 bg-surface-variant/50 rounded-3xl flex items-center justify-center border-4 border-primary/30 mx-auto shadow-[0_0_30px_rgba(255,140,0,0.2)] aura-glow">
            <IconCloud size={40} className="text-primary animate-pulse" />
          </div>
          <h2 className="text-4xl font-headline font-black italic text-on-surface uppercase tracking-tighter transform -skew-x-12 drop-shadow-md">Backup & Restore</h2>
          <p className="text-[11px] text-primary font-black uppercase tracking-[0.4em] animate-pulse">God Mode Data Management</p>
        </div>

        {status && (
          <div className={`p-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border-2 flex items-center gap-4 animate-in zoom-in-95 ${
            status.type === 'success' ? 'bg-green-900/20 border-green-500/30 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)]' : 
            status.type === 'loading' ? 'bg-primary/20 border-primary/30 text-primary shadow-[0_0_15px_rgba(255,140,0,0.2)]' :
            'bg-red-900/20 border-red-500/30 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
          }`}>
            <div className="p-2 rounded-lg bg-current/10">
              {status.type === 'success' ? <IconCheck size={18} /> : 
               status.type === 'loading' ? <IconRefresh size={18} className="animate-spin" /> :
               <IconAlert size={18} />}
            </div>
            <span className="flex-1">{status.message}</span>
          </div>
        )}

        <div className="bg-surface-variant/20 p-6 rounded-3xl border border-outline/10 space-y-4 manga-shadow">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-black text-on-surface uppercase tracking-wider">Supabase Auto-Sync</p>
              <p className="text-[10px] text-on-surface-variant/60 uppercase tracking-widest">Toggle automatic cloud updates</p>
            </div>
            <button 
              onClick={() => onUpdateAutoSync?.(!appState.autoSync)}
              className={`w-14 h-8 rounded-full p-1 transition-all duration-300 manga-skew ${appState.autoSync ? 'bg-primary shadow-[0_0_15px_rgba(255,140,0,0.4)]' : 'bg-surface-variant'}`}
            >
              <div className={`w-6 h-6 bg-white rounded-full shadow-lg transform transition-transform duration-300 manga-skew-reverse ${appState.autoSync ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        {/* Data Recovery Section */}
        {recoveryData.length > 0 && (
          <div className="bg-amber-900/10 border-2 border-amber-500/30 rounded-3xl p-6 space-y-4 manga-shadow animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-amber-500 font-headline font-black italic uppercase tracking-tighter transform -skew-x-12">
              <IconAlert size={24} className="animate-pulse" />
              <h2 className="text-xl">Data Recovery Found!</h2>
            </div>
            <p className="text-[10px] text-amber-200/60 font-black uppercase tracking-widest leading-relaxed">
              We found older versions of your data in this browser. If your data was lost after the Supabase update, 
              try restoring from one of these versions:
            </p>
            <div className="space-y-3">
              {recoveryData.map(recovery => (
                <button
                  key={recovery.key}
                  onClick={() => handleRecover(recovery.key)}
                  className="flex items-center justify-between w-full p-4 bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl hover:bg-amber-500/20 transition-all group manga-skew"
                >
                  <div className="flex items-center gap-3 manga-skew-reverse">
                    <IconDatabase size={18} className="text-amber-500 group-hover:scale-110 transition-transform" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-amber-200">{recovery.key}</span>
                  </div>
                  <IconRefresh size={16} className="text-amber-500/40 manga-skew-reverse" />
                </button>
              ))}
              <button
                onClick={() => setShowManualJson(true)}
                className="flex items-center justify-center w-full p-4 bg-surface-variant/10 border-2 border-outline/10 rounded-2xl hover:bg-surface-variant/20 transition-all group manga-skew"
              >
                <div className="flex items-center gap-3 manga-skew-reverse">
                  <IconCode size={18} className="text-on-surface-variant/40" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant/60">Manual JSON Restore</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {showManualJson && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-zinc-950 border-2 border-primary/30 rounded-[2.5rem] p-8 space-y-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-16 translate-x-16 blur-3xl"></div>
              
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-headline font-black italic text-white uppercase tracking-tighter transform -skew-x-12">Manual Restore</h3>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Paste your backup JSON below</p>
              </div>

              <textarea 
                value={manualJson}
                onChange={(e) => setManualJson(e.target.value)}
                placeholder='{ "players": [...], "activeLeague": ... }'
                className="w-full h-64 bg-zinc-900 border-2 border-white/5 rounded-2xl p-4 text-xs font-mono text-zinc-300 focus:border-primary/50 focus:ring-0 transition-colors resize-none"
              />

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => { setShowManualJson(false); setManualJson(''); }}
                  className="py-4 bg-zinc-900 text-zinc-500 font-black uppercase text-[11px] tracking-widest rounded-2xl hover:bg-zinc-800 transition-all manga-skew"
                >
                  <span className="manga-skew-reverse">Cancel</span>
                </button>
                <button 
                  onClick={handleManualRestore}
                  disabled={!manualJson}
                  className="py-4 bg-primary text-on-primary font-black uppercase text-[11px] tracking-widest rounded-2xl hover:bg-primary-container transition-all shadow-lg shadow-primary/20 disabled:opacity-50 manga-skew"
                >
                  <span className="manga-skew-reverse">Restore Data</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={handleSupabaseSync}
            disabled={isLoading}
            className="w-full py-8 bg-secondary/10 border-2 border-secondary/30 text-secondary font-headline font-black italic uppercase tracking-widest rounded-2xl hover:bg-secondary/20 transition-all flex flex-col items-center justify-center gap-3 disabled:opacity-50 manga-skew group"
          >
            <IconDatabase size={24} className="manga-skew-reverse group-hover:scale-110 transition-transform" />
            <span className="text-[11px] manga-skew-reverse">Sync From Cloud</span>
          </button>

          <button 
            onClick={() => handlePushToSupabase()}
            disabled={isLoading}
            className="w-full py-8 bg-primary/10 border-2 border-primary/30 text-primary font-headline font-black italic uppercase tracking-widest rounded-2xl hover:bg-primary/20 transition-all flex flex-col items-center justify-center gap-3 disabled:opacity-50 manga-skew group"
          >
            <IconUpload size={24} className="manga-skew-reverse group-hover:scale-110 transition-transform" />
            <span className="text-[11px] manga-skew-reverse">Push To Cloud</span>
          </button>
        </div>

        <div className="pt-4">
          <button 
            onClick={() => setShowSchema(!showSchema)}
            className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 border-2 transform -skew-x-6 ${showSchema ? 'bg-primary text-on-primary border-primary' : 'bg-surface-variant/10 border-outline/10 text-on-surface-variant/60 hover:text-primary hover:border-primary/30'}`}
          >
            <IconCode size={18} className="transform skew-x-6" />
            <span className="transform skew-x-6">{showSchema ? 'HIDE SQL SCHEMA' : 'VIEW SUPABASE SQL SCHEMA'}</span>
          </button>
        </div>

        {showSchema && (
          <div className="pt-8 border-t border-outline/10 animate-in fade-in slide-in-from-top-4 duration-500">
            <SupabaseSchema />
          </div>
        )}

        {onHardReset && (
          <div className="pt-8 border-t border-outline/10 space-y-4">
            {onDeleteCurrentSaga && appState.activeLeague && (
                <button 
                    onClick={() => { showConfirm(`⚠️ DELETE CURRENT SAGA: ${appState.activeLeague?.name}?\n\nThis will remove the current active league and all its matches. This cannot be undone.`, onDeleteCurrentSaga); }}
                    className="w-full py-4 bg-amber-900/10 border-2 border-amber-900/30 text-amber-500 font-headline font-black uppercase text-[11px] tracking-[0.3em] rounded-2xl hover:bg-amber-900/20 transition-all flex items-center justify-center gap-3 manga-skew group"
                >
                    <IconTrash size={18} className="manga-skew-reverse group-hover:animate-pulse" /> 
                    <span className="manga-skew-reverse">DELETE CURRENT SAGA</span>
                </button>
            )}
            <button 
              onClick={() => { showConfirm("⚠️ WIPE ALL DATA?\n\nThis will delete all players, sagas, and history. This cannot be undone.", onHardReset); }}
              className="w-full py-4 bg-red-900/10 border-2 border-red-900/30 text-red-500 font-headline font-black uppercase text-[11px] tracking-[0.3em] rounded-2xl hover:bg-red-900/20 transition-all flex items-center justify-center gap-3 manga-skew group"
            >
              <IconTrash size={18} className="manga-skew-reverse group-hover:animate-pulse" /> 
              <span className="manga-skew-reverse">HARD RESET SYSTEM</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BackupRestoreManager;
