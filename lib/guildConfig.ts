// lib/guildConfig.ts

// Bump this manually each school term (Term 1 / 2 / 3)
export const CURRENT_TERM = 1;

export const TIME_ATTACK_DURATION = 60; // seconds
export const PREFETCH_BATCH_SIZE = 35; // 30-40 range per spec

// Below this, a "no-repeat" pool is too small to fill a Time Attack session
// without the same question resurfacing every answer — top it up with
// already-completed questions rather than serve just 1-2 distinct ones.
export const MIN_SESSION_POOL_SIZE = 10;

export const XP_PER_CORRECT = 10;
export const GOLD_PER_CORRECT = 2;
export const SCORE_PER_CORRECT = 10;
export const SCORE_PENALTY_WRONG = 5;

export const SUBCLASS_XP_PER_LEVEL = 500; // flat curve, no scaling

export function applyLevelUp(currentLevel: number, currentXp: number, addedXp: number) {
  let xp = currentXp + addedXp;
  let level = currentLevel;
  while (xp >= SUBCLASS_XP_PER_LEVEL) {
    xp -= SUBCLASS_XP_PER_LEVEL;
    level += 1;
  }
  return { level, xp };
}

export const MAX_STREAK_MULTIPLIER = 5;

export function getStreakMultiplier(streak: number) {
  return Math.min(1 + Math.floor(streak / 5), MAX_STREAK_MULTIPLIER);
}

// Harder-tier questions pay out more XP/gold, so difficulty progression stays
// tied to visible reward (Flow + Competence) rather than just gating content.
export function getTierRewardMultiplier(tier: number) {
  return Math.max(1, tier);
}

// ~1 in 8 correct answers triggers a "Lucky Find" bonus of 1-3x the normal
// gold rate — a small variable-reward moment on top of the deterministic
// streak multiplier, so correct answers aren't 100% predictable in payout.
export const CRIT_CHANCE = 0.12;

export function rollCritBonus(): number | null {
  return Math.random() < CRIT_CHANCE ? (1 + Math.floor(Math.random() * 3)) : null;
}