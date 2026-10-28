// lib/wildlife.ts
// The little animals living on each map (drawn by lib/phaserMap/critters.ts), and the little
// touches on its ground and water (lib/phaserMap/groundFx.ts). They are only for
// looks: they wander, and run, fly or dig away when anyone walks up to them (the kid, bots, or
// other players). Nothing is saved; every kid sees their own.

export type CritterKind = 'wisp' | 'dragonfly' | 'bird' | 'crab' | 'butterfly';

export interface CritterGroup {
  kind: CritterKind;
  // How many groups on a 60 x 40 map (scaled by area), and how many in each group.
  groups: number;
  size: [number, number];
  // Where they start: 'near-liquid' = open or liquid tiles within 3 of water or lava; 'shore' =
  // walkable tiles right by the water (the beach); 'open' = any walkable tile; 'flowers' = the
  // day's flowers (butterflies, in the daytime only).
  home: 'near-liquid' | 'shore' | 'open' | 'flowers';
  // Wisps only: the colors they come in, one picked per wisp (fire = the Cinderreach's orange).
  colors?: WispColor[];
}

export type WispColor = 'fire' | 'violet' | 'cyan' | 'gold' | 'ash'; // gold, ash: the question scrolls' wisps (scrollGlow.ts)

export const WILDLIFE: Record<string, CritterGroup[]> = {
  ledgers_heart: [
    { kind: 'bird', groups: 5, size: [2, 3], home: 'open' },
    { kind: 'butterfly', groups: 14, size: [1, 2], home: 'flowers' },
  ],
  town: [
    { kind: 'bird', groups: 3, size: [2, 3], home: 'open' },
    { kind: 'butterfly', groups: 8, size: [1, 2], home: 'flowers' },
  ],
  cinderreach: [
    { kind: 'wisp', groups: 8, size: [1, 1], home: 'near-liquid' },
  ],
  rootbound_wilds: [
    { kind: 'butterfly', groups: 10, size: [1, 2], home: 'flowers' },
    { kind: 'dragonfly', groups: 2, size: [4, 5], home: 'near-liquid' },
    { kind: 'bird', groups: 3, size: [2, 3], home: 'open' },
  ],
  stormrun_reaches: [
    { kind: 'bird', groups: 6, size: [2, 4], home: 'open' },
    { kind: 'dragonfly', groups: 1, size: [3, 4], home: 'near-liquid' },
  ],
  // Spirit wisps, violet and cyan, over the ink pools and drifting through the woods.
  unread_margins: [
    { kind: 'wisp', groups: 9, size: [1, 1], home: 'near-liquid', colors: ['violet', 'cyan'] },
    { kind: 'wisp', groups: 6, size: [1, 1], home: 'open', colors: ['violet', 'cyan'] },
  ],
  radiant_archive: [
    { kind: 'butterfly', groups: 16, size: [1, 2], home: 'flowers' },
    { kind: 'bird', groups: 3, size: [2, 3], home: 'open' },
  ],
  tidewrit_shallows: [
    { kind: 'dragonfly', groups: 3, size: [4, 5], home: 'near-liquid' },
    { kind: 'crab', groups: 7, size: [1, 1], home: 'shore' },
    { kind: 'bird', groups: 2, size: [2, 3], home: 'open' },
  ],
};

export interface GroundFxKinds {
  foam?: boolean; // waves washing on the shore
  ripples?: boolean; // rings on the water beside anyone walking along it
  fish?: boolean; // a fish jumping now and then
  bubbles?: boolean; // lava bubbles popping
  prints?: boolean; // footprints in the sand
  puffs?: boolean; // ash kicked up by every step
  embers?: boolean; // embers rising off the lava; it glows at night
  deep?: boolean; // the water gets darker the further it is from land, in soft curved bands
  shimmer?: boolean; // heat haze: the air over the lava wobbles
  puddles?: boolean; // while it rains: rings on the paths, and splashes where anyone walks on them
  river?: boolean; // leaves and twigs floating down the river (it runs down the map, to the sea)
  peekers?: boolean; // shadow creatures peeking from behind the trees, hiding when anyone comes near
}

export const GROUND_FX: Record<string, GroundFxKinds> = {
  cinderreach: { bubbles: true, puffs: true, embers: true, shimmer: true },
  rootbound_wilds: { ripples: true, fish: true, river: true, puddles: true },
  stormrun_reaches: { ripples: true, fish: true, puddles: true },
  unread_margins: { ripples: true, peekers: true },
  radiant_archive: { ripples: true, fish: true },
  tidewrit_shallows: { foam: true, ripples: true, fish: true, prints: true, deep: true, river: true, puddles: true },
};
