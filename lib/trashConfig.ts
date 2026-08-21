// lib/trashConfig.ts
// Trash-scavenging system configuration.
// Players find trash scattered on the map and trade bundles to the Recycler
// NPC for gold.  Conversion rate: N items of type T = 1 gold.

export type TrashType = 'paper' | 'bottle' | 'wrapper' | 'pencil' | 'chipbag';

export interface TrashDef {
  type: TrashType;
  label: string;
  emoji: string;
  /** Number of this item needed to trade for 1 gold. */
  bundleSize: number;
  /** Relative weight in the spawn pool — higher = spawns more often. */
  spawnWeight: number;
}

export const TRASH_DEFS: Record<TrashType, TrashDef> = {
  paper:   { type: 'paper',   label: 'Crumpled Paper', emoji: '🧻', bundleSize: 10, spawnWeight: 8 },
  bottle:  { type: 'bottle',  label: 'Plastic Bottle', emoji: '🥤', bundleSize: 5,  spawnWeight: 4 },
  wrapper: { type: 'wrapper', label: 'Candy Wrapper',  emoji: '🍬', bundleSize: 3,  spawnWeight: 3 },
  pencil:  { type: 'pencil',  label: 'Broken Pencil',  emoji: '✏️', bundleSize: 2,  spawnWeight: 2 },
  chipbag: { type: 'chipbag', label: 'Chip Bag',       emoji: '🥡', bundleSize: 1,  spawnWeight: 1 },
};

/** Display order in inventory — most common → rarest. */
export const TRASH_ORDER: TrashType[] = ['paper', 'bottle', 'wrapper', 'pencil', 'chipbag'];

/** Total trash items that spawn per field. */
export const TRASH_SPAWN_COUNT = 18;

/** How long (ms) after all trash is collected before respawning. */
export const TRASH_RESPAWN_MS = 5 * 60 * 1000; // 5 minutes

/** Fixed Recycler NPC tile per region. */
export const RECYCLER_TILES: Record<string, { x: number; y: number }> = {
  ledgers_heart:     { x: 26, y: 16 },
  cinderreach:       { x: 13, y: 2  },
  tidewrit_shallows: { x: 2,  y: 2  },
  rootbound_wilds:   { x: 13, y: 13 },
  stormrun_reaches:  { x: 2,  y: 13 },
  unread_margins:    { x: 13, y: 2  },
  radiant_archive:   { x: 13, y: 13 },
};
