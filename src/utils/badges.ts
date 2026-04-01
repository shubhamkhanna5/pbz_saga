
import { Player, BadgeRecord, BadgeTier } from "../types";

export type BadgeId =
  | "iron_body"
  | "battle_machine"
  | "high_power"
  | "consistent"
  | "saga_champion";

export const BADGE_DEFINITIONS: Record<BadgeId, {
  label: string;
  icon: string;
  description: string;
  tier: BadgeTier;
  color: string;
}> = {
  iron_body: {
    label: "Iron Body",
    icon: "🛡️",
    description: "Played the most matches in a saga. Built different.",
    tier: "normal",
    color: "text-zinc-400"
  },
  battle_machine: {
    label: "Battle Machine",
    icon: "⚔️",
    description: "Won the most matches in a saga. Pure destruction.",
    tier: "normal",
    color: "text-primary"
  },
  high_power: {
    label: "High Power",
    icon: "🔥",
    description: "Maintained a PPG above 3.0. Makes every game count.",
    tier: "rare",
    color: "text-danger-500"
  },
  consistent: {
    label: "Consistent",
    icon: "🧠",
    description: "Stable performance across weeks. No wild swings.",
    tier: "normal",
    color: "text-aura-purple"
  },
  saga_champion: {
    label: "Saga Champion",
    icon: "👑",
    description: "Grand Victor of a League Saga.",
    tier: "seasonal",
    color: "text-aura-gold"
  }
};

export function awardBadge(
  player: Player,
  badgeId: BadgeId,
  leagueId?: string,
  sagaName?: string
): Player {
  // Init if missing
  const currentBadges = player.badges || [];
  
  // Check for duplicate award for this specific league
  if (leagueId && currentBadges.some(b => b.badgeId === badgeId && b.leagueId === leagueId)) {
      return player;
  }
  
  // Create Record
  const newBadge: BadgeRecord = {
      badgeId,
      earnedAt: Date.now(),
      leagueId,
      sagaName,
      tier: BADGE_DEFINITIONS[badgeId].tier
  };

  return {
      ...player,
      badges: [...currentBadges, newBadge]
  };
}
