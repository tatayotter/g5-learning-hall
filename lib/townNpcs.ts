// lib/townNpcs.ts
// The guild masters (and Baylan the Loreteller, the Shopkeeper and the Curio Expert) who stroll in
// front of their halls in Inkwell Town (drawn by lib/phaserMap/guildNpcs.ts). Each sheet in
// public/npcs/walk/ is one row: the walk frames facing right (25 unless walkFrames says), then the
// idle pose (built by /mnt/project-files/guild-npcs/build_npcs.py and
// /mnt/project-files/shopkeeper-npc/build_shopkeeper.py, soldier-npc/build_soldiers.py).
import type { GuildKey } from '@/lib/dailyChecklist';

/** A page a town NPC opens when talked to (instead of a guild). */
export type TownPage = 'shop' | 'vault' | 'journal' | 'curios';

export interface TownNpc {
  id: string;
  name: string;
  /** The guild they open (walk up, then E or tap). None for the town's Loreteller. */
  guild?: GuildKey;
  /** The page they open (walk up, then E or tap). */
  opens?: TownPage;
  /** The button's words for `opens`, e.g. "Shop". */
  opensLabel?: string;
  /** What they say when tapped, for one with no guild or page. */
  hello?: string;
  sheet: string;
  /** Walk frames in the sheet when not NPC_WALK_FRAMES; the idle pose comes right after them. */
  walkFrames?: number;
  frameW: number;
  frameH: number;
  /** The tile in front of their hall door; they wander a few steps around it. */
  home: { x: number; y: number };
  /** How many steps from home they walk. */
  range: number;
  /** Marches with a squad on a patrol route instead of wandering (slot 0 leads). */
  patrol?: { route: string; slot: number };
  /** No name tag over them (a squad's rank and file). */
  noTag?: boolean;
}

/** A squad's beat: a loop of tile points; the leader halts at `stops` (point index -> ms). */
export interface PatrolRoute {
  points: { x: number; y: number }[];
  stops: Record<number, number>;
}

export const PATROL_ROUTES: Record<string, PatrolRoute> = {
  // Clockwise round the fountain plaza, halting mid-way along the north and south sides.
  plaza: {
    points: [{ x: 24, y: 16.5 }, { x: 29.5, y: 16.5 }, { x: 35, y: 16.5 }, { x: 35, y: 22 }, { x: 29.5, y: 22 }, { x: 24, y: 22 }],
    stops: { 1: 5000, 4: 5000 },
  },
};

const SOLDIER = { sheet: '/npcs/walk/soldier.webp', frameW: 62, frameH: 116, walkFrames: 11 };
const GUARD_HELLO = 'All quiet in Inkwell Town! Have fun, young tamer.';

export const TOWN_NPCS: Record<string, TownNpc[]> = {
  town: [
    { id: 'spellcaster', name: 'Spell Caster', guild: 'spellcaster', sheet: '/npcs/walk/spellcaster.webp', frameW: 100, frameH: 130, home: { x: 6, y: 16 }, range: 4 },
    { id: 'numberrealm', name: 'Realm Guardian', guild: 'number_realm', sheet: '/npcs/walk/numberrealm.webp', frameW: 87, frameH: 115, home: { x: 16, y: 11 }, range: 5 },
    { id: 'lorekeeper', name: 'Lore Keeper', guild: 'lorekeeper', sheet: '/npcs/walk/lorekeeper.webp', frameW: 81, frameH: 116, home: { x: 30, y: 11 }, range: 5 },
    { id: 'lexiconarena', name: 'Lexicon Admiral', guild: 'lexicon_arena', sheet: '/npcs/walk/lexiconarena.webp', frameW: 88, frameH: 118, home: { x: 43, y: 11 }, range: 5 },
    // Baylan the Loreteller strolls around the fountain; he'll run the notice board.
    { id: 'loreteller', name: 'Baylan the Loreteller', sheet: '/npcs/walk/loreteller.webp', frameW: 74, frameH: 116, home: { x: 26, y: 22 }, range: 4, hello: "Hello! I'm Baylan. Big town news is coming soon!" },
    // The Shopkeeper minds the red-roofed shop south-east of the fountain; the Curio Expert works
    // next door at the teal house. Neither gets a "?" (that's for the guild masters).
    { id: 'shopkeeper', name: 'Shopkeeper', opens: 'shop', opensLabel: 'Shop', sheet: '/npcs/walk/shopkeeper.webp', frameW: 78, frameH: 116, walkFrames: 18, home: { x: 47, y: 27 }, range: 3 },
    { id: 'curioexpert', name: 'Curio Expert', opens: 'curios', opensLabel: 'Curios', sheet: '/npcs/walk/curioexpert.webp', frameW: 70, frameH: 115, walkFrames: 18, home: { x: 56, y: 27 }, range: 3 },
    // Town Guards on their beats: the south gate, the west and east roads, the north road.
    { id: 'guard_gate_s', name: 'Town Guard', ...SOLDIER, home: { x: 30, y: 35 }, range: 3, hello: GUARD_HELLO },
    { id: 'guard_road_w', name: 'Town Guard', ...SOLDIER, home: { x: 12, y: 20 }, range: 3, hello: GUARD_HELLO },
    { id: 'guard_road_e', name: 'Town Guard', ...SOLDIER, home: { x: 44, y: 19 }, range: 3, hello: GUARD_HELLO },
    { id: 'guard_road_n', name: 'Town Guard', ...SOLDIER, home: { x: 37, y: 12 }, range: 3, hello: GUARD_HELLO },
    // The Knight Commander marches his squad of four round the plaza (lib/phaserMap/guildNpcs.ts).
    { id: 'knight_commander', name: 'Knight Commander', sheet: '/npcs/walk/commander.webp', frameW: 87, frameH: 132, walkFrames: 11, home: { x: 24, y: 16 }, range: 0, patrol: { route: 'plaza', slot: 0 }, hello: 'Eyes front, squad! Hello there, young tamer!' },
    ...[1, 2, 3, 4].map(slot => ({ id: `squad_${slot}`, name: 'Town Guard', ...SOLDIER, home: { x: 24, y: 16 }, range: 0, patrol: { route: 'plaza', slot }, noTag: true, hello: GUARD_HELLO })),
    { id: 'logiclabyrinth', name: 'Logic Master', guild: 'logic_labyrinth', sheet: '/npcs/walk/logiclabyrinth.webp', frameW: 79, frameH: 117, home: { x: 54, y: 19 }, range: 5 },
  ],
};

/** Walk frames in each sheet; the idle pose comes right after them. */
export const NPC_WALK_FRAMES = 25;
