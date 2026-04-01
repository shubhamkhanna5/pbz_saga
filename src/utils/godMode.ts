
import { Player, Game, AppState, TournamentMatch, LeagueMatch, LeagueStanding } from '../types';
import { BadgeId } from './badges';

export interface Badge {
  icon: string;
  label: string;
  color: string;
  priority: number;
}

export type BattleState = 'charging' | 'engaged' | 'resolved';

export function getBattleState(game: {
  isFinished?: boolean;
  status?: 'pending' | 'active' | 'completed';
  startTime?: number;
  isCompleted?: boolean;
}) : BattleState {
  // Normalize types
  if (game.status === 'completed' || game.isFinished || game.isCompleted) return 'resolved';
  if (game.status === 'active' || game.startTime) return 'engaged';
  return 'charging';
}

export function getAuraClass(player: Player, isLeader: boolean = false) {
  if (isLeader) return "aura-gold aura-super";
  const streak = player.currentStreak ?? player.stats?.currentStreak ?? 0;
  if (streak >= 5) return "aura-gold";
  if (streak >= 3) return "aura-purple";
  if (streak <= -3) return "aura-green";
  if ((player.bagelsGiven ?? player.stats?.bagelsGiven ?? 0) > 0) return "aura-purple"; // Destructo Disc aura
  return "";
}

export const calculatePowerLevel = (stats: { wins?: number; losses?: number; currentStreak?: number; bagelsGiven?: number; clutchWins?: number } | undefined) => {
    // Formula: points * 100 + streak * 50 + 15-0 * 75
    // Points approx: Win=3, Loss=1
    const s = stats || {};
    const wins = s.wins ?? 0;
    const losses = s.losses ?? 0;
    const currentStreak = s.currentStreak ?? 0;
    const bagelsGiven = s.bagelsGiven ?? 0;
    const clutchWins = s.clutchWins ?? 0;

    const points = (wins * 3) + (losses * 1);
    const streakBonus = currentStreak > 0 ? currentStreak * 50 : 0;
    const bagelBonus = bagelsGiven * 75;
    const clutchBonus = clutchWins * 25;
    
    return (points * 100) + streakBonus + bagelBonus + clutchBonus;
};

export const getRivalries = (players: Player[], history: Game[]) => {
  const pairs: Record<string, { total: number; aWins: number; bWins: number }> = {};
  
  history.forEach(g => {
    if (g.mode !== 'singles') return; 
    const [a, b] = [g.teamA[0], g.teamB[0]].sort();
    const key = `${a}:${b}`;
    if (!pairs[key]) pairs[key] = { total: 0, aWins: 0, bWins: 0 };
    pairs[key].total++;
    if (g.scoreA > g.scoreB) {
        g.teamA[0] === a ? pairs[key].aWins++ : pairs[key].bWins++;
    } else {
        g.teamA[0] === a ? pairs[key].bWins++ : pairs[key].aWins++;
    }
  });

  return Object.entries(pairs)
    .filter(([_, stats]) => stats.total >= 3)
    .map(([key, stats]) => {
      const [a, b] = key.split(':');
      return { playerA: a, playerB: b, ...stats };
    });
};

export const getPlayerBadges = (player: Player, allPlayers: Player[]): Badge[] => {
  const badges: Badge[] = [];
  const wins = player.wins ?? player.stats?.wins ?? 0;
  const losses = player.losses ?? player.stats?.losses ?? 0;
  const currentStreak = player.currentStreak ?? player.stats?.currentStreak ?? 0;
  const clutchWins = player.clutchWins ?? player.stats?.clutchWins ?? 0;
  const bagelsGiven = player.bagelsGiven ?? player.stats?.bagelsGiven ?? 0;

  const totalGames = wins + losses;
  const winRate = totalGames > 0 ? wins / totalGames : 0;

  // Theming: DBZ / Anime Concepts
  if (clutchWins >= 2) {
    badges.push({ icon: '🧠', label: 'Ultra Instinct', color: 'text-aura-purple', priority: 25 });
  }
  if (bagelsGiven >= 1) {
    badges.push({ icon: '⚡', label: 'Destructo', color: 'text-aura-gold', priority: 15 });
  }
  if (currentStreak >= 5) {
     badges.push({ icon: '👑', label: 'God Mode', color: 'text-aura-gold', priority: 30 });
  } else if (currentStreak >= 3) {
    badges.push({ icon: '🔥', label: 'Super', color: 'text-primary', priority: 10 });
  } else if (currentStreak <= -3) {
    badges.push({ icon: '💀', label: 'Spiritless', color: 'text-zinc-500', priority: 5 });
  }
  
  if (totalGames >= 5 && winRate >= 0.75) {
    badges.push({ icon: '🥋', label: 'Elite', color: 'text-danger-500', priority: 20 });
  }

  return badges.sort((a, b) => b.priority - a.priority).slice(0, 3);
};

// Computes *Potential* Badges for a specific League Standing context
export function computeProfileBadges(standing: LeagueStanding): BadgeId[] {
  const badges: BadgeId[] = [];

  // 🛡 Iron Body (Games Played)
  if (standing.gamesPlayed >= 10) {
    badges.push('iron_body');
  }

  // ⚔ Battle Machine (Wins)
  if (standing.wins >= 5) {
    badges.push('battle_machine');
  }

  // 🔥 High Power (PPG) 
  if (standing.gamesPlayed > 0 && standing.ppg >= 3.0) {
    badges.push('high_power');
  }

  // 🧠 Consistent
  if (standing.ppgHistory && standing.ppgHistory.length >= 3) {
    const variance = Math.max(...standing.ppgHistory) - Math.min(...standing.ppgHistory);
    if (variance <= 0.5) {
      badges.push('consistent');
    }
  }

  return badges;
}

export const getMatchStakes = (game: Game, players: Player[]): { tag: string; icon: string; color: string } => {
  const allIds = [...game.teamA, ...game.teamB];
  const participants = players.filter(p => allIds.includes(p.id));
  
  const topRanked = participants.some(p => {
    const sorted = [...players].sort((a,b) => calculatePowerLevel(b.stats || b) - calculatePowerLevel(a.stats || a));
    return sorted.findIndex(x => x.id === p.id) < 2;
  });

  const highStreaks = participants.some(p => Math.abs(p.currentStreak ?? p.stats?.currentStreak ?? 0) >= 3);

  if (topRanked && highStreaks) return { tag: 'FINAL FORM', icon: '☠️', color: 'text-danger-500' };
  if (highStreaks) return { tag: 'POWER CLASH', icon: '⚡', color: 'text-aura-gold' };
  if (topRanked) return { tag: 'ELITE BATTLE', icon: '🔥', color: 'text-primary' };
  
  return { tag: 'SPARRING', icon: '⚪', color: 'text-zinc-600' };
};

export const vibrate = (pattern: 'light' | 'medium' | 'heavy' | 'success' | 'error') => {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  switch (pattern) {
    case 'light': navigator.vibrate(10); break;
    case 'medium': navigator.vibrate(20); break;
    case 'heavy': navigator.vibrate(40); break;
    case 'success': navigator.vibrate([10, 30, 10]); break;
    case 'error': navigator.vibrate([50, 30, 50, 30, 50]); break;
  }
};
