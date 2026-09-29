// lib/coinToss.ts
// Speed ties: when neither curio's hit this round would knock the other out,
// order doesn't matter — both hits land (no toss). Only when a tie meets a
// FINISHING BLOW (either side's hit would KO) does a coin toss decide who
// strikes first, shown with the coin animation (components/battle/
// CoinToss.tsx); a curio KO'd before its turn then never acts. Tossed fresh
// each such round.

export const COIN_TOSS_BANNER = 'Speed tie! A coin toss decides who strikes first!';
export const COIN_TOSS_TITLE = 'Evenly matched!';

// `winnerIsPlayer`: from the viewing player's side. `trainerName` is the
// winning side's trainer (only used when the player lost the toss).
export function coinTossResultText(winnerIsPlayer: boolean, curioName: string, trainerName: string): string {
  return winnerIsPlayer
    ? `You win the toss! ${curioName} strikes first!`
    : `${trainerName} wins the toss! ${curioName} strikes first!`;
}

// Local (NPC / bot) toss: true = the player wins.
export function tossCoin(): boolean {
  return Math.random() < 0.5;
}

// PvP needs both clients to agree on the toss without a round trip, so it's
// derived from a string both sides know (battle id + the two curios, in
// challenger/opponent order) instead of Math.random. FNV-1a, lowest bit.
export function seededCoinFlip(seed: string): 0 | 1 {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) & 1) as 0 | 1;
}
