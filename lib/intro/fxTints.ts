// lib/intro/fxTints.ts
// The intro FX palette, kept out of IntroFxScene.ts so lib/intro/introCues.ts
// can use it without statically importing Phaser (which touches `window` at
// load and breaks server rendering of the home page).

// [light, mid, dark], same values as BattleStageScene's BURST_TINTS.
export const FX_TINTS = {
  fire: [0xffe066, 0xff8a1a, 0xff3b0a],
  water: [0xe0f7ff, 0x5cc8ff, 0x1a6fd1],
  leaf: [0xeaffb0, 0x7ad44a, 0x2f8a2a],
  storm: [0xffffcc, 0xffe14a, 0xb8a000],
  shadow: [0xc9a6ff, 0x7a3cff, 0x2a0a55],
  light: [0xffffff, 0xfff1a8, 0xffc93d],
  normal: [0xffffff, 0xffe38a, 0xffb020],
  // Living ink: gold with dark droplets.
  ink: [0xfff1a8, 0xffc93d, 0x2a1505],
} as const;
export type FxTints = readonly number[];
