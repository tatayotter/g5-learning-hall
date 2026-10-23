// lib/wildlife.ts
// The little animals living on each map (drawn by lib/phaserMap/critters.ts), and the little
// touches on its ground and water (lib/phaserMap/groundFx.ts). They are only for
// looks: they wander, and run, fly or dig away when anyone walks up to them (the kid, bots, or
// other players). Nothing is saved; every kid sees their own.

export type CritterKind = 'wisp' | 'dragonfly' | 'bird' | 'crab';

export interface CritterGroup {
  kind: CritterKind;
  // How many groups on a 60 x 40 map (scaled by area), and how many in each group.
  groups: number;
  size: [number, number];
  // Where they start: 'near-liquid' = open or liquid tiles within 3 of water or lava; 'shore' =
  // walkable tiles right by the water (the beach); 'open' = any walkable tile.
  home: 'near-liquid' | 'shore' | 'open';
}

export const WILDLIFE: Record<string, CritterGroup[]> = {
  ledgers_heart: [
    { kind: 'bird', groups: 5, size: [2, 3], home: 'open' },
  ],
  cinderreach: [
    { kind: 'wisp', groups: 8, size: [1, 1], home: 'near-liquid' },
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
}

export const GROUND_FX: Record<string, GroundFxKinds> = {
  cinderreach: { bubbles: true, puffs: true, embers: true },
  tidewrit_shallows: { foam: true, ripples: true, fish: true, prints: true, deep: true },
};
