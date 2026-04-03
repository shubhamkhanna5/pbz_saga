
import React, { useState } from 'react';
import { useDialog } from './ui/DialogProvider';
import { LeagueMatch, Player } from '../types';
import { IconX, IconAlert, IconCheck, IconRotate, IconDownload, IconSettings } from './ui/Icons';
import { vibrate } from '../utils/godMode';
import { buildHighlightJSON, downloadHighlightJSON } from '../utils/pbzHighlightExport';
import { isValidScore } from '../utils/rules';

interface MatchActionModalProps {
  match: LeagueMatch;
  players: Player[];
  onMarkNoShow: (playerId: string) => void;
  onClose: () => void;
  isAdmin?: boolean;
  onUndoNoShow?: () => void;
  onOverrideScore?: (matchId: string, sA: number, sB: number) => void;
}

const MatchActionModal: React.FC<MatchActionModalProps> = ({ 
    match, 
    players, 
    onMarkNoShow, 
    onClose, 
    isAdmin, 
    onUndoNoShow,
    onOverrideScore
}) => {
  const { showAlert, showConfirm } = useDialog();
  const [isEditingScore, setIsEditingScore] = useState(false);
  const [editScoreA, setEditScoreA] = useState(match.scoreA?.toString() || '');
  const [editScoreB, setEditScoreB] = useState(match.scoreB?.toString() || '');

  const allPlayerIds = [...new Set([...match.teamA, ...match.teamB])];
  const getPlayer = (id: string) => players.find(p => p.id === id);

  const handleNoShow = (pid: string) => {
      showConfirm(`Mark ${getPlayer(pid)?.name} as NO SHOW?\n\nThis will apply penalties and resolve the match automatically.`, () => {
          vibrate('heavy');
          onMarkNoShow(pid);
          onClose();
      });
  };

  const handleExport = () => {
      const json = buildHighlightJSON(match, match.type);
      const filename = `PBZ_HIGHLIGHTS_${match.id}_${Date.now()}.json`;
      downloadHighlightJSON(json, filename);
      vibrate('success');
  };

  const handleOverrideSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const sA = parseInt(editScoreA);
      const sB = parseInt(editScoreB);
      
      if (isNaN(sA) || isNaN(sB)) return;
      
      if (!isValidScore(sA, sB)) {
          showAlert("Invalid score. Must follow match rules (First to 11, etc.)");
          return;
      }

      if (onOverrideScore) {
          onOverrideScore(match.id, sA, sB);
          vibrate('success');
          onClose();
      }
  };

  const isResolvableByAdmin = isAdmin && (match.status === 'walkover' || match.isForfeit);
  const highlightCount = match.highlights?.length || 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 animate-in fade-in duration-200 backdrop-blur-md">
      <div className="w-full max-w-sm bg-zinc-950 rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative">
        <div className="p-6 space-y-6">
           <div className="flex justify-between items-start">
               <div>
                   <h2 className="text-xl font-black italic text-white uppercase tracking-tighter">Match Governance</h2>
                   <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">Arena {match.courtId} • {match.type}</p>
               </div>
               <button onClick={onClose} className="p-2 bg-zinc-900 rounded-full text-zinc-500 hover:text-white"><IconX size={20}/></button>
           </div>

           {isEditingScore ? (
               <form onSubmit={handleOverrideSubmit} className="space-y-4 animate-in slide-in-from-right">
                   <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5 space-y-4">
                       <h3 className="text-[10px] font-black text-primary uppercase tracking-widest">Admin Override</h3>
                       <div className="flex items-center gap-4">
                           <div className="flex-1 space-y-1">
                               <label className="text-[9px] font-bold text-zinc-500 uppercase">Team A</label>
                               <input 
                                   type="number" 
                                   value={editScoreA} 
                                   onChange={(e) => setEditScoreA(e.target.value)}
                                   className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-center text-xl font-black text-white focus:border-primary outline-none"
                               />
                           </div>
                           <div className="text-zinc-700 font-black italic text-xl pt-4">-</div>
                           <div className="flex-1 space-y-1">
                               <label className="text-[9px] font-bold text-zinc-500 uppercase">Team B</label>
                               <input 
                                   type="number" 
                                   value={editScoreB} 
                                   onChange={(e) => setEditScoreB(e.target.value)}
                                   className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-center text-xl font-black text-white focus:border-primary outline-none"
                               />
                           </div>
                       </div>
                       <p className="text-[9px] text-zinc-500 italic">This will wipe existing timeline events and force this result.</p>
                   </div>
                   <div className="flex gap-3">
                       <button type="button" onClick={() => setIsEditingScore(false)} className="flex-1 py-3 bg-zinc-900 text-zinc-400 rounded-xl font-black text-xs uppercase tracking-widest hover:text-white transition-colors">Cancel</button>
                       <button type="submit" className="flex-1 py-3 bg-white text-black rounded-xl font-black text-xs uppercase tracking-widest hover:bg-aura-gold transition-colors">Confirm</button>
                   </div>
               </form>
           ) : (
               <div className="space-y-4 animate-in slide-in-from-left">
                   <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5 space-y-3">
                       <div className="flex justify-between items-center">
                           <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Status: {match.status.toUpperCase()}</h3>
                           <div className="flex gap-2">
                               {isResolvableByAdmin && onUndoNoShow && (
                                   <button 
                                        onClick={onUndoNoShow}
                                        className="relative z-50 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 text-white text-[9px] font-bold uppercase tracking-widest hover:bg-zinc-700 transition-colors min-h-[36px]"
                                   >
                                       <IconRotate size={12} /> Undo
                                   </button>
                               )}
                           </div>
                       </div>
                       
                       {match.status === 'walkover' && (
                           <div className="text-xs text-aura-purple font-bold p-2 bg-aura-purple/10 rounded border border-aura-purple/20">
                               Walkover: Teammates and Opponents Protected. No stats recorded for them.
                           </div>
                       )}
                       {match.status === 'cancelled' && (
                           <div className="text-xs text-zinc-500 font-bold p-2 bg-zinc-900 rounded border border-zinc-700">
                               Match Cancelled due to multiple No-Shows.
                           </div>
                       )}
                       {isAdmin && (match.status === 'completed' || match.status === 'scheduled') && (
                           <button 
                               onClick={() => setIsEditingScore(true)}
                               className="w-full py-2 mt-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 border border-zinc-700 hover:border-zinc-600"
                           >
                               <IconSettings size={12} /> Correct Score
                           </button>
                       )}
                   </div>

                   {match.status !== 'cancelled' && !match.isCompleted && (
                       <div className="space-y-2">
                           <h3 className="text-[10px] font-black text-danger-500 uppercase tracking-widest px-1">Report No-Show</h3>
                           <div className="grid grid-cols-1 gap-2">
                               {allPlayerIds.map(pid => {
                                   const p = getPlayer(pid);
                                   const isMarked = match.noShowPlayerIds.includes(pid);
                                   return (
                                       <button
                                           key={pid}
                                           disabled={isMarked}
                                           onClick={() => handleNoShow(pid)}
                                           className={`relative z-50 flex items-center justify-between p-3 rounded-xl border transition-all min-h-[44px] ${
                                               isMarked 
                                               ? 'bg-danger-900/20 border-danger-500/50 text-danger-500 cursor-not-allowed' 
                                               : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:border-white/20'
                                           }`}
                                       >
                                           <span className="font-bold uppercase text-sm">{p?.name}</span>
                                           {isMarked ? <span className="text-[10px] font-black">NO SHOW</span> : <IconAlert size={16} />}
                                       </button>
                                   )
                               })}
                           </div>
                       </div>
                   )}
               </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default MatchActionModal;
