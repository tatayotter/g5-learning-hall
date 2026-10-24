// lib/townNpcs.ts
// The guild masters (and Baylan the Loreteller) who stroll in front of their halls in Inkwell Town (drawn by
// lib/phaserMap/guildNpcs.ts). Each sheet in public/npcs/walk/ is one row: 25 walk frames facing
// right, then the idle pose (built by /mnt/project-files/guild-npcs/build_npcs.py).
import type { GuildKey } from '@/lib/dailyChecklist';

export interface TownNpc {
  id: string;
  name: string;
  /** The guild they open (walk up, then E or tap). None for the town's Loreteller. */
  guild?: GuildKey;
  /** What they say when tapped, for one with no guild. */
  hello?: string;
  sheet: string;
  frameW: number;
  frameH: number;
  /** The tile in front of their hall door; they wander a few steps around it. */
  home: { x: number; y: number };
  /** How many steps from home they walk. */
  range: number;
}

export const TOWN_NPCS: Record<string, TownNpc[]> = {
  town: [
    { id: 'spellcaster', name: 'Spell Caster', guild: 'spellcaster', sheet: '/npcs/walk/spellcaster.webp', frameW: 100, frameH: 130, home: { x: 6, y: 16 }, range: 4 },
    { id: 'numberrealm', name: 'Realm Guardian', guild: 'number_realm', sheet: '/npcs/walk/numberrealm.webp', frameW: 87, frameH: 115, home: { x: 16, y: 11 }, range: 5 },
    { id: 'lorekeeper', name: 'Lore Keeper', guild: 'lorekeeper', sheet: '/npcs/walk/lorekeeper.webp', frameW: 81, frameH: 116, home: { x: 30, y: 11 }, range: 5 },
    { id: 'lexiconarena', name: 'Lexicon Admiral', guild: 'lexicon_arena', sheet: '/npcs/walk/lexiconarena.webp', frameW: 88, frameH: 118, home: { x: 43, y: 11 }, range: 5 },
    // Baylan the Loreteller strolls around the fountain; he'll run the notice board.
    { id: 'loreteller', name: 'Baylan the Loreteller', sheet: '/npcs/walk/loreteller.webp', frameW: 74, frameH: 116, home: { x: 26, y: 22 }, range: 4, hello: "Hello! I'm Baylan. Big town news is coming soon!" },
    { id: 'logiclabyrinth', name: 'Logic Master', guild: 'logic_labyrinth', sheet: '/npcs/walk/logiclabyrinth.webp', frameW: 79, frameH: 117, home: { x: 54, y: 19 }, range: 5 },
  ],
};

/** Walk frames in each sheet; the idle pose comes right after them. */
export const NPC_WALK_FRAMES = 25;
