
import React, { useState, useMemo } from 'react';
import { useDialog } from './ui/DialogProvider';
import { AppState, TournamentMatch, Player, Tournament } from '../types';
import { IconTrophy, IconMinus, IconPlus, IconCheck, IconZap, IconUsers, IconUserPlus, IconDownload, IconPlay, IconSettings, IconX, IconTrash, IconLock, IconActivity } from './ui/Icons';
import { calculateGroupStandings, createTeams, createGroups, generateGroupMatches } from '../utils/tournamentLogic';
import { vibrate } from '../utils/godMode';
import { exportBracketPDF } from '../utils/pdfGenerator';
import { formatPlayerName } from '../utils/storage';
import ScoreModal from './ScoreModal';
import CustomMatchModal from './CustomMatchModal';
import { AnimatePresence } from 'motion/react';
import { generateId } from '../utils/storage';
import { TournamentMatch as TMatch } from '../types';

interface TournamentManagerProps {
  state: AppState;
  onStartTournament: (name: string, courts: number, playerIds: string[], matchType: 'singles'|'doubles', teamMode: 'random'|'manual', teams: string[][]) => void;
  onEndTournament: () => void;
  onMatchStart: (matchId: string, courtId: number) => void;
  onMatchEnd: (gameId: string, scoreA: number, scoreB: number) => void;
  onUpdateTournament: (tournament: Tournament) => void;
  onScoreUpdate?: (gameId: string, sA: number, sB: number) => void;
  isAdmin?: boolean;
  onHighlight?: (gameId: string) => void;
  isDarkMode?: boolean;
  initialTab?: { type: 'standings' | 'matches' | 'bracket', timestamp: number };
}

const TournamentManager: React.FC<TournamentManagerProps> = ({
  state,
  onStartTournament,
  onEndTournament,
  onMatchEnd,
  onUpdateTournament,
  onScoreUpdate,
  isAdmin,
  onHighlight,
  isDarkMode,
  initialTab
}) => {
  const { showAlert, showConfirm } = useDialog();
  const [setupName, setSetupName] = useState('World Martial Arts Tournament');
  const [setupCourts, setSetupCourts] = useState(1);
  
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [manualTeams, setManualTeams] = useState<string[][]>([]);
  const [stagingPlayer, setStagingPlayer] = useState<string|null>(null);
  
  const [activeTab, setActiveTab] = useState<'standings'|'matches'|'bracket'>(initialTab?.type || 'matches');
  
  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab.type);
    }
  }, [initialTab]);
  const [scoringMatchId, setScoringMatchId] = useState<string | null>(null);
  const [showCustomMatchModal, setShowCustomMatchModal] = useState(false);
  
  const [matchType, setMatchType] = useState<'singles'|'doubles'>('singles');
  const [teamMode, setTeamMode] = useState<'random'|'manual'>('random');

  const getPlayer = (id: string) => state.players.find(p => p.id === id);
  const getNames = (ids: string[]) => ids.map(id => (getPlayer(id)?.name || 'Unknown').toUpperCase()).join(' & ');

  const handleManualPlayerClick = (id: string) => {
      if (stagingPlayer === id) {
          setStagingPlayer(null);
          vibrate('light');
          return;
      }
      if (stagingPlayer) {
          const newTeam = [stagingPlayer, id];
          setManualTeams([...manualTeams, newTeam]);
          setStagingPlayer(null);
          vibrate('success');
      } else {
          setStagingPlayer(id);
          vibrate('light');
      }
  };

  const handleDisbandTeam = (index: number) => {
      const next = [...manualTeams];
      next.splice(index, 1);
      setManualTeams(next);
      vibrate('medium');
  };

  const handlePlayerClick = (id: string) => {
      if (matchType === 'singles' || teamMode === 'random') {
          const next = new Set(selectedPlayers);
          if (next.has(id)) next.delete(id); else next.add(id);
          setSelectedPlayers(next);
          vibrate('light');
      } else {
          handleManualPlayerClick(id);
      }
  };

  const handleSelectAll = () => {
      const presentIds = state.players.filter(p => p.isPresent).map(p => p.id);
      if (selectedPlayers.size === presentIds.length) {
          setSelectedPlayers(new Set());
      } else {
          setSelectedPlayers(new Set(presentIds));
      }
      vibrate('light');
  };

    const handleSaveCustomMatch = (teamA: string[], teamB: string[], scoreA: number, scoreB: number, type: 'singles' | 'doubles') => {
        if (!state.activeTournament) return;

        const newMatch: TMatch = {
            id: generateId(),
            teamA,
            teamB,
            scoreA,
            scoreB,
            status: 'completed',
            round: 99, // Custom round
            courtId: 1,
            type,
            isCustom: true,
            highlights: []
        };

        const updatedTournament = {
            ...state.activeTournament,
            matches: [...state.activeTournament.matches, newMatch]
        };

        onUpdateTournament(updatedTournament);
        setShowCustomMatchModal(false);
        vibrate('success');
    };

    const handleStart = () => {
      if (!isAdmin) return;
      if (matchType === 'doubles' && teamMode === 'manual') {
          const flatPlayers = manualTeams.reduce<string[]>((acc, team) => acc.concat(team), [] as string[]);
          onStartTournament(setupName, setupCourts, flatPlayers, matchType, teamMode, manualTeams);
      } else {
          const players = Array.from(selectedPlayers) as string[];
          const teams = createTeams(players, matchType, teamMode); 
          onStartTournament(setupName, setupCourts, players, matchType, teamMode, teams);
      }
  };
  
  const handleEndEvent = () => {
      if (!isAdmin) return;
      showConfirm("⚠️ END TOURNAMENT?\n\nThis will archive the event and cannot be undone.", onEndTournament);
  };

  const renderTeamPills = (teamIds: string[], align: 'left' | 'right', isWinner: boolean) => (
    <div className={`flex flex-wrap gap-1 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
      {teamIds.map(id => {
         const p = getPlayer(id);
         const name = p?.name || 'Unknown';
         return (
           <span 
              key={id} 
              className={`px-2 py-1 rounded-md text-[10px] sm:text-xs font-headline font-black italic uppercase leading-tight break-words whitespace-normal max-w-full text-center ${isWinner ? 'bg-primary text-on-primary' : 'bg-surface-variant/50 text-on-surface-variant'}`}
           >
             {formatPlayerName(name)}
           </span>
         )
      })}
    </div>
  );
  
  if (!state.activeTournament) {
    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 animate-in fade-in pb-20">
                <div className="w-28 h-28 bg-surface rounded-[2.5rem] flex items-center justify-center border-4 border-outline/10 manga-shadow relative overflow-hidden group">
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <IconLock size={48} className="text-on-surface-variant/20 relative z-10" />
                </div>
                <div className="space-y-3">
                    <h2 className="text-3xl font-headline font-black italic uppercase text-on-surface-variant/30 transform -skew-x-12 tracking-tighter">Tournament Mode</h2>
                    <p className="text-[11px] text-primary font-black uppercase tracking-[0.4em] animate-pulse">Waiting for Grandmaster to Initialize</p>
                </div>
            </div>
        );
    }

    const presentPlayers = state.players.filter(p => p.isPresent);
    const assignedPlayers = new Set(manualTeams.flat());
    const availablePlayers = presentPlayers.filter(p => !assignedPlayers.has(p.id));
    
    const canStart = matchType === 'doubles' && teamMode === 'manual' 
        ? manualTeams.length >= 2 
        : selectedPlayers.size >= (matchType === 'singles' ? 2 : 4);

    return (
      <div className="space-y-10 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center space-y-4 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 blur-[100px] rounded-full animate-pulse-slow"></div>
            <div className="w-32 h-32 bg-surface rounded-[3rem] flex items-center justify-center text-primary mx-auto mb-8 border-4 border-primary/30 rotate-12 shadow-2xl aura-glow relative z-10 group hover:rotate-[24deg] transition-all duration-700">
                <IconTrophy size={64} className="drop-shadow-glow group-hover:scale-110 transition-transform" />
            </div>
            <div className="manga-skew inline-block">
                <h2 className="text-6xl font-headline font-black italic uppercase text-on-surface tracking-tighter drop-shadow-2xl manga-skew-reverse">
                    WORLD <span className="text-primary">TOURNAMENT</span>
                </h2>
            </div>
            <p className="text-primary font-black uppercase text-xs tracking-[0.6em] animate-pulse relative z-10 mt-4">Tenkaichi Budokai</p>
        </div>

        <div className="relative overflow-hidden bg-surface border-2 border-primary/20 rounded-[3.5rem] p-10 sm:p-14 shadow-2xl manga-shadow group/setup">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
                <div className="absolute top-0 left-1/3 w-px h-full bg-primary transition-all duration-1000 group-hover/setup:left-1/2"></div>
                <div className="absolute top-0 right-1/3 w-px h-full bg-secondary transition-all duration-1000 group-hover/setup:right-1/2"></div>
            </div>
            
            <div className="relative z-10 space-y-12">
                <div className="space-y-4">
                    <label className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-[0.5em] ml-2 flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-primary animate-ping"></div>
                        SAGA TITLE
                    </label>
                    <div className="relative group/input">
                        <input 
                            type="text" 
                            value={setupName}
                            onChange={(e) => setSetupName(e.target.value)}
                            className="w-full bg-surface-variant/10 border-2 border-outline/5 rounded-3xl px-8 py-6 text-2xl font-headline font-black italic text-on-surface focus:border-primary focus:ring-0 transition-all placeholder:text-on-surface-variant/20 transform -skew-x-6"
                            placeholder="Enter Tournament Name..."
                        />
                        <div className="absolute bottom-0 left-0 w-0 h-1 bg-primary transition-all duration-700 group-focus-within/input:w-full"></div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div className="space-y-10">
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-[0.5em] ml-2">ARENAS</label>
                                <div className="flex items-center gap-4 bg-surface-variant/10 p-2 rounded-3xl border-2 border-outline/5 transform -skew-x-6">
                                    <button 
                                        onClick={() => setSetupCourts(Math.max(1, setupCourts - 1))}
                                        className="w-16 h-16 flex items-center justify-center rounded-2xl bg-surface border-2 border-outline/10 text-on-surface-variant hover:bg-surface-variant hover:text-on-surface transition-all active:scale-90 shadow-lg"
                                    >
                                        <IconMinus size={28} />
                                    </button>
                                    <span className="flex-1 text-center text-4xl font-headline font-black italic text-on-surface skew-x-6">{setupCourts}</span>
                                    <button 
                                        onClick={() => setSetupCourts(Math.min(6, setupCourts + 1))}
                                        className="w-16 h-16 flex items-center justify-center rounded-2xl bg-primary text-on-primary border-2 border-primary/50 transition-all active:scale-90 shadow-xl"
                                    >
                                        <IconPlus size={28} />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-[0.5em] ml-2">COMBAT MODE</label>
                                <div className="flex p-2 bg-surface-variant/10 rounded-3xl border-2 border-outline/5 transform -skew-x-6 h-[84px]">
                                    <button 
                                        onClick={() => setMatchType('singles')}
                                        className={`flex-1 py-4 rounded-2xl font-headline font-black italic text-sm uppercase tracking-widest transition-all skew-x-6 ${matchType === 'singles' ? 'bg-primary text-on-primary shadow-lg' : 'text-on-surface-variant hover:text-on-surface'}`}
                                    >
                                        SOLO
                                    </button>
                                    <button 
                                        onClick={() => { setMatchType('doubles'); setTeamMode('random'); }}
                                        className={`flex-1 py-4 rounded-2xl font-headline font-black italic text-sm uppercase tracking-widest transition-all skew-x-6 ${matchType === 'doubles' ? 'bg-primary text-on-primary shadow-lg' : 'text-on-surface-variant hover:text-on-surface'}`}
                                    >
                                        TEAM
                                    </button>
                                </div>
                            </div>
                        </div>

                        {matchType === 'doubles' && (
                            <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
                                <label className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-[0.5em] ml-2">SQUAD FORMATION</label>
                                <div className="flex p-2 bg-surface-variant/10 rounded-3xl border-2 border-outline/5 transform -skew-x-6 h-[84px]">
                                    <button 
                                        onClick={() => setTeamMode('random')}
                                        className={`flex-1 py-4 rounded-2xl font-headline font-black italic text-sm uppercase tracking-widest transition-all skew-x-6 ${teamMode === 'random' ? 'bg-secondary text-on-secondary shadow-lg' : 'text-on-surface-variant hover:text-on-surface'}`}
                                    >
                                        RANDOM
                                    </button>
                                    <button 
                                        onClick={() => setTeamMode('manual')}
                                        className={`flex-1 py-4 rounded-2xl font-headline font-black italic text-sm uppercase tracking-widest transition-all skew-x-6 ${teamMode === 'manual' ? 'bg-secondary text-on-secondary shadow-lg' : 'text-on-surface-variant hover:text-on-surface'}`}
                                    >
                                        MANUAL
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-8">
                        <div className="flex items-center justify-between px-2">
                            <label className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-[0.5em]">
                                {matchType === 'doubles' && teamMode === 'manual' ? 'AVAILABLE WARRIORS' : 'WARRIOR SELECTION'} ({selectedPlayers.size})
                            </label>
                            {!(matchType === 'doubles' && teamMode === 'manual') && (
                                <button 
                                    onClick={handleSelectAll}
                                    className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline transition-all"
                                >
                                    {selectedPlayers.size === presentPlayers.length ? 'DESELECT ALL' : 'SELECT ALL'}
                                </button>
                            )}
                        </div>
                        
                        <div className="bg-surface-variant/5 rounded-[3rem] p-8 border-2 border-outline/5 max-h-[400px] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                                {availablePlayers.map(p => {
                                    const isSelected = selectedPlayers.has(p.id);
                                    const isStaging = stagingPlayer === p.id;
                                    
                                    return (
                                        <button 
                                            key={p.id}
                                            onClick={() => handlePlayerClick(p.id)}
                                            className={`
                                                relative p-5 rounded-2xl border-2 transition-all duration-500 group/player transform -skew-x-6
                                                ${isSelected || isStaging ? 'bg-primary/10 border-primary shadow-lg scale-105' : 'bg-surface border-outline/10 hover:border-primary/30'}
                                            `}
                                        >
                                            <div className="flex flex-col items-center gap-4 skew-x-6">
                                                <div className={`w-14 h-14 rounded-full border-2 transition-all duration-500 overflow-hidden ${isSelected || isStaging ? 'border-primary shadow-[0_0_20px_rgba(168,85,247,0.4)] scale-110' : 'border-outline/10'}`}>
                                                    <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                </div>
                                                <span className={`text-[11px] font-headline font-black italic uppercase tracking-tighter truncate w-full text-center ${isSelected || isStaging ? 'text-primary' : 'text-on-surface-variant'}`}>
                                                    {formatPlayerName(p.name)}
                                                </span>
                                            </div>
                                            {isSelected && (
                                                <div className="absolute -top-2 -right-2 w-7 h-7 bg-primary rounded-full flex items-center justify-center shadow-lg border-2 border-surface animate-in zoom-in">
                                                    <IconCheck size={14} className="text-white" />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                            {availablePlayers.length === 0 && (
                                <div className="text-center py-12 text-on-surface-variant/20 text-sm font-black uppercase italic tracking-[0.2em]">
                                    All warriors assigned to squads
                                </div>
                            )}
                        </div>

                        {teamMode === 'manual' && manualTeams.length > 0 && (
                            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                                <label className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-[0.5em] ml-2">FORMED SQUADS ({manualTeams.length})</label>
                                <div className="grid grid-cols-1 gap-4">
                                    {manualTeams.map((team, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-surface border-2 border-secondary/30 rounded-2xl px-6 py-4 shadow-xl transform -skew-x-6 group/squad">
                                            <div className="flex items-center gap-4 skew-x-6">
                                                <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-xs font-black text-secondary border border-secondary/20">#{idx + 1}</div>
                                                <span className="text-lg font-headline font-black italic text-on-surface uppercase tracking-tight">
                                                    {getNames(team)}
                                                </span>
                                            </div>
                                            <button onClick={() => handleDisbandTeam(idx)} className="text-on-surface-variant hover:text-destructive transition-all skew-x-6 p-2">
                                                <IconTrash size={20} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-16 flex justify-center">
                    <button 
                        onClick={handleStart}
                        disabled={!canStart}
                        className={`
                            group relative px-20 py-8 rounded-[3rem] font-headline font-black italic text-3xl uppercase tracking-[0.4em] transition-all duration-700 active:scale-95 shadow-2xl transform -skew-x-12 overflow-hidden
                            ${canStart ? 'bg-primary text-on-primary border-2 border-primary/50 aura-glow' : 'bg-surface-variant/20 text-on-surface-variant/40 border-2 border-outline/5 cursor-not-allowed'}
                        `}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
                        <span className="relative z-10 skew-x-12 flex items-center gap-6">
                            <IconPlay size={40} className="fill-white" />
                            ENGAGE SAGA
                        </span>
                    </button>
                </div>
            </div>
        </div>
      </div>
    );
  }

  const tournament = state.activeTournament;
  const matches = tournament.matches;
  
  const sortedMatches = [...matches].sort((a, b) => {
      const aScore = a.status === 'completed' ? 1 : 0;
      const bScore = b.status === 'completed' ? 1 : 0;
      return aScore - bScore;
  });

  const scoringMatch = matches.find(m => m.id === scoringMatchId);

  return (
    <div className="space-y-10 pb-32 animate-in fade-in duration-700">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative">
             <div className="absolute -left-12 top-1/2 -translate-y-1/2 w-24 h-24 bg-primary/5 blur-3xl rounded-full"></div>
             <div className="space-y-3 relative z-10">
                <h2 className="text-4xl font-headline font-black italic text-on-surface uppercase transform -skew-x-12 tracking-tighter drop-shadow-2xl">
                    {tournament.name}
                </h2>
                <div className="flex items-center gap-4">
                    <div className="px-4 py-1.5 rounded-xl bg-primary/10 border-2 border-primary/20 flex items-center gap-3 shadow-lg">
                        <div className="w-2 h-2 rounded-full bg-primary animate-ping"></div>
                        <span className="text-[11px] font-black text-primary uppercase tracking-[0.3em]">
                            {tournament.stage.toUpperCase()} PHASE
                        </span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-variant/10 rounded-xl border border-outline/5">
                        <IconActivity size={14} className="text-on-surface-variant/40" />
                        <span className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-widest">
                            {matches.filter(m => m.status === 'completed').length} / {matches.length} BATTLES
                        </span>
                    </div>
                </div>
             </div>
             {isAdmin && (
                 <button 
                    onClick={handleEndEvent}
                    className="group relative px-6 py-3 rounded-2xl border-2 border-destructive/20 text-destructive/40 hover:text-destructive hover:border-destructive/50 transition-all duration-500 font-black text-[10px] uppercase tracking-[0.3em] overflow-hidden transform -skew-x-6 active:scale-95"
                 >
                    <div className="absolute inset-0 bg-destructive/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                    <span className="relative z-10 skew-x-6 block">SEAL THIS SAGA</span>
                 </button>
             )}
        </div>

        <div className="bg-surface border-2 border-outline/10 p-2 rounded-[2.5rem] flex font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl manga-shadow relative overflow-hidden">
             <div className="absolute inset-0 bg-surface-variant/5 pointer-events-none"></div>
             <button 
                onClick={() => setActiveTab('matches')} 
                className={`flex-1 py-5 rounded-2xl transition-all duration-500 transform relative z-10 ${activeTab === 'matches' ? 'bg-primary text-on-primary shadow-2xl -skew-x-12 scale-105 aura-glow' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/10'}`}
             >
                <span className={activeTab === 'matches' ? 'skew-x-12 block' : ''}>BATTLES</span>
             </button>
             {tournament.stage === 'group' && (
                 <button 
                    onClick={() => setActiveTab('standings')} 
                    className={`flex-1 py-5 rounded-2xl transition-all duration-500 transform relative z-10 ${activeTab === 'standings' ? 'bg-primary text-on-primary shadow-2xl -skew-x-12 scale-105 aura-glow' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/10'}`}
                 >
                    <span className={activeTab === 'standings' ? 'skew-x-12 block' : ''}>POWER RANKINGS</span>
                 </button>
             )}
             <button 
                onClick={() => setActiveTab('bracket')} 
                className={`flex-1 py-5 rounded-2xl transition-all duration-500 transform relative z-10 ${activeTab === 'bracket' ? 'bg-primary text-on-primary shadow-2xl -skew-x-12 scale-105 aura-glow' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/10'}`}
             >
                <span className={activeTab === 'bracket' ? 'skew-x-12 block' : ''}>SAGA TREE</span>
             </button>
        </div>

        {activeTab === 'matches' && (
            <div className="grid grid-cols-1 gap-6 animate-in slide-in-from-right duration-700">
                <div className="flex justify-end">
                     <button 
                        onClick={() => setShowCustomMatchModal(true)}
                        className="flex items-center gap-2 text-[10px] font-black text-primary uppercase bg-primary/10 px-4 py-2.5 rounded-2xl border border-primary/20 hover:bg-primary/20 transition-all active:scale-95"
                     >
                        <IconPlus size={14} /> Custom Match
                     </button>
                </div>

                {/* Custom Matches Section */}
                {matches.filter(m => m.isCustom).length > 0 && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 pl-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-hype-500"></div>
                             <h3 className="text-[11px] font-black text-hype-500/60 uppercase tracking-[0.4em]">EXHIBITION BATTLES</h3>
                        </div>
                        {matches.filter(m => m.isCustom).map(m => {
                            const isComplete = m.status === 'completed';
                            return (
                                <div 
                                    key={m.id}
                                    onClick={() => {
                                        setScoringMatchId(m.id);
                                        vibrate('light');
                                    }}
                                    className={`
                                        relative p-8 rounded-[3rem] border-2 transition-all duration-500 group/battle overflow-hidden manga-shadow
                                        ${isComplete 
                                            ? 'bg-surface-variant/5 border-hype-500/10 opacity-60 grayscale-[0.5]' 
                                            : 'bg-surface border-hype-500/20 cursor-pointer shadow-xl hover:border-hype-500 hover:bg-hype-500/[0.02] hover:scale-[1.01]'
                                        }
                                    `}
                                >
                                    <div className="flex justify-between items-center mb-6 relative z-10">
                                        <div className="flex items-center gap-4">
                                            <span className="text-[10px] font-black text-hype-500 uppercase tracking-[0.4em] bg-hype-500/10 px-4 py-1.5 rounded-xl border border-hype-500/20 transform -skew-x-12">
                                                CUSTOM
                                            </span>
                                        </div>
                                        {isComplete && (
                                            <div className="w-10 h-10 rounded-full bg-hype-500/10 flex items-center justify-center border-2 border-hype-500/20 shadow-lg animate-in zoom-in">
                                                <IconCheck size={20} className="text-hype-500" />
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="flex flex-col sm:flex-row justify-between items-center gap-8 relative z-10">
                                        <div className="flex-1 w-full">
                                            {renderTeamPills(m.teamA, 'left', isComplete && (m.scoreA||0) > (m.scoreB||0))}
                                        </div>
                                        
                                        <div className="shrink-0 flex flex-col items-center gap-3">
                                            {isComplete ? (
                                                <div className="bg-surface-variant/20 px-8 py-4 rounded-[2rem] border-2 border-outline/10 text-on-surface font-headline font-black italic text-3xl transform -skew-x-12 shadow-inner">
                                                    {m.scoreA} <span className="text-hype-500/40 mx-2">-</span> {m.scoreB}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="text-xs font-black text-on-surface-variant/20 uppercase tracking-[0.5em] italic">VERSUS</div>
                                                    <div className="group/btn relative px-8 py-3 bg-hype-500 text-white rounded-2xl font-headline font-black italic text-sm uppercase tracking-widest shadow-xl shadow-hype-500/30 transform -skew-x-12 overflow-hidden transition-all hover:scale-110">
                                                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500"></div>
                                                        <span className="relative z-10 skew-x-12 block">RECORD BATTLE</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 w-full">
                                            {renderTeamPills(m.teamB, 'right', isComplete && (m.scoreB||0) > (m.scoreA||0))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Regular Matches Section */}
                <div className="space-y-6">
                    {matches.filter(m => m.isCustom).length > 0 && (
                        <div className="flex items-center gap-3 pl-2 mt-4">
                             <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                             <h3 className="text-[11px] font-black text-on-surface-variant/40 uppercase tracking-[0.4em]">SAGA BATTLES</h3>
                        </div>
                    )}
                    {sortedMatches.filter(m => !m.isCustom).map(m => {
                        const isComplete = m.status === 'completed';
                        const tag = m.bracketRound ? m.bracketRound.toUpperCase() : m.groupId ? `GROUP ${m.groupId === 'G1' ? 'A' : 'B'}` : 'MATCH';
                        
                        return (
                            <div 
                                key={m.id}
                                onClick={() => {
                                    setScoringMatchId(m.id);
                                    vibrate('light');
                                }}
                                className={`
                                    relative p-8 rounded-[3rem] border-2 transition-all duration-500 group/battle overflow-hidden manga-shadow
                                    ${isComplete 
                                        ? 'bg-surface-variant/5 border-outline/10 opacity-60 grayscale-[0.5]' 
                                        : 'bg-surface border-primary/20 cursor-pointer shadow-xl hover:border-primary hover:bg-primary/[0.02] hover:scale-[1.01]'
                                    }
                                `}
                            >
                                {!isComplete && (
                                    <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 -translate-y-24 translate-x-24 rounded-full blur-[80px] group-hover:bg-primary/10 transition-colors duration-700"></div>
                                )}
                                
                                <div className="flex justify-between items-center mb-6 relative z-10">
                                    <div className="flex items-center gap-4">
                                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em] bg-primary/10 px-4 py-1.5 rounded-xl border border-primary/20 transform -skew-x-12">
                                            {tag}
                                        </span>
                                        {m.courtId && (
                                            <span className="text-[10px] font-black text-secondary uppercase tracking-[0.4em] bg-secondary/10 px-4 py-1.5 rounded-xl border border-secondary/20 transform -skew-x-12">
                                                ARENA {m.courtId}
                                            </span>
                                        )}
                                    </div>
                                    {isComplete && (
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20 shadow-lg animate-in zoom-in">
                                            <IconCheck size={20} className="text-primary" />
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex flex-col sm:flex-row justify-between items-center gap-8 relative z-10">
                                    <div className="flex-1 w-full">
                                        {renderTeamPills(m.teamA, 'left', isComplete && (m.scoreA||0) > (m.scoreB||0))}
                                    </div>
                                    
                                    <div className="shrink-0 flex flex-col items-center gap-3">
                                        {isComplete ? (
                                            <div className="bg-surface-variant/20 px-8 py-4 rounded-[2rem] border-2 border-outline/10 text-on-surface font-headline font-black italic text-3xl transform -skew-x-12 shadow-inner">
                                                {m.scoreA} <span className="text-primary/40 mx-2">-</span> {m.scoreB}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="text-xs font-black text-on-surface-variant/20 uppercase tracking-[0.5em] italic">VERSUS</div>
                                                <div className="group/btn relative px-8 py-3 bg-primary text-on-primary rounded-2xl font-headline font-black italic text-sm uppercase tracking-widest shadow-xl shadow-primary/30 transform -skew-x-12 overflow-hidden transition-all hover:scale-110">
                                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500"></div>
                                                    <span className="relative z-10 skew-x-12 block">RECORD BATTLE</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 w-full">
                                        {renderTeamPills(m.teamB, 'right', isComplete && (m.scoreB||0) > (m.scoreA||0))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

        {activeTab === 'standings' && tournament.groups && (
            <div className="space-y-8 animate-in slide-in-from-right duration-500">
                {tournament.groups.map(group => {
                    const groupMatches = matches.filter(m => m.groupId === group.id);
                    const standings = calculateGroupStandings(groupMatches, group.teams);

                    return (
                        <div key={group.id} className="bg-surface rounded-[2.5rem] border-2 border-outline/10 overflow-hidden manga-shadow">
                            <div className="bg-surface-variant/30 p-6 border-b border-outline/10 flex items-center justify-between">
                                <h3 className="text-lg font-headline font-black text-on-surface uppercase italic tracking-wider transform -skew-x-12">{group.name}</h3>
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs">A</div>
                            </div>
                            <div className="overflow-x-auto no-scrollbar">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-surface-variant/50 text-[9px] font-black uppercase text-on-surface-variant/40 border-b border-outline/5">
                                        <tr>
                                            <th className="p-4 w-12 text-center">RANK</th>
                                            <th className="p-4">WARRIORS</th>
                                            <th className="p-4 text-right">W-L</th>
                                            <th className="p-4 text-right">DIFF</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-outline/5">
                                        {standings.map((s, idx) => (
                                            <tr key={s.team.sort().join('-')} className="hover:bg-surface-variant/10 transition-colors">
                                                <td className="p-4 text-center font-headline font-black text-on-surface-variant/30 text-base italic transform -skew-x-12">{idx+1}</td>
                                                <td className="p-4">
                                                    <div className="text-sm font-headline font-black text-on-surface uppercase tracking-tight transform -skew-x-6">
                                                        {getNames(s.team)}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right text-sm font-mono font-bold text-on-surface">{s.wins}-{s.losses}</td>
                                                <td className={`p-4 text-right text-sm font-mono font-bold ${s.pointsDiff >= 0 ? 'text-primary' : 'text-on-surface-variant/40'}`}>
                                                    {s.pointsDiff > 0 ? '+' : ''}{s.pointsDiff}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}

        {activeTab === 'bracket' && (
            <div className="space-y-8 animate-in slide-in-from-right duration-500">
                <div className="flex justify-end gap-4">
                     <button 
                        onClick={() => setShowCustomMatchModal(true)}
                        className="flex items-center gap-2 text-[10px] font-black text-primary uppercase bg-primary/10 px-4 py-2.5 rounded-2xl border border-primary/20 hover:bg-primary/20 transition-all active:scale-95"
                     >
                        <IconPlus size={14} /> Custom Match
                     </button>
                     <button onClick={() => exportBracketPDF(tournament, state.players, showAlert)} className="flex items-center gap-2 text-[10px] font-black text-primary uppercase bg-primary/10 px-4 py-2.5 rounded-2xl border border-primary/20 hover:bg-primary/20 transition-all active:scale-95">
                        <IconDownload size={14} /> Export Scroll (PDF)
                     </button>
                </div>
                
                <div className="space-y-10">
                    {/* Exhibition Battles (Custom Matches) */}
                    {matches.filter(m => m.isCustom).length > 0 && (
                        <div className="space-y-4">
                             <div className="flex items-center gap-3 pl-2">
                                 <div className="w-1.5 h-1.5 rounded-full bg-hype-500"></div>
                                 <h3 className="text-[11px] font-black text-hype-500/60 uppercase tracking-[0.4em]">EXHIBITION BATTLES</h3>
                             </div>
                             <div className="grid grid-cols-1 gap-4">
                                 {matches.filter(m => m.isCustom).map(m => {
                                     const isComplete = m.status === 'completed';
                                     return (
                                         <div key={m.id} className="bg-zinc-900/50 border-2 border-hype-500/20 rounded-[2rem] p-6 flex justify-between items-center manga-shadow group hover:border-hype-500/40 transition-all">
                                             <div className={`flex-1 text-sm font-headline font-black uppercase italic transform -skew-x-12 transition-colors ${m.scoreA! > m.scoreB! ? 'text-hype-500' : 'text-on-surface-variant/40'}`}>
                                                 {m.teamA.length ? getNames(m.teamA) : 'TBD'}
                                             </div>
                                             <div className="flex flex-col items-center gap-1 px-6">
                                                 <div className="text-[10px] font-black text-hype-500/20 uppercase italic tracking-widest">CUSTOM</div>
                                                 <div className="text-base font-mono font-black text-hype-500 bg-hype-500/5 px-3 py-1 rounded-lg border border-hype-500/10">
                                                     {isComplete ? `${m.scoreA}-${m.scoreB}` : '??'}
                                                 </div>
                                             </div>
                                             <div className={`flex-1 text-right text-sm font-headline font-black uppercase italic transform -skew-x-12 transition-colors ${m.scoreB! > m.scoreA! ? 'text-hype-500' : 'text-on-surface-variant/40'}`}>
                                                 {m.teamB.length ? getNames(m.teamB) : 'TBD'}
                                             </div>
                                         </div>
                                     )
                                 })}
                             </div>
                        </div>
                    )}

                    {['semi', 'final', 'third_place'].map(round => {
                        const roundMatches = matches.filter(m => m.bracketRound === round);
                        if (roundMatches.length === 0) return null;

                        return (
                            <div key={round} className="space-y-4">
                                 <div className="flex items-center gap-3 pl-2">
                                     <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                                     <h3 className="text-[11px] font-black text-on-surface-variant/40 uppercase tracking-[0.4em]">{round.replace('_', ' ')}</h3>
                                 </div>
                                 <div className="grid grid-cols-1 gap-4">
                                     {roundMatches.map(m => {
                                         const isComplete = m.status === 'completed';
                                         return (
                                             <div key={m.id} className="bg-surface border-2 border-outline/10 rounded-[2rem] p-6 flex justify-between items-center manga-shadow group hover:border-primary/30 transition-all">
                                                 <div className={`flex-1 text-sm font-headline font-black uppercase italic transform -skew-x-12 transition-colors ${m.scoreA! > m.scoreB! ? 'text-primary' : 'text-on-surface-variant/40'}`}>
                                                     {m.teamA.length ? getNames(m.teamA) : 'TBD'}
                                                 </div>
                                                 <div className="flex flex-col items-center gap-1 px-6">
                                                     <div className="text-[10px] font-black text-on-surface-variant/20 uppercase italic">VS</div>
                                                     <div className="text-base font-mono font-black text-on-surface bg-surface-variant/30 px-3 py-1 rounded-lg border border-outline/5">
                                                         {isComplete ? `${m.scoreA}-${m.scoreB}` : '??'}
                                                     </div>
                                                 </div>
                                                 <div className={`flex-1 text-right text-sm font-headline font-black uppercase italic transform -skew-x-12 transition-colors ${m.scoreB! > m.scoreA! ? 'text-primary' : 'text-on-surface-variant/40'}`}>
                                                     {m.teamB.length ? getNames(m.teamB) : 'TBD'}
                                                 </div>
                                             </div>
                                         )
                                     })}
                                 </div>
                            </div>
                        );
                    })}
                </div>

                {matches.filter(m => m.bracketRound).length === 0 && (
                    <div className="text-center py-20 bg-surface-variant/20 rounded-[3rem] border-4 border-dashed border-outline/10 relative overflow-hidden">
                        <div className="absolute inset-0 bg-primary/5 animate-pulse"></div>
                        <IconLock size={32} className="mx-auto text-on-surface-variant/20 mb-4 relative z-10" />
                        <p className="text-on-surface-variant/30 font-black uppercase text-[11px] tracking-[0.5em] italic relative z-10">Bracket Phase Locked</p>
                    </div>
                )}
            </div>
        )}

        {scoringMatch && (
            <ScoreModal 
                game={{
                    id: scoringMatch.id,
                    courtId: 1, 
                    mode: tournament.matchType,
                    teamA: scoringMatch.teamA,
                    teamB: scoringMatch.teamB,
                    scoreA: scoringMatch.scoreA || 0,
                    scoreB: scoringMatch.scoreB || 0,
                    isFinished: scoringMatch.status === 'completed',
                    startTime: 0,
                    highlights: scoringMatch.highlights || [] // Ensure highlights is passed
                } as any}
                teamANames={getNames(scoringMatch.teamA)}
                teamBNames={getNames(scoringMatch.teamB)}
                onSave={(sA, sB) => {
                    onMatchEnd(scoringMatch.id, sA, sB);
                    setScoringMatchId(null);
                }}
                onCancel={() => setScoringMatchId(null)}
                onScoreChange={(sA, sB) => onScoreUpdate && onScoreUpdate(scoringMatch.id, sA, sB)}
                onHighlight={() => onHighlight && onHighlight(scoringMatch.id)}
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
    </div>
  );
};

export default TournamentManager;
