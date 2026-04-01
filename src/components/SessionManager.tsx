
import React, { useMemo, useState } from 'react';
import { AppState, Game, Player } from '../types';
import { IconTrophy, IconClock, IconCheck, IconAlert, IconMinus, IconPlus, IconZap, IconFlame, IconDumbbell } from './ui/Icons';
import ScoreModal from './ScoreModal';
import Leaderboard from './Leaderboard';
import { getPlayerBadges, vibrate, getMatchStakes, calculatePowerLevel, getAuraClass } from '../utils/godMode';
import MatchCard from './MatchCard';

import { useDialog } from './ui/DialogProvider';

interface SessionManagerProps {
  state: AppState;
  onGameEnd: (gameId: string, scoreA: number, scoreB: number) => void;
  onUndoGameEnd: () => void;
  onStartSession: (courtCount: number, playMode: 'singles' | 'doubles' | 'mixed') => void;
  onEndSession: () => void;
  onTogglePlayerPresence: (playerId: string, isPresent: boolean) => void;
  onScoreUpdate?: (gameId: string, sA: number, sB: number) => void;
  onHighlight?: (gameId: string) => void;
  isDarkMode?: boolean;
}

const SessionManager: React.FC<SessionManagerProps> = ({ 
  state, 
  onGameEnd, 
  onStartSession, 
  onEndSession,
  onUndoGameEnd,
  onTogglePlayerPresence,
  onScoreUpdate,
  onHighlight,
  isDarkMode
}) => {
  const [scoringGameId, setScoringGameId] = useState<string | null>(null);
  const [setupCourtCount, setSetupCourtCount] = useState(1);
  const [setupPlayMode, setSetupPlayMode] = useState<'singles' | 'doubles' | 'mixed'>('mixed');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const { showConfirm } = useDialog();

  const getPlayer = (id: string) => state.players.find(p => p.id === id);
  const getNames = (ids: string[]) => ids.map(id => getPlayer(id)?.name || 'Unknown').join(' & ');
  const activePlayers = useMemo(() => state.players.filter(p => p.isPresent), [state.players]);
  const waitingList = useMemo(() => {
    const list = state.queue.map(id => getPlayer(id)).filter(Boolean) as Player[];
    return list.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
  }, [state.queue, state.players]);
  const sortedActiveGames = [...state.activeGames].sort((a, b) => a.courtId - b.courtId);

  const isFinalBattleMode = sortedActiveGames.length === 1 && state.queue.length === 0;

  if (!state.activeSession) {
    return (
      <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-6 duration-700 h-full pb-32">
        <div className="text-center space-y-3 mt-10 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-primary/10 blur-[80px] rounded-full animate-pulse-slow"></div>
          <h2 className="text-5xl font-headline font-black italic tracking-tighter text-on-surface uppercase transform -skew-x-12 drop-shadow-lg relative z-10">
            TRAINING <span className="text-primary drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]">ARENA</span>
          </h2>
          <p className="text-primary font-black uppercase text-[11px] tracking-[0.5em] animate-pulse relative z-10">
            Prepare for Battle
          </p>
        </div>

        <div className="dbz-card p-10 space-y-10 backdrop-blur-xl shadow-2xl relative overflow-hidden manga-shadow border-primary/10">
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 blur-[100px] rounded-full -translate-y-24 translate-x-24"></div>
          
          <div className="space-y-8 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-black text-primary uppercase tracking-[0.3em]">Arenas (Courts)</span>
                <span className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em]">Battlegrounds available</span>
              </div>
              <div className="flex items-center gap-5 bg-surface-variant/30 p-2 rounded-[2rem] border-2 border-outline/10 shadow-inner backdrop-blur-md">
                <button 
                  onClick={() => { setSetupCourtCount(Math.max(1, setupCourtCount - 1)); vibrate('light'); }}
                  className="w-14 h-14 flex items-center justify-center rounded-2xl bg-surface text-on-surface active:scale-90 transition-all hover:text-primary hover:bg-primary/5 shadow-xl border border-outline/5"
                >
                  <IconMinus size={24} />
                </button>
                <span className="text-4xl font-headline font-black w-12 text-center text-primary italic drop-shadow-md">{setupCourtCount}</span>
                <button 
                  onClick={() => { setSetupCourtCount(Math.min(6, setupCourtCount + 1)); vibrate('light'); }}
                  className="w-14 h-14 flex items-center justify-center rounded-2xl bg-surface text-on-surface active:scale-90 transition-all hover:text-primary hover:bg-primary/5 shadow-xl border border-outline/5"
                >
                  <IconPlus size={24} />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-black text-secondary uppercase tracking-[0.3em]">Combat Form</span>
                <span className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em]">Select your discipline</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {(['mixed', 'doubles', 'singles'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => { setSetupPlayMode(m); vibrate('light'); }}
                    className={`py-6 rounded-[1.5rem] font-headline font-black uppercase text-[11px] tracking-[0.2em] border-2 transition-all duration-500 manga-skew relative overflow-hidden group ${
                      setupPlayMode === m 
                       ? 'bg-primary border-primary text-on-primary shadow-[0_0_30px_rgba(168,85,247,0.4)] scale-105 z-10' 
                      : 'bg-surface-variant/20 border-outline/10 text-on-surface-variant/60 hover:text-on-surface hover:border-primary/30'
                    }`}
                  >
                    <div className={`absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity ${setupPlayMode === m ? 'animate-pulse' : ''}`}></div>
                    <span className="manga-skew-reverse block relative z-10">{m}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6 relative z-10">
             <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                    <span className="text-[11px] font-black text-on-surface uppercase tracking-[0.3em]">Z-FIGHTERS ({activePlayers.length})</span>
                </div>
                <button onClick={() => setShowLeaderboard(true)} className="text-[10px] font-black text-primary uppercase border-2 border-primary/30 px-4 py-2 rounded-2xl bg-primary/5 hover:bg-primary/20 transition-all shadow-lg active:scale-95">
                    POWER LEVELS
                </button>
             </div>
             <div className="max-h-72 overflow-y-auto pr-3 no-scrollbar space-y-3">
                {state.players
                  .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
                  .map(p => (
                  <button
                    key={p.id}
                    onClick={() => onTogglePlayerPresence(p.id, !p.isPresent)}
                    className={`w-full p-4 rounded-2xl flex items-center justify-between border-2 transition-all duration-300 manga-shadow group ${
                      p.isPresent 
                      ? 'bg-surface-variant/30 border-primary/40 text-on-surface' 
                      : 'bg-surface-variant/10 border-outline/5 text-on-surface-variant/40 grayscale'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${p.isPresent ? 'bg-primary/20 scale-110' : 'bg-surface-variant/50'}`}>
                        {p.avatar || '🥋'}
                      </div>
                      <span className="font-headline font-black italic uppercase tracking-tight text-lg">{p.name}</span>
                    </div>
                    {p.isPresent ? (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-lg animate-in zoom-in">
                        <IconCheck size={14} />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-outline/20"></div>
                    )}
                  </button>
                ))}
             </div>
          </div>

          <button 
            onClick={() => { onStartSession(setupCourtCount, setupPlayMode); vibrate('medium'); }}
            disabled={activePlayers.length < (setupPlayMode === 'singles' ? 2 : 4)}
            className="w-full py-7 bg-primary text-on-primary rounded-[2rem] font-headline font-black italic text-2xl uppercase tracking-tighter shadow-[0_20px_50px_rgba(168,85,247,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all transform -skew-x-12 relative overflow-hidden group disabled:opacity-30 disabled:grayscale disabled:hover:scale-100"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            <span className="skew-x-12 block flex items-center justify-center gap-4">
              <IconZap size={28} className="animate-pulse" />
              ENGAGE TRAINING
            </span>
          </button>
        </div>

        {showLeaderboard && (
          <Leaderboard 
            players={state.players} 
            onClose={() => setShowLeaderboard(false)} 
            trophyHolderId={state.trophyHolderId}
            seasonHistory={state.seasonHistory}
          />
        )}
      </div>
    );
  }

  const scoringGame = state.activeGames.find(g => g.id === scoringGameId);

  return (
    <div className="space-y-12 pb-32 animate-in fade-in duration-700 relative">
      <section className="space-y-8">
        <div className="flex justify-between items-end px-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-headline font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3 drop-shadow-md transform -skew-x-12">
              <IconZap size={22} className="text-primary animate-pulse fill-primary" /> CURRENT SAGA
            </h3>
            <span className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em] ml-8">Active Battlefields</span>
          </div>
          <div className="px-4 py-2 bg-primary/10 border-2 border-primary/20 rounded-2xl manga-skew shadow-lg">
            <span className="manga-skew-reverse block text-[11px] font-black text-primary uppercase tracking-[0.2em]">ARENAS: {state.activeSession.activeCourts}</span>
          </div>
        </div>

        <div className="space-y-6">
          {sortedActiveGames.map(game => (
            <MatchCard 
                key={game.id}
                game={game}
                players={state.players}
                onClick={() => setScoringGameId(game.id)}
                isFinalBattle={isFinalBattleMode}
            />
          ))}

          {state.activeGames.length === 0 && (
            <div className="p-20 text-center bg-surface-variant/20 rounded-[3rem] border-2 border-dashed border-outline/10 group hover:border-primary/30 transition-all manga-shadow">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse"></div>
                <IconZap size={48} className="relative z-10 mx-auto text-outline/20 mb-6 group-hover:text-primary transition-colors animate-bounce" />
              </div>
              <p className="text-on-surface-variant/40 font-black uppercase text-[11px] tracking-[0.5em] animate-pulse">Charging Energy...</p>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-8">
        <div className="flex justify-between items-end px-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-headline font-black text-secondary uppercase tracking-[0.3em] flex items-center gap-3 drop-shadow-md transform -skew-x-12">
              <IconDumbbell size={20} className="text-secondary animate-float" /> WAITING LINE ({waitingList.length})
            </h3>
            <span className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em] ml-8">Warriors in reserve</span>
          </div>
          <button onClick={() => setShowLeaderboard(true)} className="text-[11px] font-black text-primary uppercase tracking-[0.3em] border-b-2 border-primary/30 hover:border-primary transition-all pb-1 active:scale-95">RANKINGS</button>
        </div>

        <div className="flex gap-6 overflow-x-auto pb-10 no-scrollbar -mx-4 px-6">
          {waitingList.map((player, idx) => {
             const aura = getAuraClass(player);
             const power = calculatePowerLevel(player.stats || player);
             return (
                <div key={player.id} className={`shrink-0 w-44 dbz-card bg-surface/95 backdrop-blur-md rounded-[2.5rem] p-7 border-2 relative overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-2xl manga-shadow group ${aura ? 'border-primary shadow-[0_0_20px_rgba(168,85,247,0.3)]' : 'border-outline/10 hover:border-primary/30'}`}>
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-secondary to-primary opacity-40"></div>
                  <div className="absolute -right-4 -top-4 w-20 h-20 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/20 transition-all"></div>
                  
                  <div className="flex justify-between items-start mb-5">
                    <div className={`w-12 h-12 rounded-2xl bg-surface-variant/50 flex items-center justify-center text-2xl border border-outline/10 group-hover:border-primary/40 transition-colors ${aura ? 'aura-glow border-primary' : ''}`}>
                      {player.avatar || '🥋'}
                    </div>
                    <span className="text-[11px] font-black text-primary/40 italic">#{idx + 1}</span>
                  </div>

                  <div className="text-lg font-headline font-black text-on-surface italic truncate mb-5 uppercase tracking-tight transform -skew-x-6 group-hover:text-primary transition-colors">{player.name}</div>
                  
                  <div className="space-y-4">
                    {getPlayerBadges(player, state.players).slice(0, 1).map((b) => (
                        <div key={b.label} className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-xl bg-surface-variant/30 border border-outline/5 flex items-center gap-2 shadow-inner ${b.color}`}>
                            <span className="opacity-60 text-base">{b.icon}</span> {b.label}
                        </div>
                    ))}
                    <div className="flex items-center justify-between pt-2 border-t border-outline/5">
                        <div className="text-[11px] font-black text-primary italic tracking-tighter drop-shadow-sm">PL {power.toLocaleString()}</div>
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.8)]"></div>
                    </div>
                  </div>
                </div>
             );
          })}
        </div>
      </section>

      <div className="pt-10 border-t-2 border-outline/10 mt-4">
        <button 
          onClick={() => { showConfirm("End current saga?", onEndSession); }}
          className="w-full py-8 bg-surface-variant/20 border-2 border-primary/20 text-primary rounded-[2.5rem] text-[13px] font-headline font-black uppercase tracking-[0.5em] hover:bg-primary/10 transition-all active:scale-95 shadow-2xl manga-shadow manga-skew relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          <span className="manga-skew-reverse flex items-center justify-center gap-4 relative z-10">
            <IconZap size={22} className="text-primary animate-pulse fill-primary" />
            SEAL THE SCROLL
          </span>
        </button>
      </div>

      {scoringGame && (
        <ScoreModal 
          game={scoringGame}
          teamANames={getNames(scoringGame.teamA)}
          teamBNames={getNames(scoringGame.teamB)}
          onSave={(sA, sB) => {
            onGameEnd(scoringGame.id, sA, sB);
            setScoringGameId(null);
          }}
          onCancel={() => setScoringGameId(null)}
          onScoreChange={(sA, sB) => onScoreUpdate && onScoreUpdate(scoringGame.id, sA, sB)}
          onHighlight={() => onHighlight && onHighlight(scoringGame.id)} // Pass highlight handler
        />
      )}

      {showLeaderboard && (
        <Leaderboard 
          players={state.players} 
          onClose={() => setShowLeaderboard(false)} 
          trophyHolderId={state.trophyHolderId}
          seasonHistory={state.seasonHistory}
        />
      )}
    </div>
  );
};

export default SessionManager;
