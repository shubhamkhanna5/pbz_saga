
export enum SkillLevel {
  Beginner = 1,
  Intermediate = 2,
  Advanced = 3
}

export interface ModeStats {
  wins: number;
  losses: number;
  currentStreak: number;
}

export interface PlayerStats extends ModeStats {
  clutchWins: number; // 11-10 or comeback wins
  bagelsGiven: number; // 11-0 wins
  totalPoints: number; // All-time points scored
  bonusPoints: number; // New: League Bonus Points
  noShows: number;     // New: Number of no-shows
  singles: ModeStats;
  doubles: ModeStats;
}

export type BadgeTier = "normal" | "rare" | "seasonal";

export interface BadgeRecord {
  badgeId: string;
  earnedAt: number;
  leagueId?: string;
  sagaName?: string;
  tier: BadgeTier;
}

export interface Player {
  id: string;
  name: string;
  skill: SkillLevel;
  duprRating?: number;
  gamesPlayed: number; 
  lastPartnerId?: string;
  isPresent: boolean; 
  stats?: PlayerStats; // Made optional for migration
  badges?: BadgeRecord[];
  
  // Flat stats from Supabase
  wins?: number;
  losses?: number;
  currentStreak?: number;
  bagelsGiven?: number;
  clutchWins?: number;
  totalPoints?: number;
  bonusPoints?: number;
  noShows?: number;
  winPercentage?: number;

  // Mid-Season Join Logic
  joinedAtDay?: number; // Index of the day they joined the current saga (0-based)
  isMidSeason?: boolean;
  elo?: number; // New: Elo Rating System
}

export interface GameEvent {
  id: string;
  type: 'point';
  timestamp: number;
  team: 'A' | 'B';
  scoreAfter: string;
}

export interface PBZHighlight {
  id: string;
  triggerTime: number;   // When button pressed
  clipStart: number;     // trigger - 6000ms
  clipEnd: number;       // trigger + 9000ms
  duration: number;      // 15000ms
}

export interface Game {
  id: string;
  courtId: number;
  mode: 'singles' | 'doubles';
  teamA: string[]; 
  teamB: string[]; 
  scoreA: number;
  scoreB: number;
  startTime: number;
  endTime?: number;
  isFinished: boolean;
  tournamentMatchId?: string;
  leagueMatchId?: string;
  events: GameEvent[]; 
  highlights: PBZHighlight[]; // New: Highlight Reel Markers
}

export type TeamAssignmentMode = 'queue_order' | 'random_seeded' | 'balanced';

export interface Session {
  id: string;
  date: number; 
  activeCourts: number;
  rotationType: 'round_robin' | 'winners_stay';
  playMode: 'singles' | 'doubles' | 'mixed';
  teamAssignmentMode: TeamAssignmentMode;
  history: Game[];
}

export interface SeasonWinner {
  seasonNumber: number;
  seasonName: string;
  winnerId: string;
  wins: number;
}

export type LeagueMatchStatus = 'scheduled' | 'completed' | 'walkover' | 'cancelled';

export interface LeagueMatch {
  id: string;
  dayId: string;
  courtId: number;
  round: number;
  teamA: string[];
  teamB: string[];
  scoreA?: number;
  scoreB?: number;
  isCompleted: boolean;
  type: 'singles' | 'doubles';
  isBye?: boolean;
  status: LeagueMatchStatus; 
  noShowPlayerIds: string[];
  isForfeit?: boolean;
  
  // Ops Engine
  orderIndex: number; 
  events: GameEvent[];
  highlights: PBZHighlight[]; // New: Highlight Reel Markers
  divisionId?: string; // New: For analytics in split divisions

  // Admin Override
  isAdminOverride?: boolean;
  overrideReason?: string;
  overriddenAt?: number;

  // Pod Saga Metadata
  podId?: string;
  cycleIndex?: number;
}

export interface LeagueDayConfig {
  hours: number;
  courts: number;
}

export interface LeagueDay {
  id: string;
  week: number;
  day: number;
  date: number;
  seed: number;
  status: 'generated' | 'active' | 'completed';
  matches: LeagueMatch[];
  partners: { player1: string, player2: string }[];
  attendees: string[];
  backedUp?: boolean; // Integrity Flag: Ensures we only backup a completed day once
  config?: LeagueDayConfig; // Persisted generation params for rebalancing
  divisions?: LeagueDay[]; // Recursive structure for split divisions
  debugLog?: SchedulerDebugEntry[]; // For observability
}

export interface SchedulerDebugEntry {
  round: number;
  candidates: string[];
  available: string[];
  forcedSingles: boolean;
  singlesPlayers: string[];
  doublesMatches: number;
  benchedPlayers: string[];
  reason: string;
}

export interface LeagueStanding {
  playerId: string;
  points: number;
  wins: number;
  losses: number;
  gamesPlayed: number;
  ppg: number; // Points Per Game (Normalization)
  ppgHistory?: number[]; // Weekly PPG snapshots for trend analysis
  bonusPoints: number;
  noShows: number;
  eligibleForTrophies?: boolean; // New: 60% rule
  elo?: number; // New: Elo Rating System
}

export interface LeagueAuditEntry {
  id: string;
  timestamp: number;
  action: 'NO_SHOW' | 'UNDO_NO_SHOW' | 'SCORE_OVERRIDE';
  playerId?: string;
  matchId: string;
  snapshot: LeagueMatch;
  details?: string;
}

export interface League {
  id: string;
  name: string;
  startDate: number;
  weeks: number;
  daysPerWeek: number;
  status: 'active' | 'completed';
  days?: LeagueDay[];
  players: string[];
  finalStandings?: LeagueStanding[];
  endedAt?: number;
  auditLog?: LeagueAuditEntry[]; // New
}

export interface TournamentMatch {
  id: string;
  round: number; // 1=Group, 2=QF, 3=SF, 4=Final
  teamA: string[];
  teamB: string[];
  scoreA?: number;
  scoreB?: number;
  status: 'pending' | 'active' | 'completed';
  courtId?: number;
  
  // New Fields for Structured Tournaments
  groupId?: string; 
  bracketRound?: 'quarter' | 'semi' | 'final' | 'third_place';
  events?: GameEvent[];
  highlights?: PBZHighlight[]; // New: Highlight Reel Markers
}

export interface TournamentGroup {
  id: string;
  name: string;
  teams: string[][]; // Array of Teams (which are arrays of player IDs)
}

export interface Tournament {
  id: string;
  name: string;
  date: number;
  status: 'active' | 'completed';
  stage: 'group' | 'knockout'; // Internal stage tracker
  
  // New Config
  matchType: 'singles' | 'doubles';
  teamMode: 'random' | 'manual';
  
  groups: TournamentGroup[];
  format: 'round_robin';
  courts: number;
  players: string[]; // All individual players involved
  teams: string[][]; // The defined teams for this tournament
  matches: TournamentMatch[];
  winnerId?: string; // or winnerTeamId (concatenated)
}

export interface AppState {
  players: Player[];
  activeSession: Session | null;
  activeTournament: Tournament | null;
  activeLeague: League | null;
  activeGames: Game[];
  queue: string[]; 
  autoSync?: boolean; // New: Toggle for Supabase auto-sync
  trophyHolderId?: string; // Current #1
  seasonHistory: SeasonWinner[]; // Deprecated, use pastLeagues/pastTournaments
  pastLeagues: League[];
  pastTournaments: Tournament[];
}