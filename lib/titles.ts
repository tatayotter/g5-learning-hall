// lib/titles.ts
export interface TitleTier {
  minLevel: number;
  title: string;
  icon: string;
}

const TITLE_TIERS: TitleTier[] = [
  { minLevel: 1, title: 'Apprentice', icon: '📖' },
  { minLevel: 3, title: 'Journeyman', icon: '🗡️' },
  { minLevel: 5, title: 'Adventurer', icon: '🛡️' },
  { minLevel: 8, title: 'Knight', icon: '⚔️' },
  { minLevel: 11, title: 'Champion', icon: '🏆' },
  { minLevel: 15, title: 'Guild Master', icon: '👑' },
  { minLevel: 20, title: 'Legend', icon: '✨' },
];

export function getTitleForLevel(level: number): TitleTier {
  let current = TITLE_TIERS[0];
  for (const tier of TITLE_TIERS) {
    if (level >= tier.minLevel) {
      current = tier;
    }
  }
  return current;
}

export function getNextTitleTier(level: number): TitleTier | null {
  return TITLE_TIERS.find(tier => tier.minLevel > level) || null;
}