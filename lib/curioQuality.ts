// Curio quality tiers — a gold-sink reroll mechanic ("Tutor a curio" in the
// Compendium) that permanently boosts HP/Attack. A roll only ever upgrades a
// curio (never downgrades, never no-ops upward); the actual roll happens
// server-side in the tutor_curio RPC — the constants here are duplicated
// there deliberately so the client can display accurate odds/cost without
// trusting a client-computed roll.

export type QualityTier = 'normal' | 'good' | 'outstanding' | 'perfect';

export const QUALITY_TIERS: QualityTier[] = ['normal', 'good', 'outstanding', 'perfect'];

export const QUALITY_LABEL: Record<QualityTier, string> = {
  normal: 'Normal',
  good: 'Good',
  outstanding: 'Outstanding',
  perfect: 'Perfect',
};

// Applied to HP and Attack only — Defense/Speed are untouched, so quality is
// a pure offense/survivability chase stat, not a full stat-stick.
export const QUALITY_STAT_MULTIPLIER: Record<QualityTier, number> = {
  normal: 1.00,
  good: 1.10,
  outstanding: 1.22,
  perfect: 1.40,
};

// Gold cost of one Tutor attempt, keyed by the curio's CURRENT tier. No
// entry for 'perfect' — it's terminal, nothing to roll for.
export const TUTOR_COST_BY_TIER: Partial<Record<QualityTier, number>> = {
  normal: 15,
  good: 30,
  outstanding: 40,
};

// Base roll table — identical every attempt, independent of current tier.
// A roll only upgrades the curio if the rolled tier ranks above its current
// tier. Mirrored server-side in the tutor_curio RPC.
export const TUTOR_ROLL_TABLE = {
  fail: 0.688,
  good: 0.25,
  outstanding: 0.05,
  perfect: 0.011,
};

const QUALITY_RANK: Record<QualityTier, number> = {
  normal: 0,
  good: 1,
  outstanding: 2,
  perfect: 3,
};

export function isQualityUpgrade(current: QualityTier, rolled: QualityTier): boolean {
  return QUALITY_RANK[rolled] > QUALITY_RANK[current];
}

// Chance (0-1) that a Tutor attempt from `tier` advances the curio at all —
// i.e. the sum of every roll-table bucket ranked above the current tier.
export function totalAdvanceChance(tier: QualityTier): number {
  return QUALITY_TIERS
    .filter(t => QUALITY_RANK[t] > QUALITY_RANK[tier])
    .reduce((sum, t) => sum + (TUTOR_ROLL_TABLE[t as keyof typeof TUTOR_ROLL_TABLE] ?? 0), 0);
}

export function getQualityGlowClass(quality: QualityTier): string {
  switch (quality) {
    case 'good': return 'quality-glow-good';
    case 'outstanding': return 'quality-glow-outstanding';
    case 'perfect': return 'quality-glow-perfect';
    default: return '';
  }
}

// Rolls a fresh quality tier from scratch (not an upgrade-from-current roll
// like the Tutor system) — used when a wild curio spawns on the map, so
// rarer tiers are a genuine "you got lucky" moment before the player even
// engages it, not just decoration. Same odds table as Tutor for consistency
// (one set of numbers to balance/explain), reused independently of tier
// since there's no "current tier" to roll up from yet.
export function rollFreshQualityTier(): QualityTier {
  const roll = Math.random();
  if (roll < TUTOR_ROLL_TABLE.perfect) return 'perfect';
  if (roll < TUTOR_ROLL_TABLE.perfect + TUTOR_ROLL_TABLE.outstanding) return 'outstanding';
  if (roll < TUTOR_ROLL_TABLE.perfect + TUTOR_ROLL_TABLE.outstanding + TUTOR_ROLL_TABLE.good) return 'good';
  return 'normal';
}

// Color for the map curio's ground-shadow glow (an oval "light from above"
// shadow under its feet, not a halo) — same rgba values as the tier
// halo colors above for 'good'/'outstanding'/'perfect' (see .quality-glow-*
// in app/globals.css), plus a soft neutral for 'normal' so every curio
// still gets a grounding shadow, just a duller one.
export function getQualityGroundGlowColor(quality: QualityTier): string {
  switch (quality) {
    case 'good': return 'rgba(74, 222, 128, 0.55)';
    case 'outstanding': return 'rgba(34, 211, 238, 0.55)';
    case 'perfect': return 'rgba(251, 146, 60, 0.6)';
    default: return 'rgba(226, 232, 240, 0.45)';
  }
}
