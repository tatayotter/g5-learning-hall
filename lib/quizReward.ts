// lib/quizReward.ts
//
// Shared by components/QuestModule.tsx (live grading, in-session) and
// lib/offlineSync.ts (deferred grading, once back online after an offline
// quiz submission) — both need the exact same reward formula so an offline
// submission pays out identically to a live one.
export function calculateReward(attempts: number) {
  const safeAttempts = Number.isFinite(attempts) && attempts > 0 ? attempts : 1;
  const multiplier = Math.max(1 - 0.1 * (safeAttempts - 1), 0.5);
  return {
    xp: Math.round(200 * multiplier),
    gold: Math.round(50 * multiplier),
  };
}
