// lib/guildConfig.ts

// Bump this manually each school term (Term 1 / 2 / 3)
export const CURRENT_TERM = 1;

export const TIME_ATTACK_DURATION = 60; // seconds
export const PREFETCH_BATCH_SIZE = 35; // 30-40 range per spec

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

export function getStreakMultiplier(streak: number) {
  return 1 + Math.floor(streak / 5);
}