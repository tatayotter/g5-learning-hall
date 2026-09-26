// lib/battleIntro.ts
// Timing for the battle intro screen (components/battle/BattleIntro.tsx),
// which covers the stage while every image the battle needs is loaded.

// The intro always shows at least this long, even when everything is
// already cached — it doubles as the "VS" beat before the fight.
export const BATTLE_INTRO_MIN_MS = 3000;

// Loading safety cutoff: after this, the Ready button shows even if an asset
// is still hanging (a missing curio file falls back to its emoji anyway).
export const BATTLE_INTRO_MAX_MS = 10000;

// Once loaded (and past the minimum), the intro shows a Ready button and
// waits for the player — so the whole intro animation gets to play out.
// Solo battles wait indefinitely; PvP can't (the round clock is shared), so
// there the button counts down and starts the fight on its own after this.
export const BATTLE_INTRO_READY_AUTOSTART_MS = 7000;

// Worst case the intro can hold a PvP player before round 1 input opens —
// round 1's deadline is extended by this (hooks/useLiveBattle.ts).
export const BATTLE_INTRO_PVP_GRACE_MS = BATTLE_INTRO_MAX_MS + BATTLE_INTRO_READY_AUTOSTART_MS;

// Flavor line shown above the intro's "VS" — one picked at random each time
// an intro plays. Keep them short (they wrap under ~22 characters a line),
// upbeat, and about learning powering the fight.
export const BATTLE_INTRO_TAGLINES = [
  'Get ready to battle!',
  'Test your wits!',
  "Let's test your training!",
  'Smarter is stronger!',
  'Think fast, strike true!',
  'Knowledge is your power!',
  'Every answer is an attack!',
  'Brains before brawn!',
  "Show what you've learned!",
  'Sharpen your mind!',
  'Answer well, hit hard!',
  'Your lessons are your weapons!',
  'Stay sharp, trainer!',
  'Study hard, battle harder!',
  'Let the quiz clash begin!',
];

export function pickBattleIntroTagline(): string {
  return BATTLE_INTRO_TAGLINES[Math.floor(Math.random() * BATTLE_INTRO_TAGLINES.length)];
}
