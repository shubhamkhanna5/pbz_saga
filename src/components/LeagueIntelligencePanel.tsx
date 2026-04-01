
import React, { useMemo } from 'react';
import { League, Player } from '../types';
import { analyzeLeagueHealth, buildSagaHistory } from '../utils/leagueLogic';
import { IconActivity, IconAlert, IconBrain, IconCheck, IconLineChart, IconZap } from './ui/Icons';
import { formatPlayerName } from '../utils/storage';

interface Props {
  league: League;
  players: Player[];
  onClose: () => void;
}

const LeagueIntelligencePanel: React.FC<Props> = ({ league, players, onClose }) => {
  const insights = useMemo(() => {
    const history = buildSagaHistory(league);
    return analyzeLeagueHealth(league, history);
  }, [league]);

  const { coverageProjection, fairnessIndex, recommendations } = insights;

  const warningColor = fairnessIndex.warningLevel === 'green' ? 'text-green-500' : fairnessIndex.warningLevel === 'yellow' ? 'text-yellow-500' : 'text-red-500';
  const warningBorder = fairnessIndex.warningLevel === 'green' ? 'border-green-500/20' : fairnessIndex.warningLevel === 'yellow' ? 'border-yellow-500/20' : 'border-red-500/20';

  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || 'Unknown';

  return (
    <div className="bg-zinc-950 rounded-[2.5rem] border-4 border-primary/40 overflow-hidden shadow-[0_0_50px_rgba(255,140,0,0.2)] relative animate-in zoom-in-95 duration-300 manga-shadow">
        <div className="absolute inset-0 bg-primary/5 pointer-events-none"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
        
        {/* Header */}
        <div className="p-6 border-b border-primary/20 bg-surface-variant/30 flex justify-between items-center relative z-10">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/40 aura-glow">
                    <IconBrain size={20} className="text-primary" />
                </div>
                <div>
                    <h3 className="text-lg font-headline font-black text-primary italic uppercase tracking-tighter transform -skew-x-12">
                        SAGA INTELLIGENCE
                    </h3>
                    <p className="text-[9px] text-on-surface-variant font-black uppercase tracking-[0.4em] mt-0.5 opacity-60">SCOUTER OVERLAY v4.0</p>
                </div>
            </div>
            <button onClick={onClose} className="text-[10px] font-black text-on-surface-variant hover:text-primary uppercase tracking-widest border border-outline/20 px-4 py-2 rounded-xl transition-all hover:bg-primary/10 manga-skew">
                <span className="manga-skew-reverse">CLOSE</span>
            </button>
        </div>

        <div className="p-6 space-y-8 relative z-10">
            
            {/* Top Stats Row */}
            <div className="grid grid-cols-2 gap-4">
                <div className={`p-5 bg-surface-variant/50 rounded-3xl border-2 ${warningBorder} flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] transition-transform`}>
                    <div className="absolute -right-4 -bottom-4 w-16 h-16 opacity-5 group-hover:opacity-10 transition-opacity">
                        <IconActivity size={64} className="text-on-surface" />
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-on-surface-variant tracking-widest relative z-10">
                        <IconActivity size={14} /> Fairness Index
                    </div>
                    <div className={`text-4xl font-headline font-black italic mt-3 relative z-10 ${warningColor} drop-shadow-md`}>
                        {fairnessIndex.totalScore.toFixed(0)}
                    </div>
                    <div className="text-[9px] text-on-surface-variant font-black uppercase mt-2 tracking-widest relative z-10 opacity-70">
                        Balance: {fairnessIndex.modeBalanceScore.toFixed(0)}%
                    </div>
                </div>

                <div className="p-5 bg-surface-variant/50 rounded-3xl border-2 border-secondary/30 flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] transition-transform">
                    <div className="absolute -right-4 -bottom-4 w-16 h-16 opacity-5 group-hover:opacity-10 transition-opacity">
                        <IconLineChart size={64} className="text-secondary" />
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-on-surface-variant tracking-widest relative z-10">
                        <IconLineChart size={14} /> Coverage
                    </div>
                    <div className="text-4xl font-headline font-black italic mt-3 relative z-10 text-secondary drop-shadow-md">
                        {coverageProjection.currentCoverage.toFixed(1)}%
                    </div>
                    <div className="text-[9px] text-on-surface-variant font-black uppercase mt-2 tracking-widest relative z-10 opacity-70">
                        ~{coverageProjection.estimatedDaysToFullCoverage} Days Left
                    </div>
                </div>
            </div>

            {/* Recommendations */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 px-1">
                    <div className="h-px flex-1 bg-outline/10"></div>
                    <h4 className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.4em]">Tactical Analysis</h4>
                    <div className="h-px flex-1 bg-outline/10"></div>
                </div>
                
                {recommendations.length === 0 ? (
                    <div className="p-5 bg-green-500/5 border-2 border-green-500/20 rounded-3xl flex items-center gap-4 aura-glow">
                        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/40">
                            <IconCheck size={20} className="text-green-500" />
                        </div>
                        <span className="text-sm font-headline font-black text-green-400 uppercase tracking-widest italic">Systems Optimal</span>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {recommendations.map((rec) => (
                            <div key={rec.title} className="p-5 bg-surface-variant/30 border-2 border-outline/10 rounded-3xl flex items-start gap-4 hover:border-primary/30 transition-colors group">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border shrink-0 ${rec.impact === 'high' ? 'bg-red-500/20 border-red-500/40 text-red-500' : 'bg-primary/20 border-primary/40 text-primary'}`}>
                                    <IconAlert size={20} className="group-hover:animate-pulse" />
                                </div>
                                <div className="space-y-1">
                                    <div className="text-sm font-headline font-black text-on-surface uppercase tracking-tight italic">{rec.title}</div>
                                    <p className="text-[11px] text-on-surface-variant leading-relaxed font-medium">{rec.description}</p>
                                    <div className="mt-3 inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-xl">
                                        <IconZap size={12} className="text-primary" />
                                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                                            {rec.action}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Bottlenecks */}
            {coverageProjection.bottleneckPairs.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-3 px-1">
                        <div className="h-px flex-1 bg-outline/10"></div>
                        <h4 className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.4em]">Rare Matchups</h4>
                        <div className="h-px flex-1 bg-outline/10"></div>
                    </div>
                    <div className="bg-surface-variant/30 rounded-3xl border-2 border-outline/10 overflow-hidden">
                        {coverageProjection.bottleneckPairs.map((b, idx) => (
                            <div key={b.pair.sort().join('-')} className={`flex justify-between items-center p-4 ${idx !== coverageProjection.bottleneckPairs.length - 1 ? 'border-b border-outline/10' : ''} hover:bg-primary/5 transition-colors`}>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-headline font-black text-on-surface italic uppercase">{formatPlayerName(getPlayerName(b.pair[0]))}</span>
                                    <div className="w-6 h-px bg-outline/20"></div>
                                    <span className="text-xs font-headline font-black text-on-surface italic uppercase">{formatPlayerName(getPlayerName(b.pair[1]))}</span>
                                </div>
                                <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-lg border ${b.type === 'singles' ? 'bg-secondary/10 border-secondary/30 text-secondary' : 'bg-primary/10 border-primary/30 text-primary'}`}>
                                    {b.type}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

        </div>
    </div>
  );
};

export default LeagueIntelligencePanel;
