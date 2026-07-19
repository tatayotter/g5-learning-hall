// lib/monsterConfig.ts
// Full monster roster, element system, skill definitions, and battle constants
// for the Monster Guild feature.

import type { GuildKey } from '@/lib/dailyChecklist';

// ─── ELEMENT SYSTEM ─────────────────────────────────────────────────────────

export type Element = 'fire' | 'water' | 'leaf' | 'storm' | 'shadow' | 'light';

// attacker: element that is strong against (deals 1.5x to) the mapped element
const ELEMENT_WEAKNESSES: Record<Element, Element> = {
  fire:   'leaf',
  leaf:   'water',
  water:  'fire',
  storm:  'water',
  light:  'shadow',
  shadow: 'light',
};

// Returns damage multiplier when attacker element hits defender element
export function getElementMultiplier(attacker: Element, defender: Element): number {
  return ELEMENT_WEAKNESSES[attacker] === defender ? 1.5 : 1.0;
}

// Given a player monster's element, returns the element it is strong
// against — used to build a Training Dummy opponent that's always weak to
// whatever the player is currently fielding.
export function getCounterElement(element: Element): Element {
  return ELEMENT_WEAKNESSES[element];
}

// ─── STATUS EFFECTS ─────────────────────────────────────────────────────────

export type StatusEffect = 
  | 'burn' | 'paralyze' | 'curse' | 'blessed' | null 
  | 'def_boost' | 'atk_boost' | 'revive';

export const STATUS_DEFINITIONS: Record<NonNullable<StatusEffect>, {
  label: string;
  emoji: string;
  description: string;
}> = {
  burn:     { label: 'Burn',     emoji: '🔥', description: 'Deals 5 damage per turn' },
  paralyze: { label: 'Paralyze', emoji: '⚡', description: 'Skips next attack turn' },
  curse:    { label: 'Curse',    emoji: '🌑', description: 'Reduces damage dealt by 50% for 2 turns' },
  blessed:  { label: 'Blessed',  emoji: '✨', description: 'Next correct answer deals double damage' },
  def_boost: { label: 'Def Boost', emoji: '🛡️', description: 'Damage taken halved' },
  atk_boost: { label: 'Atk Boost', emoji: '⚔️', description: 'Damage dealt increased' },
  revive: { label: 'Revived', emoji: '🔄', description: 'Back in action' }
};

// Which element applies which status effect (only on perfect answers)
export const ELEMENT_STATUS: Partial<Record<Element, StatusEffect>> = {
  fire:   'burn',
  storm:  'paralyze',
  shadow: 'curse',
  light:  'blessed',
};

// ─── SKILLS ─────────────────────────────────────────────────────────────────

export interface Skill {
  id: string;
  name: string;
  element: Element;
  tier: 1 | 2 | 3;
  questionCount: 1 | 2 | 3;  // matches tier
  baseDamageMultiplier: number;
  description: string;
}

export const SKILLS: Record<string, Skill> = {
  // FIRE
  ember:         { id: 'ember',         name: 'Ember',         element: 'fire',   tier: 1, questionCount: 1, baseDamageMultiplier: 1.0, description: 'A weak but accurate fire attack.' },
  flamethrower:  { id: 'flamethrower',  name: 'Flamethrower',  element: 'fire',   tier: 2, questionCount: 2, baseDamageMultiplier: 1.5, description: 'A sustained stream of fire.' },
  inferno_blast: { id: 'inferno_blast', name: 'Inferno Blast',  element: 'fire',   tier: 3, questionCount: 3, baseDamageMultiplier: 2.0, description: 'A massive fire explosion. May cause Burn.' },

  // WATER
  water_gun:     { id: 'water_gun',     name: 'Water Gun',     element: 'water',  tier: 1, questionCount: 1, baseDamageMultiplier: 1.0, description: 'A pressurized water blast.' },
  hydro_pump:    { id: 'hydro_pump',    name: 'Hydro Pump',    element: 'water',  tier: 2, questionCount: 2, baseDamageMultiplier: 1.5, description: 'A powerful torrent of water.' },
  hydro_blast:   { id: 'hydro_blast',   name: 'Hydro Blast',   element: 'water',  tier: 3, questionCount: 3, baseDamageMultiplier: 2.0, description: 'An overwhelming water surge.' },

  // LEAF
  vine_whip:     { id: 'vine_whip',     name: 'Vine Whip',     element: 'leaf',   tier: 1, questionCount: 1, baseDamageMultiplier: 1.0, description: 'A sharp lash with vines.' },
  razor_leaf:    { id: 'razor_leaf',    name: 'Razor Leaf',    element: 'leaf',   tier: 2, questionCount: 2, baseDamageMultiplier: 1.5, description: 'A flurry of razor-sharp leaves.' },
  solar_beam:    { id: 'solar_beam',    name: 'Solar Beam',    element: 'leaf',   tier: 3, questionCount: 3, baseDamageMultiplier: 2.0, description: 'Absorbs sunlight, then fires. Restores HP.' },

  // STORM
  thunder_shock: { id: 'thunder_shock', name: 'Thunder Shock', element: 'storm',  tier: 1, questionCount: 1, baseDamageMultiplier: 1.0, description: 'A small electric jolt.' },
  thunderbolt:   { id: 'thunderbolt',   name: 'Thunderbolt',   element: 'storm',  tier: 2, questionCount: 2, baseDamageMultiplier: 1.5, description: 'A crackling bolt of lightning.' },
  thunder_surge: { id: 'thunder_surge', name: 'Thunder Surge', element: 'storm',  tier: 3, questionCount: 3, baseDamageMultiplier: 2.0, description: 'A storm-level discharge. May Paralyze.' },

  // SHADOW
  shadow_claw:   { id: 'shadow_claw',   name: 'Shadow Claw',  element: 'shadow', tier: 1, questionCount: 1, baseDamageMultiplier: 1.0, description: 'A slash from the darkness.' },
  dark_pulse:    { id: 'dark_pulse',    name: 'Dark Pulse',   element: 'shadow', tier: 2, questionCount: 2, baseDamageMultiplier: 1.5, description: 'A wave of dark energy.' },
  void_strike:   { id: 'void_strike',   name: 'Void Strike',  element: 'shadow', tier: 3, questionCount: 3, baseDamageMultiplier: 2.0, description: 'Strikes from the void. May Curse.' },

  // LIGHT
  flash:         { id: 'flash',         name: 'Flash',        element: 'light',  tier: 1, questionCount: 1, baseDamageMultiplier: 1.0, description: 'A blinding burst of light.' },
  sacred_beam:   { id: 'sacred_beam',   name: 'Sacred Beam',  element: 'light',  tier: 2, questionCount: 2, baseDamageMultiplier: 1.5, description: 'A focused beam of holy light.' },
  divine_burst:  { id: 'divine_burst',  name: 'Divine Burst', element: 'light',  tier: 3, questionCount: 3, baseDamageMultiplier: 2.0, description: 'A radiant explosion. May Bless.' },
};

// ─── REST SKILL ──────────────────────────────────────────────────────────────

export interface RestConfig {
  hpRestorePercent: number;
  maxUsesPerBattle: number;
}

export const REST_BY_ELEMENT: Record<Element, RestConfig> = {
  leaf:   { hpRestorePercent: 0.40, maxUsesPerBattle: 2 },
  water:  { hpRestorePercent: 0.30, maxUsesPerBattle: 1 },
  fire:   { hpRestorePercent: 0.25, maxUsesPerBattle: 1 },
  storm:  { hpRestorePercent: 0.25, maxUsesPerBattle: 1 },
  shadow: { hpRestorePercent: 0.25, maxUsesPerBattle: 1 },
  light:  { hpRestorePercent: 0.25, maxUsesPerBattle: 1 },
};

// ─── MONSTER DEFINITIONS ─────────────────────────────────────────────────────

export type MonsterArchetype = 'tank' | 'balanced' | 'glass_cannon';

export interface MonsterDef {
  id: string;
  name: string;
  element: Element;
  archetype: MonsterArchetype;
  emoji: string;
  description: string;
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
  baseSpeed: number;
  skills: [string, string, string]; // [tier1_id, tier2_id, tier3_id]
  // Skill tier unlocks by monster level
  skillUnlocks: { tier2: number; tier3: number }; // tier1 always available at level 1
  isLegendary?: boolean;
  // Overrides which /public/monsters/{spriteId}.webp file MonsterImage loads,
  // when it differs from `id` (e.g. a guild companion's tier1 sprite file is
  // named after its tier1 form, not the DB monster_id). Falls back to `id`.
  spriteId?: string;
  // Present only on the 5 guild companion monsters (see GUILD_MONSTERS below).
  // Gates the monster's *displayed* name/emoji/sprite on the owning player's
  // guild level — separate from monster_level/monster_exp, which progress
  // normally regardless of guild level.
  guildEvolution?: {
    guildKey: GuildKey;
    tier2: { level: number; name: string; emoji: string; spriteId?: string; isLegendary?: boolean };
    tier3: { level: number; name: string; emoji: string; spriteId?: string; isLegendary?: boolean };
  };
}

const STAT_PRESETS: Record<MonsterArchetype, { baseHp: number; baseAttack: number; baseDefense: number; baseSpeed: number }> = {
  tank:         { baseHp: 120, baseAttack: 15, baseDefense: 20, baseSpeed: 8  },
  balanced:     { baseHp: 100, baseAttack: 18, baseDefense: 15, baseSpeed: 12 },
  glass_cannon: { baseHp: 80,  baseAttack: 25, baseDefense: 10, baseSpeed: 18 },
};

// Wild-only monsters get a step up across every stat — they're meant to feel
// like a real prize after such a rare, hard-won catch.
const WILD_STAT_PRESET = { baseHp: 140, baseAttack: 26, baseDefense: 20, baseSpeed: 16 };

// One starter per element — the rest of the original 12 (Embrak, Coralyn,
// Mosshorn, Galestrik, Duskral, Luminos) now live in WILD_MONSTERS below,
// only obtainable through a wild encounter.
export const MONSTERS: Record<string, MonsterDef> = {
  shadrak: {
    id: 'shadrak', name: 'Shadrak', element: 'shadow', archetype: 'glass_cannon',
    emoji: '👻', description: 'A cloaked phantom with hollow eyes. It wove its cloak from leftover night. It doesn’t cast a shadow — it wears one. Moves without sound and watches from doorways.',
    ...STAT_PRESETS.glass_cannon,
    skills: ['shadow_claw', 'dark_pulse', 'void_strike'],
    skillUnlocks: { tier2: 5, tier3: 10 },
  },
  torrenth: {
    id: 'torrenth', name: 'Torrenth', element: 'water', archetype: 'tank',
    emoji: '🐢', description: 'An armored sea turtle with a crashing shell. Each ridge on its shell holds the echo of a wave. Can tuck in and become almost immovable, like a small island.',
    ...STAT_PRESETS.tank,
    skills: ['water_gun', 'hydro_pump', 'hydro_blast'],
    skillUnlocks: { tier2: 5, tier3: 10 },
  },
  voltmane: {
    id: 'voltmane', name: 'Voltmane', element: 'storm', archetype: 'glass_cannon',
    emoji: '⚡', description: 'A wild-maned beast crackling with static. Its mane stands straight up from its own charge. Runs in short, blinding bursts that leave the smell of rain.',
    ...STAT_PRESETS.glass_cannon,
    skills: ['thunder_shock', 'thunderbolt', 'thunder_surge'],
    skillUnlocks: { tier2: 5, tier3: 10 },
  },
  fernix: {
    id: 'fernix', name: 'Fernix', element: 'leaf', archetype: 'balanced',
    emoji: '🦅', description: 'A bird made entirely of woven leaves and vines. Its body rustles when it flies. If it loses a feather, a small green sprout appears where it lands.',
    ...STAT_PRESETS.balanced,
    skills: ['vine_whip', 'razor_leaf', 'solar_beam'],
    skillUnlocks: { tier2: 5, tier3: 10 },
  },
  solarch: {
    id: 'solarch', name: 'Solarch', element: 'light', archetype: 'tank',
    emoji: '🦁', description: 'A regal lion with a sun-disc mane. The disc floats just off its fur and glows like late morning. Wakes early and lies in the highest sun it can find.',
    ...STAT_PRESETS.tank,
    skills: ['flash', 'sacred_beam', 'divine_burst'],
    skillUnlocks: { tier2: 5, tier3: 10 },
  },
  pyravex: {
    id: 'pyravex', name: 'Pyravex', element: 'fire', archetype: 'glass_cannon',
    emoji: '🦊', description: 'A grumpy dinosaur-like monster with a blazing tail. The tail spins for balance when it runs. Its chest glows when it breathes in, dimming when it exhales.',
    ...STAT_PRESETS.glass_cannon,
    skills: ['ember', 'flamethrower', 'inferno_blast'],
    skillUnlocks: { tier2: 5, tier3: 10 },
  },
};

// ─── WILD MONSTERS ───────────────────────────────────────────────────────────
// A pool only obtainable through a rare Training Map wild encounter (see
// components/WildEncounterModal.tsx) — never selectable in TeamPanel's normal
// add-monster flow like the MONSTERS above. Emberwyrm/Tidalynx/Zephyrion/
// Nyxfang/Aureon are the original "legendary" exclusives (boosted stats);
// Embrak/Coralyn/Mosshorn/Galestrik/Duskral/Luminos are the other half of the
// original 12 starters, demoted here to keep stat variety in the wild pool.

export const WILD_MONSTERS: Record<string, MonsterDef> = {
  embrak: {
    id: 'embrak', name: 'Embrak', element: 'fire', archetype: 'balanced',
    emoji: '🦎', description: 'A stocky lizard with magma cracks on its hide. Spends days half-buried in warm mud with only nostrils showing. Its bite leaves a clean, cauterized mark.',
    ...STAT_PRESETS.balanced,
    skills: ['ember', 'flamethrower', 'inferno_blast'],
    skillUnlocks: { tier2: 5, tier3: 10 },
  },
  coralyn: {
    id: 'coralyn', name: 'Coralyn', element: 'water', archetype: 'balanced',
    emoji: '🌊', description: 'An elegant coral-horned seahorse. Her branching coral horns filter water and house tiny shrimp. She drifts slowly and guards one patch of reef fiercely.',
    ...STAT_PRESETS.balanced,
    skills: ['water_gun', 'hydro_pump', 'hydro_blast'],
    skillUnlocks: { tier2: 5, tier3: 10 },
  },
  mosshorn: {
    id: 'mosshorn', name: 'Mosshorn', element: 'leaf', archetype: 'tank',
    emoji: '🦌', description: 'A gentle deer with a mossy antler crown. The moss on its antlers holds rainwater and tiny ferns. Sheds its antlers each year, leaving a small mossy hill behind.',
    ...STAT_PRESETS.tank,
    skills: ['vine_whip', 'razor_leaf', 'solar_beam'],
    skillUnlocks: { tier2: 5, tier3: 10 },
  },
  galestrik: {
    id: 'galestrik', name: 'Galestrik', element: 'storm', archetype: 'glass_cannon',
    emoji: '🦅', description: 'A hawk that rides and generates thunderclouds. It surfs wind currents without flapping and drags lightning behind its wingtips when it dives.',
    ...STAT_PRESETS.glass_cannon,
    skills: ['thunder_shock', 'thunderbolt', 'thunder_surge'],
    skillUnlocks: { tier2: 5, tier3: 10 },
  },
  duskral: {
    id: 'duskral', name: 'Duskral', element: 'shadow', archetype: 'glass_cannon',
    emoji: '🐈‍⬛', description: 'A sleek panther that melts into darkness. In low light its outline softens until only its eyes and crescent chest mark remain. Hunts at the edge of lamplight.',
    ...STAT_PRESETS.glass_cannon,
    skills: ['shadow_claw', 'dark_pulse', 'void_strike'],
    skillUnlocks: { tier2: 5, tier3: 10 },
  },
  luminos: {
    id: 'luminos', name: 'Luminos', element: 'light', archetype: 'balanced',
    emoji: '🦊', description: 'A small glowing fox with a radiant tail. Its tail works like a lantern that dims and brightens with its breathing. Leaves faint light pawprints that fade by morning.',
    ...STAT_PRESETS.balanced,
    skills: ['flash', 'sacred_beam', 'divine_burst'],
    skillUnlocks: { tier2: 5, tier3: 10 },
  },
  emberwyrm: {
    id: 'emberwyrm', name: 'Emberwyrm', element: 'fire', archetype: 'tank',
    emoji: '🐉', description: 'A legendary wyrm wreathed in slow, eternal flame. Sleeps coiled around dormant volcanoes. Its flame moves so slowly you can watch it crawl across its scales over days.',
    ...WILD_STAT_PRESET,
    skills: ['ember', 'flamethrower', 'inferno_blast'],
    skillUnlocks: { tier2: 5, tier3: 10 },
    isLegendary: true,
  },
  tidalynx: {
    id: 'tidalynx', name: 'Tidalynx', element: 'water', archetype: 'tank',
    emoji: '🐋', description: 'A serene leviathan said to command the deep tides. Lives along untouched coasts. Where it steps, water pulls back, leaving its pawprints filled with clear tide.',
    ...WILD_STAT_PRESET,
    skills: ['water_gun', 'hydro_pump', 'hydro_blast'],
    skillUnlocks: { tier2: 5, tier3: 10 },
    isLegendary: true,
  },
  zephyrion: {
    id: 'zephyrion', name: 'Zephyrion', element: 'storm', archetype: 'tank',
    emoji: '🦅', description: 'A storm-forged raptor that rides lightning itself. Nests above the clouds where air is thin and stays aloft for weeks. Its shadow passing makes flags change direction.',
    ...WILD_STAT_PRESET,
    skills: ['thunder_shock', 'thunderbolt', 'thunder_surge'],
    skillUnlocks: { tier2: 5, tier3: 10 },
    isLegendary: true,
  },
  nyxfang: {
    id: 'nyxfang', name: 'Nyxfang', element: 'shadow', archetype: 'tank',
    emoji: '🐺', description: 'A wolf woven from pure night, rarely ever seen. Its fur absorbs light, so at night it looks like a wolf-shaped hole in the dark. Its howl feels like pressure more than sound.',
    ...WILD_STAT_PRESET,
    skills: ['shadow_claw', 'dark_pulse', 'void_strike'],
    skillUnlocks: { tier2: 5, tier3: 10 },
    isLegendary: true,
  },
  aureon: {
    id: 'aureon', name: 'Aureon', element: 'light', archetype: 'tank',
    emoji: '🦄', description: 'A radiant beast said to bring fortune to its keeper. Its mane scatters light like golden dust. At dawn, the air around it glitters for minutes after it has already left.',
    ...WILD_STAT_PRESET,
    skills: ['flash', 'sacred_beam', 'divine_burst'],
    skillUnlocks: { tier2: 5, tier3: 10 },
    isLegendary: true,
  },
  emberpaw: {
    id: 'emberpaw', name: 'Emberpaw', element: 'fire', archetype: 'balanced',
    emoji: '🐾', description: 'Found near hearths and campfires. Leaves glowing pawprints that last hours. Superstitious travelers follow them at night, but Emberpaw just likes warm stones. It sneezes embers when nervous.',
    ...STAT_PRESETS.balanced,
    skills: ['ember', 'flamethrower', 'inferno_blast'],
    skillUnlocks: { tier2: 5, tier3: 10 },
  },
  magmarox: {
    id: 'magmarox', name: 'Magmarox', element: 'fire', archetype: 'tank',
    emoji: '🦏', description: 'A solitary magma rhino that lives in cooled lava fields. Its armor is volcanic rock it coats itself in for protection, then sheds when it gets too heavy. It bathes in ash, not water.',
    ...STAT_PRESETS.tank,
    skills: ['ember', 'flamethrower', 'inferno_blast'],
    skillUnlocks: { tier2: 5, tier3: 10 },
  },
  bubbloon: {
    id: 'bubbloon', name: 'Bubbloon', element: 'water', archetype: 'balanced',
    emoji: '🫧', description: 'A tidepool axolotl that stores fresh water in its cheek bubbles to survive low tide. It drifts with the current and inflates to look bigger. Its bubbles pop with a clean ping.',
    ...STAT_PRESETS.balanced,
    skills: ['water_gun', 'hydro_pump', 'hydro_blast'],
    skillUnlocks: { tier2: 5, tier3: 10 },
  },
  coralune: {
    id: 'coralune', name: 'Coralune', element: 'water', archetype: 'balanced',
    emoji: '🪸', description: 'A shy reef seahorse that grows a small living coral crown. The coral’s health reflects the water’s. Coralune hums to keep the polyps calm. If water turns sour, it leaves.',
    ...STAT_PRESETS.balanced,
    skills: ['water_gun', 'hydro_pump', 'hydro_blast'],
    skillUnlocks: { tier2: 5, tier3: 10 },
  },
  luminibee: {
    id: 'luminibee', name: 'Luminibee', element: 'light', archetype: 'balanced',
    emoji: '🐝', description: 'A nocturnal bee whose abdomen hardens into a lantern of solid light. It uses it to lure moths and to signal other Luminibee across meadows. The light never goes out, even after death.',
    ...STAT_PRESETS.balanced,
    skills: ['flash', 'sacred_beam', 'divine_burst'],
    skillUnlocks: { tier2: 5, tier3: 10 },
  },
  solaraffe: {
    id: 'solaraffe', name: 'Solaraffe', element: 'light', archetype: 'tank',
    emoji: '🦒', description: 'A savanna giraffe with sun-like spots that hold heat through the night. It stands still for hours absorbing light, then releases it slowly to warm the grass around it in winter.',
    ...STAT_PRESETS.tank,
    skills: ['flash', 'sacred_beam', 'divine_burst'],
    skillUnlocks: { tier2: 5, tier3: 10 },
  },
  zapkit: {
    id: 'zapkit', name: 'Zapkit', element: 'storm', archetype: 'glass_cannon',
    emoji: '🐱', description: 'A mountain kitten whose fur generates static. Before a storm, its fur stands straight up and crackles. It hunts by zapping insects out of the air.',
    ...STAT_PRESETS.glass_cannon,
    skills: ['thunder_shock', 'thunderbolt', 'thunder_surge'],
    skillUnlocks: { tier2: 5, tier3: 10 },
  },
  thundrake: {
    id: 'thundrake', name: 'Thundrake', element: 'storm', archetype: 'tank',
    emoji: '🐉', description: 'A serpentine dragon that lives inside storm clouds. It doesn’t create thunder — it lives where thunder already is, because the vibrations help it shed old cloud-scales. Often mistaken for distant thunder.',
    ...STAT_PRESETS.tank,
    skills: ['thunder_shock', 'thunderbolt', 'thunder_surge'],
    skillUnlocks: { tier2: 5, tier3: 10 },
  },
  gloombat: {
    id: 'gloombat', name: 'Gloombat', element: 'shadow', archetype: 'glass_cannon',
    emoji: '🦇', description: 'A small bat that roosts in abandoned attics and caves. Its large ears absorb sound, so it hears whispers from far rooms. It is active only when the moon is thin.',
    ...STAT_PRESETS.glass_cannon,
    skills: ['shadow_claw', 'dark_pulse', 'void_strike'],
    skillUnlocks: { tier2: 5, tier3: 10 },
  },
  umbraven: {
    id: 'umbraven', name: 'Umbraven', element: 'shadow', archetype: 'balanced',
    emoji: '🐦‍⬛', description: 'A forest raven whose feathers have a soft ink-like edge that blurs in dim light. It is hard to photograph because cameras can’t focus on it. It collects shiny black stones.',
    ...STAT_PRESETS.balanced,
    skills: ['shadow_claw', 'dark_pulse', 'void_strike'],
    skillUnlocks: { tier2: 5, tier3: 10 },
  },
  sproutle: {
    id: 'sproutle', name: 'Sproutle', element: 'leaf', archetype: 'balanced',
    emoji: '🦌', description: 'A fawn that sprouts a single seed on its head at birth. The sprout grows based on soil and mood, but never roots. Sproutle eat morning dew off their own leaves.',
    ...STAT_PRESETS.balanced,
    skills: ['vine_whip', 'razor_leaf', 'solar_beam'],
    skillUnlocks: { tier2: 5, tier3: 10 },
  },
  brambleon: {
    id: 'brambleon', name: 'Brambleon', element: 'leaf', archetype: 'tank',
    emoji: '🦁', description: 'A lowland lion with a mane of thick leaves and vines. The leaves change color with the season, but never fall out completely. It marks territory by tangling vines into knots.',
    ...STAT_PRESETS.tank,
    skills: ['vine_whip', 'razor_leaf', 'solar_beam'],
    skillUnlocks: { tier2: 5, tier3: 10 },
  },
};

// Legendary wild species are weighted well below the regular wild pool, so
// a legendary encounter feels like a real, rare event rather than one of
// eleven equally-likely species. A legendary starts ~10x rarer per-species
// than a regular wild monster (common weight 10 vs legendary base weight 1).
const WILD_RARITY_WEIGHT = { common: 10, legendaryBase: 1 } as const;
// Each legendary species already in the player's collection makes every
// remaining legendary harder to stumble into — weight decays multiplicatively
// per owned legendary, floored so the last one stays possible, just rare.
const LEGENDARY_WEIGHT_DECAY_PER_OWNED = 0.6;
const LEGENDARY_MIN_WEIGHT = 0.05;

// Picks a random wild-only monster id, biased away from legendaries per
// WILD_RARITY_WEIGHT, with legendary odds falling further as
// ownedLegendaryCount (distinct legendary species already in the player's
// collection) grows — the closer to a full legendary set, the rarer the next one.
export function pickRandomWildMonsterId(ownedLegendaryCount = 0): string {
  const legendaryWeight = Math.max(
    LEGENDARY_MIN_WEIGHT,
    WILD_RARITY_WEIGHT.legendaryBase * Math.pow(LEGENDARY_WEIGHT_DECAY_PER_OWNED, ownedLegendaryCount)
  );
  const entries = Object.values(WILD_MONSTERS);
  const totalWeight = entries.reduce(
    (sum, m) => sum + (m.isLegendary ? legendaryWeight : WILD_RARITY_WEIGHT.common), 0
  );
  let roll = Math.random() * totalWeight;
  for (const m of entries) {
    const weight = m.isLegendary ? legendaryWeight : WILD_RARITY_WEIGHT.common;
    if (roll < weight) return m.id;
    roll -= weight;
  }
  return entries[entries.length - 1].id; // unreachable in practice
}

// ─── WILD ENCOUNTER CHANCE ──────────────────────────────────────────────────
// Base odds are tuned so a player at ~1hr/day of active map play sees roughly
// 3 wild encounters per week (~7 hrs x ~120 answered questions/hr ≈ 840
// answers/week → 3/840 ≈ 0.36%, rounded to 0.5% for a rounder in-game feel).
// Defeating NPC trainers gradually raises this — more trainers beaten makes
// the player visibly better at finding wild monsters, capped once every
// trainer is down (3x the base rate, same ratio as before this retune).
const WILD_ENCOUNTER_BASE_CHANCE = 0.005;
const WILD_ENCOUNTER_CHANCE_PER_TRAINER_DEFEATED = 0.00125;

// Chance (0-1) that any single answered question triggers a wild encounter
// roll, given how many distinct NPC trainers the player has defeated so far.
export function getWildEncounterChance(defeatedTrainerCount: number): number {
  const cap = WILD_ENCOUNTER_BASE_CHANCE + NPC_TRAINERS.length * WILD_ENCOUNTER_CHANCE_PER_TRAINER_DEFEATED;
  const chance = WILD_ENCOUNTER_BASE_CHANCE + defeatedTrainerCount * WILD_ENCOUNTER_CHANCE_PER_TRAINER_DEFEATED;
  return Math.min(chance, cap);
}

// ─── GUILD COMPANION MONSTERS ────────────────────────────────────────────────
// One dedicated monster per Side Quest Guild, granted the first time that
// guild reaches level 5 (see ensureGuildMonsterGranted in lib/guildEngine.ts).
// Battles/EXP/skills work exactly like any other monster — only the tier1
// name/emoji here (top-level name/emoji fields) is what displays until the
// player's guild level crosses guildEvolution.tier2/tier3.level; see
// getGuildMonsterDisplay below.
export const GUILD_MONSTERS: Record<string, MonsterDef> = {
  lorekeeper_familiar: {
    id: 'lorekeeper_familiar', name: 'Scryvyn', element: 'light', archetype: 'tank',
    emoji: '📜', spriteId: 'scryvyn',
    description: 'The Scroll Wyrm — a tiny dragon made entirely of old study scrolls, with green self-rewriting runes and a hooded cloak fused from its first master\'s robe. It lives in libraries closed too long, eating forgotten footnotes and orbiting itself with floating scrolls of memory.',
    ...STAT_PRESETS.tank,
    skills: ['flash', 'sacred_beam', 'divine_burst'],
    skillUnlocks: { tier2: 5, tier3: 10 },
    guildEvolution: {
      guildKey: 'lorekeeper',
      tier2: { level: 10, name: 'Lexiwyrm', emoji: '📚', spriteId: 'lexiwyrm' },
      tier3: { level: 20, name: 'ChroniLex', emoji: '🌌', spriteId: 'chronilex', isLegendary: true },
    },
  },
  spellcaster_familiar: {
    id: 'spellcaster_familiar', name: 'Inkybble', element: 'shadow', archetype: 'glass_cannon',
    emoji: '🖋️', spriteId: 'inkybble',
    description: 'A tiny ink blot that spilled from an unfinished spell and learned to crawl. It hides in margins and erasures, feeding on crossed-out words and misspelled letters.',
    ...STAT_PRESETS.glass_cannon,
    skills: ['shadow_claw', 'dark_pulse', 'void_strike'],
    skillUnlocks: { tier2: 5, tier3: 10 },
    guildEvolution: {
      guildKey: 'spellcaster',
      tier2: { level: 10, name: 'Quillara', emoji: '🪶', spriteId: 'quillara' },
      tier3: { level: 20, name: 'Astrypta', emoji: '🌑', spriteId: 'astrypta', isLegendary: true },
    },
  },
  numberrealm_familiar: {
    id: 'numberrealm_familiar', name: 'Digitot', element: 'water', archetype: 'balanced',
    emoji: '🐠', description: 'A small fish whose scales are etched with tally marks. It counts its own bubbles as it swims.',
    ...STAT_PRESETS.balanced,
    skills: ['water_gun', 'hydro_pump', 'hydro_blast'],
    skillUnlocks: { tier2: 5, tier3: 10 },
    guildEvolution: {
      guildKey: 'number_realm',
      tier2: { level: 10, name: 'Sumray', emoji: '🐡' },
      tier3: { level: 20, name: 'Infinifin', emoji: '🐋' },
    },
  },
  logiclabyrinth_familiar: {
    id: 'logiclabyrinth_familiar', name: 'Puzzlet', element: 'shadow', archetype: 'tank',
    emoji: '🦉', description: 'A young owl whose feathers form shifting geometric patterns. It tilts its head at anything that doesn’t quite add up.',
    ...STAT_PRESETS.tank,
    skills: ['shadow_claw', 'dark_pulse', 'void_strike'],
    skillUnlocks: { tier2: 5, tier3: 10 },
    guildEvolution: {
      guildKey: 'logic_labyrinth',
      tier2: { level: 10, name: 'Mazehawk', emoji: '🦅' },
      tier3: { level: 20, name: 'Cipheryx', emoji: '🦢' },
    },
  },
  lexiconarena_familiar: {
    id: 'lexiconarena_familiar', name: 'Wordwisp', element: 'light', archetype: 'glass_cannon',
    emoji: '🐝', description: 'A tiny glowing bee that spells out letters in the air with its flight path before it vanishes.',
    ...STAT_PRESETS.glass_cannon,
    skills: ['flash', 'sacred_beam', 'divine_burst'],
    skillUnlocks: { tier2: 5, tier3: 10 },
    guildEvolution: {
      guildKey: 'lexicon_arena',
      tier2: { level: 10, name: 'Lexihawk', emoji: '🦜' },
      tier3: { level: 20, name: 'Thesauryx', emoji: '🦚' },
    },
  },
};

// Combined lookup for anywhere a monster id might be either a normal starter
// monster or a wild-only one (e.g. resolving an NpcTrainer's monsters, since a
// wild encounter is represented as a synthetic one-monster NpcTrainer).
export const ALL_MONSTERS: Record<string, MonsterDef> = { ...MONSTERS, ...WILD_MONSTERS, ...GUILD_MONSTERS };

// ─── NPC TRAINERS ────────────────────────────────────────────────────────────

export interface TrainerMonster {
  monsterId: string;
  level: number;
}

export interface NpcTrainer {
  id: string;
  name: string;
  element: Element | 'mixed';
  levelRequirement: number;
  monsters: TrainerMonster[];
  reward: { exp: number; gold: number };
  emoji: string;
  intro: string;
}

export const NPC_TRAINERS: NpcTrainer[] = [
  {
    id: 'forest_scout', name: 'Forest Scout', element: 'leaf', levelRequirement: 1,
    emoji: '🌿', intro: 'The forest protects its own. Can you survive its embrace?',
    monsters: [
      { monsterId: 'mosshorn', level: 2 },
      { monsterId: 'fernix',   level: 3 },
    ],
    reward: { exp: 50, gold: 20 },
  },
  {
    id: 'tide_watcher', name: 'Tide Watcher', element: 'water', levelRequirement: 5,
    emoji: '🌊', intro: 'The sea is patient. Let\'s see if you are.',
    monsters: [
      { monsterId: 'coralyn',  level: 5 },
      { monsterId: 'torrenth', level: 6 },
    ],
    reward: { exp: 75, gold: 30 },
  },
  {
    id: 'ember_acolyte', name: 'Ember Acolyte', element: 'fire', levelRequirement: 7,
    emoji: '🔥', intro: 'Fire consumes the weak. Prove you are not.',
    monsters: [
      { monsterId: 'embrak',  level: 7 },
      { monsterId: 'pyravex', level: 8 },
    ],
    reward: { exp: 100, gold: 40 },
  },
  {
    id: 'storm_caller', name: 'Storm Caller', element: 'storm', levelRequirement: 10,
    emoji: '⚡', intro: 'The storm answers to no one. Can you say the same?',
    monsters: [
      { monsterId: 'voltmane',  level: 10 },
      { monsterId: 'galestrik', level: 11 },
    ],
    reward: { exp: 125, gold: 50 },
  },
  {
    id: 'shadow_stalker', name: 'Shadow Stalker', element: 'shadow', levelRequirement: 13,
    emoji: '🌑', intro: 'You cannot fight what you cannot see.',
    monsters: [
      { monsterId: 'shadrak', level: 13 },
      { monsterId: 'duskral', level: 14 },
    ],
    reward: { exp: 150, gold: 60 },
  },
  {
    id: 'light_bearer', name: 'Light Bearer', element: 'light', levelRequirement: 16,
    emoji: '✨', intro: 'True strength shines from within.',
    monsters: [
      { monsterId: 'luminos', level: 16 },
      { monsterId: 'solarch', level: 17 },
    ],
    reward: { exp: 175, gold: 70 },
  },
  {
    id: 'elemental_knight', name: 'Elemental Knight', element: 'mixed', levelRequirement: 20,
    emoji: '⚔️', intro: 'I have mastered all elements. Have you?',
    monsters: [
      { monsterId: 'pyravex',  level: 20 },
      { monsterId: 'torrenth', level: 20 },
    ],
    reward: { exp: 200, gold: 100 },
  },
  {
    id: 'grand_master', name: 'The Grand Master', element: 'mixed', levelRequirement: 25,
    emoji: '👑', intro: 'Few reach this point. None have passed.',
    monsters: [
      { monsterId: 'solarch',   level: 25 },
      { monsterId: 'galestrik', level: 25 },
    ],
    reward: { exp: 300, gold: 150 },
  },
];

// ─── BATTLE CONSTANTS ────────────────────────────────────────────────────────

export const BATTLE_CONSTANTS = {
  MONSTER_EXP_PER_LEVEL:       100,
  MONSTER_EXP_PER_GRASS_ANSWER: 10,
  MONSTER_EXP_PER_BATTLE_WIN:   25,
  BURN_DAMAGE_PER_TURN:          5,
  CURSE_DAMAGE_REDUCTION:       0.5,
  CURSE_DURATION_TURNS:          2,
  NPC_DAMAGE_BY_TIER: { 1: 10, 2: 20, 3: 30 } as Record<1|2|3, number>,
  PLAYER_LEVEL_FOR_SLOT: { 1: 5, 2: 10, 3: 15 } as Record<1|2|3, number>,
  // +8%/level over the monster's level-1 base stats, so a Lv.25 monster (the
  // highest-level NPC trainer) hits roughly 2.9x as hard/tanky as a fresh catch.
  STAT_GROWTH_PER_LEVEL:      0.08,
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

export function getMonsterLevel(exp: number): number {
  return Math.floor(exp / BATTLE_CONSTANTS.MONSTER_EXP_PER_LEVEL) + 1;
}

export function getAvailableSkillTiers(monsterLevel: number, monsterDef: MonsterDef): (1|2|3)[] {
  const tiers: (1|2|3)[] = [1];
  if (monsterLevel >= monsterDef.skillUnlocks.tier2) tiers.push(2);
  if (monsterLevel >= monsterDef.skillUnlocks.tier3) tiers.push(3);
  return tiers;
}

// Which evolution tier a guild companion monster's *display* is at, based on
// the owning player's guild level (not monster level/exp). Regular monsters
// (no guildEvolution) are always tier 1.
export function getGuildMonsterTier(monsterDef: MonsterDef, guildLevel: number): 1 | 2 | 3 {
  const evo = monsterDef.guildEvolution;
  if (!evo) return 1;
  if (guildLevel >= evo.tier3.level) return 3;
  if (guildLevel >= evo.tier2.level) return 2;
  return 1;
}

// Returns a MonsterDef with name/emoji/spriteId/isLegendary swapped for a
// specific evolution tier of a guild companion — independent of any
// player's current guild level (unlike getGuildMonsterDisplay below), so
// the Compendium can render all 3 tiers as separate cards side by side.
// Stats/skills always stay the base species values regardless of tier.
export function getGuildMonsterTierDef(monsterDef: MonsterDef, tier: 1 | 2 | 3): MonsterDef {
  const evo = monsterDef.guildEvolution;
  if (!evo || tier === 1) return monsterDef;
  const t = tier === 2 ? evo.tier2 : evo.tier3;
  return {
    ...monsterDef,
    name: t.name,
    emoji: t.emoji,
    spriteId: t.spriteId ?? monsterDef.spriteId,
    isLegendary: t.isLegendary ?? monsterDef.isLegendary,
  };
}

// Resolves the name/emoji to actually display for a monster, given the
// owning player's level in that monster's linked guild (0 if unknown/n/a).
// Stats, skills, and EXP are unaffected by this — see getGuildMonsterTier.
export function getGuildMonsterDisplay(monsterDef: MonsterDef, guildLevel: number): { name: string; emoji: string; tier: 1 | 2 | 3; isLegendary?: boolean; spriteId?: string } {
  const tier = getGuildMonsterTier(monsterDef, guildLevel);
  const d = getGuildMonsterTierDef(monsterDef, tier);
  return { name: d.name, emoji: d.emoji, tier, isLegendary: d.isLegendary, spriteId: d.spriteId };
}

// Scales a monster's level-1 base stats up with its current level. Applied
// wherever a monster enters battle (both solo and live PVP) and wherever its
// effective stats are displayed, so a leveled-up monster is actually stronger
// rather than just having more skills available.
export function getScaledStats(monsterDef: MonsterDef, level: number): { hp: number; attack: number; defense: number; speed: number } {
  const growth = 1 + (level - 1) * BATTLE_CONSTANTS.STAT_GROWTH_PER_LEVEL;
  return {
    hp: Math.round(monsterDef.baseHp * growth),
    attack: Math.round(monsterDef.baseAttack * growth),
    defense: Math.round(monsterDef.baseDefense * growth),
    speed: Math.round(monsterDef.baseSpeed * growth),
  };
}

export function calculateDamage(
  skill: Skill,
  baseAttack: number,
  correctAnswers: number,
  totalQuestions: number,
  attackerElement: Element,
  defenderElement: Element,
  isBlessed: boolean,
  defenderDefense: number = 0,
): number {
  const ratio = correctAnswers / totalQuestions;
  if (ratio === 0) return 0;

  let damage = baseAttack * skill.baseDamageMultiplier;
  if (ratio < 1) damage *= 0.5; // partial correct = half damage
  damage *= getElementMultiplier(attackerElement, defenderElement);
  if (isBlessed) damage *= 2;
  // Diminishing-returns mitigation (100/(100+DEF)) rather than a flat
  // subtraction, so Defense stays useful at every level without ever being
  // able to reduce damage to exactly 0 regardless of how high it's scaled.
  damage *= 100 / (100 + defenderDefense);

  return Math.round(damage);
}

export function getUnlockedMonsterSlots(playerLevel: number): number {
  if (playerLevel >= 15) return 3;
  if (playerLevel >= 10) return 2;
  if (playerLevel >= 5)  return 1;
  return 0;
}
