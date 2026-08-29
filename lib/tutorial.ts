// lib/tutorial.ts
//
// Per-tab, per-user "has this kid seen the first-visit tutorial for this
// tab" flags. Stored in localStorage (not sessionStorage, which Dashboard
// uses for activeTab — that resets every browser restart and would replay
// the tutorial constantly) and keyed per user like userSession.ts's
// SESSION_KEY, so siblings sharing a device each get their own walkthrough.
//
// The `board` tab tutorial doesn't use this — it's gated server-side via
// user_last_login.onboarding_completed_at (see Dashboard.tsx) since that's
// the account's very first tutorial and is worth surviving a device switch.
// This module is for the per-tab tutorials that come after it.

const PREFIX = 'tutorial_seen';

function storageKey(tabKey: string, userId: string): string {
  return `${PREFIX}:${tabKey}:${userId}`;
}

export function hasSeenTabTutorial(tabKey: string, userId: string | null): boolean {
  if (typeof window === 'undefined' || !userId) return true; // don't show before we know who's playing
  return localStorage.getItem(storageKey(tabKey, userId)) === '1';
}

export function markTabTutorialSeen(tabKey: string, userId: string | null): void {
  if (typeof window === 'undefined' || !userId) return;
  localStorage.setItem(storageKey(tabKey, userId), '1');
}
