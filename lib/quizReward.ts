// lib/quizReward.ts
export function calculateReward(attempts: number) {
  const safeAttempts = Number.isFinite(attempts) && attempts > 0 ? attempts : 1;
  const multiplier = Math.max(1 - 0.1 * (safeAttempts - 1), 0.5);
  return {
    xp: Math.round(200 * multiplier),
    gold: Math.round(50 * multiplier),
  };
}
