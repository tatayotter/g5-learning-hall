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

// Small badge icon per element, rendered next to the element name wherever a
// monster's element is shown (Compendium, team roster, trainer list, etc).
export const ELEMENT_ICON_SRC: Record<Element, string> = {
  fire:   '/elements/elem_fire_100.webp',
  water:  '/elements/elem_water_100.webp',
  leaf:   '/elements/elem_leaf_100.webp',
  storm:  '/elements/elem_storm_100.webp',
  shadow: '/elements/elem_shadow_100.webp',
  light:  '/elements/elem_light_100.webp',
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

// A secondary mechanical effect a skill applies alongside (or instead of) its
// raw damage. `magnitude` is a decimal fraction (0.15 = 15%); negative values
// are a downside (e.g. Berserker's Edge trading away some Defense). `duration`
// is a turn count, 'battle' for rest-of-battle, or 'instant' for a one-time
// effect (heal/cleanse) applied the moment the skill lands.
export interface SkillEffect {
  kind: 'self_atk_up' | 'self_def_up' | 'self_speed_up' | 'enemy_atk_down' | 'enemy_def_down'
      | 'lifesteal' | 'accuracy_soften' | 'flat_heal' | 'cleanse';
  magnitude?: number;
  duration?: number | 'battle' | 'instant';
}

export interface Skill {
  id: string;
  name: string;
  element: Element | null; // null for element-agnostic "fighting skills"
  tier: 1 | 2 | 3;
  questionCount: 1 | 2 | 3;  // matches tier
  baseDamageMultiplier: number;
  description: string;
  // Present on the Vault-taught alt/universal skills and the legendary-only
  // skills; absent (defaults to 'base') on the original 18 species-kit skills
  // above so those don't need touching. See SkillEffect for what `effects`
  // entries do in battle. 'legendary' skills are never sold in the Vault —
  // see SCROLL_CATALOG in lib/skillScrolls.ts.
  category?: 'base' | 'alt' | 'universal' | 'legendary';
  effects?: SkillEffect[];
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

  // ─── LEGENDARY SKILLS ─── one per element, exclusive default tier3 move for
  // legendary monsters (wild-only legendaries, and guild companions whose
  // evolution reaches 'legendary' — see getGuildEnhancementLevel). 2.25x is a
  // modest step above every other skill's damage ceiling (base tier3 tops out
  // at 2.0x) — strictly the strongest kit in the game, but not by a swingy
  // margin. Never sold as a scroll (see skillId in lib/skillScrolls.ts) and
  // rejected server-side if taught directly (see learn_monster_skill RPC).
  legendary_fire:    { id: 'legendary_fire',    name: 'Solar Flare',      element: 'fire',   tier: 3, questionCount: 3, baseDamageMultiplier: 2.25, category: 'legendary', description: "A legendary wyrm's signature blast, hot enough to outburn any Inferno Blast." },
  legendary_water:   { id: 'legendary_water',   name: 'Maelstrom',        element: 'water',  tier: 3, questionCount: 3, baseDamageMultiplier: 2.25, category: 'legendary', description: 'A whirlpool with the force of a whole tide behind it.' },
  legendary_leaf:    { id: 'legendary_leaf',    name: 'World Bloom',      element: 'leaf',   tier: 3, questionCount: 3, baseDamageMultiplier: 2.25, category: 'legendary', description: 'Every root and vine in reach answers at once.' },
  legendary_storm:   { id: 'legendary_storm',   name: 'Tempest Fury',     element: 'storm',  tier: 3, questionCount: 3, baseDamageMultiplier: 2.25, category: 'legendary', description: 'A full storm front discharged in a single strike.' },
  legendary_shadow:  { id: 'legendary_shadow',  name: 'Oblivion Rend',    element: 'shadow', tier: 3, questionCount: 3, baseDamageMultiplier: 2.25, category: 'legendary', description: 'A tear straight through to the void beneath the dark.' },
  legendary_light:   { id: 'legendary_light',   name: 'Radiant Judgment', element: 'light',  tier: 3, questionCount: 3, baseDamageMultiplier: 2.25, category: 'legendary', description: 'A verdict of pure light no shadow survives.' },

  // ─── VAULT ALT SKILLS ─── one per tier per element, trading raw damage for
  // a themed secondary effect. Damage numbers are uniform across elements at
  // a given tier (0.85x/1.15x/1.45x); only the effect differs per element.

  // FIRE — self Attack Up
  fire_fang:     { id: 'fire_fang',     name: 'Fire Fang',     element: 'fire',   tier: 1, questionCount: 1, baseDamageMultiplier: 0.85, category: 'alt', description: 'A biting flame strike that fires up the striker.', effects: [{ kind: 'self_atk_up', magnitude: 0.10, duration: 1 }] },
  flame_wheel:   { id: 'flame_wheel',   name: 'Flame Wheel',   element: 'fire',   tier: 2, questionCount: 2, baseDamageMultiplier: 1.15, category: 'alt', description: 'Spins through flame, building momentum.',           effects: [{ kind: 'self_atk_up', magnitude: 0.15, duration: 2 }] },
  wildfire:      { id: 'wildfire',      name: 'Wildfire',      element: 'fire',   tier: 3, questionCount: 3, baseDamageMultiplier: 1.45, category: 'alt', description: 'Scorches the field, fueling every follow-up hit.', effects: [{ kind: 'self_atk_up', magnitude: 0.20, duration: 3 }] },

  // WATER — enemy Attack Down
  aqua_jet:      { id: 'aqua_jet',      name: 'Aqua Jet',      element: 'water',  tier: 1, questionCount: 1, baseDamageMultiplier: 0.85, category: 'alt', description: 'A rapid water dash that rattles the target.',      effects: [{ kind: 'enemy_atk_down', magnitude: 0.10, duration: 1 }] },
  whirlpool:     { id: 'whirlpool',     name: 'Whirlpool',     element: 'water',  tier: 2, questionCount: 2, baseDamageMultiplier: 1.15, category: 'alt', description: 'Traps the foe in a swirling current.',             effects: [{ kind: 'enemy_atk_down', magnitude: 0.15, duration: 2 }] },
  tidal_surge:   { id: 'tidal_surge',   name: 'Tidal Surge',   element: 'water',  tier: 3, questionCount: 3, baseDamageMultiplier: 1.45, category: 'alt', description: 'A crushing wave that saps the target\'s power.',   effects: [{ kind: 'enemy_atk_down', magnitude: 0.20, duration: 3 }] },

  // LEAF — self Lifesteal
  leech_vine:    { id: 'leech_vine',    name: 'Leech Vine',    element: 'leaf',   tier: 1, questionCount: 1, baseDamageMultiplier: 0.85, category: 'alt', description: 'Drains vitality with every strike.',               effects: [{ kind: 'lifesteal', magnitude: 0.15 }] },
  bramble_guard: { id: 'bramble_guard', name: 'Bramble Guard', element: 'leaf',   tier: 2, questionCount: 2, baseDamageMultiplier: 1.15, category: 'alt', description: 'Thorny vines that strike and mend.',                effects: [{ kind: 'lifesteal', magnitude: 0.20 }] },
  verdant_bloom: { id: 'verdant_bloom', name: 'Verdant Bloom', element: 'leaf',   tier: 3, questionCount: 3, baseDamageMultiplier: 1.45, category: 'alt', description: 'A blossoming burst that damages and restores.',     effects: [{ kind: 'lifesteal', magnitude: 0.25 }] },

  // STORM — self Speed Up
  static_spark:  { id: 'static_spark',  name: 'Static Spark',  element: 'storm',  tier: 1, questionCount: 1, baseDamageMultiplier: 0.85, category: 'alt', description: 'A jolt that quickens the striker\'s reflexes.',    effects: [{ kind: 'self_speed_up', magnitude: 0.15, duration: 1 }] },
  volt_charge:   { id: 'volt_charge',   name: 'Volt Charge',   element: 'storm',  tier: 2, questionCount: 2, baseDamageMultiplier: 1.15, category: 'alt', description: 'Charges the striker with crackling speed.',        effects: [{ kind: 'self_speed_up', magnitude: 0.20, duration: 2 }] },
  storm_surge:   { id: 'storm_surge',   name: 'Storm Surge',   element: 'storm',  tier: 3, questionCount: 3, baseDamageMultiplier: 1.45, category: 'alt', description: 'A raging tempest that quickens every step.',       effects: [{ kind: 'self_speed_up', magnitude: 0.25, duration: 3 }] },

  // SHADOW — enemy Defense Down
  shade_bite:    { id: 'shade_bite',    name: 'Shade Bite',    element: 'shadow', tier: 1, questionCount: 1, baseDamageMultiplier: 0.85, category: 'alt', description: 'A shadowy bite that cracks the target\'s guard.',  effects: [{ kind: 'enemy_def_down', magnitude: 0.10, duration: 1 }] },
  umbral_grasp:  { id: 'umbral_grasp',  name: 'Umbral Grasp',  element: 'shadow', tier: 2, questionCount: 2, baseDamageMultiplier: 1.15, category: 'alt', description: 'Dark tendrils that pry open the foe\'s defenses.', effects: [{ kind: 'enemy_def_down', magnitude: 0.15, duration: 2 }] },
  nightfall:     { id: 'nightfall',     name: 'Nightfall',     element: 'shadow', tier: 3, questionCount: 3, baseDamageMultiplier: 1.45, category: 'alt', description: 'Plunges the field into darkness, weakening its guard.', effects: [{ kind: 'enemy_def_down', magnitude: 0.20, duration: 3 }] },

  // LIGHT — self Defense Up
  piercing_ray:  { id: 'piercing_ray',  name: 'Piercing Ray',  element: 'light',  tier: 1, questionCount: 1, baseDamageMultiplier: 0.85, category: 'alt', description: 'A focused ray that steels the striker\'s resolve.', effects: [{ kind: 'self_def_up', magnitude: 0.10, duration: 1 }] },
  radiant_pulse: { id: 'radiant_pulse', name: 'Radiant Pulse', element: 'light',  tier: 2, questionCount: 2, baseDamageMultiplier: 1.15, category: 'alt', description: 'A radiant pulse that shields as it strikes.',      effects: [{ kind: 'self_def_up', magnitude: 0.15, duration: 2 }] },
  sunburst:      { id: 'sunburst',      name: 'Sunburst',      element: 'light',  tier: 3, questionCount: 3, baseDamageMultiplier: 1.45, category: 'alt', description: 'A radiant explosion that hardens the striker\'s guard.', effects: [{ kind: 'self_def_up', magnitude: 0.20, duration: 3 }] },

  // ─── UNIVERSAL FIGHTING SKILLS ─── element-agnostic, zero direct damage —
  // the entire tier budget goes into effect strength since they occupy a
  // slot that would otherwise be a damage move.
  focus_stance:     { id: 'focus_stance',     name: 'Focus Stance',     element: null, tier: 1, questionCount: 1, baseDamageMultiplier: 0, category: 'universal', description: 'Softens the sting of a partial-credit answer for a few turns.', effects: [{ kind: 'accuracy_soften', magnitude: 0.15, duration: 2 }] },
  quick_step:       { id: 'quick_step',       name: 'Quick Step',       element: null, tier: 1, questionCount: 1, baseDamageMultiplier: 0, category: 'universal', description: 'A burst of speed that helps you act first.',                    effects: [{ kind: 'self_speed_up', magnitude: 0.25, duration: 2 }] },
  guard_up:         { id: 'guard_up',         name: 'Guard Up',         element: null, tier: 1, questionCount: 1, baseDamageMultiplier: 0, category: 'universal', description: 'Braces for impact, cutting incoming damage.',                    effects: [{ kind: 'self_def_up', magnitude: 0.25, duration: 2 }] },
  intimidate:       { id: 'intimidate',       name: 'Intimidate',       element: null, tier: 2, questionCount: 2, baseDamageMultiplier: 0, category: 'universal', description: 'Rattles the foe, dulling their next attacks.',                   effects: [{ kind: 'enemy_atk_down', magnitude: 0.25, duration: 3 }] },
  guard_break:      { id: 'guard_break',      name: 'Guard Break',      element: null, tier: 2, questionCount: 2, baseDamageMultiplier: 0, category: 'universal', description: 'Cracks the foe\'s defenses wide open.',                          effects: [{ kind: 'enemy_def_down', magnitude: 0.25, duration: 3 }] },
  adrenaline_rush:  { id: 'adrenaline_rush',  name: 'Adrenaline Rush',  element: null, tier: 2, questionCount: 2, baseDamageMultiplier: 0, category: 'universal', description: 'A surge of speed and power.',                                    effects: [{ kind: 'self_speed_up', magnitude: 0.15, duration: 3 }, { kind: 'self_atk_up', magnitude: 0.15, duration: 3 }] },
  iron_resolve:     { id: 'iron_resolve',     name: 'Iron Resolve',     element: null, tier: 3, questionCount: 3, baseDamageMultiplier: 0, category: 'universal', description: 'Hardens your resolve for the rest of the battle.',              effects: [{ kind: 'self_def_up', magnitude: 0.35, duration: 'battle' }] },
  berserkers_edge:  { id: 'berserkers_edge',  name: "Berserker's Edge", element: null, tier: 3, questionCount: 3, baseDamageMultiplier: 0, category: 'universal', description: 'Trades safety for raw power, for the rest of the battle.',      effects: [{ kind: 'self_atk_up', magnitude: 0.40, duration: 'battle' }, { kind: 'self_def_up', magnitude: -0.20, duration: 'battle' }] },
  second_wind:      { id: 'second_wind',      name: 'Second Wind',      element: null, tier: 3, questionCount: 3, baseDamageMultiplier: 0, category: 'universal', description: 'Catch your breath, heal up, and shake off any status.',          effects: [{ kind: 'flat_heal', magnitude: 0.25, duration: 'instant' }, { kind: 'cleanse', duration: 'instant' }] },
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
    tier2: GuildEvolutionStage;
    tier3: GuildEvolutionStage;
  };
}

// description is optional — omitting it falls back to the base species'
// value. Stats are never authored by hand here: they're derived from the
// base species stats by GUILD_ENHANCEMENT_GROWTH, keyed off tier + isLegendary
// (see getGuildEnhancementLevel/getGuildMonsterTierDef below).
interface GuildEvolutionStage {
  level: number;
  name: string;
  emoji: string;
  spriteId?: string;
  isLegendary?: boolean;
  description?: string;
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
    skillUnlocks: { tier2: 18, tier3: 30 },
  },
  torrenth: {
    id: 'torrenth', name: 'Torrenth', element: 'water', archetype: 'tank',
    emoji: '🐢', description: 'An armored sea turtle with a crashing shell. Each ridge on its shell holds the echo of a wave. Can tuck in and become almost immovable, like a small island.',
    ...STAT_PRESETS.tank,
    skills: ['water_gun', 'hydro_pump', 'hydro_blast'],
    skillUnlocks: { tier2: 18, tier3: 30 },
  },
  voltmane: {
    id: 'voltmane', name: 'Voltmane', element: 'storm', archetype: 'glass_cannon',
    emoji: '⚡', description: 'A wild-maned beast crackling with static. Its mane stands straight up from its own charge. Runs in short, blinding bursts that leave the smell of rain.',
    ...STAT_PRESETS.glass_cannon,
    skills: ['thunder_shock', 'thunderbolt', 'thunder_surge'],
    skillUnlocks: { tier2: 18, tier3: 30 },
  },
  fernix: {
    id: 'fernix', name: 'Fernix', element: 'leaf', archetype: 'balanced',
    emoji: '🦅', description: 'A bird made entirely of woven leaves and vines. Its body rustles when it flies. If it loses a feather, a small green sprout appears where it lands.',
    ...STAT_PRESETS.balanced,
    skills: ['vine_whip', 'razor_leaf', 'solar_beam'],
    skillUnlocks: { tier2: 18, tier3: 30 },
  },
  solarch: {
    id: 'solarch', name: 'Solarch', element: 'light', archetype: 'tank',
    emoji: '🦁', description: 'A regal lion with a sun-disc mane. The disc floats just off its fur and glows like late morning. Wakes early and lies in the highest sun it can find.',
    ...STAT_PRESETS.tank,
    skills: ['flash', 'sacred_beam', 'divine_burst'],
    skillUnlocks: { tier2: 18, tier3: 30 },
  },
  pyravex: {
    id: 'pyravex', name: 'Pyravex', element: 'fire', archetype: 'glass_cannon',
    emoji: '🦊', description: 'A grumpy dinosaur-like monster with a blazing tail. The tail spins for balance when it runs. Its chest glows when it breathes in, dimming when it exhales.',
    ...STAT_PRESETS.glass_cannon,
    skills: ['ember', 'flamethrower', 'inferno_blast'],
    skillUnlocks: { tier2: 18, tier3: 30 },
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
    skillUnlocks: { tier2: 18, tier3: 30 },
  },
  coralyn: {
    id: 'coralyn', name: 'Coralyn', element: 'water', archetype: 'balanced',
    emoji: '🌊', description: 'An elegant coral-horned seahorse. Her branching coral horns filter water and house tiny shrimp. She drifts slowly and guards one patch of reef fiercely.',
    ...STAT_PRESETS.balanced,
    skills: ['water_gun', 'hydro_pump', 'hydro_blast'],
    skillUnlocks: { tier2: 18, tier3: 30 },
  },
  mosshorn: {
    id: 'mosshorn', name: 'Mosshorn', element: 'leaf', archetype: 'tank',
    emoji: '🦌', description: 'A gentle deer with a mossy antler crown. The moss on its antlers holds rainwater and tiny ferns. Sheds its antlers each year, leaving a small mossy hill behind.',
    ...STAT_PRESETS.tank,
    skills: ['vine_whip', 'razor_leaf', 'solar_beam'],
    skillUnlocks: { tier2: 18, tier3: 30 },
  },
  galestrik: {
    id: 'galestrik', name: 'Galestrik', element: 'storm', archetype: 'glass_cannon',
    emoji: '🦅', description: 'A hawk that rides and generates thunderclouds. It surfs wind currents without flapping and drags lightning behind its wingtips when it dives.',
    ...STAT_PRESETS.glass_cannon,
    skills: ['thunder_shock', 'thunderbolt', 'thunder_surge'],
    skillUnlocks: { tier2: 18, tier3: 30 },
  },
  duskral: {
    id: 'duskral', name: 'Duskral', element: 'shadow', archetype: 'glass_cannon',
    emoji: '🐈‍⬛', description: 'A sleek panther that melts into darkness. In low light its outline softens until only its eyes and crescent chest mark remain. Hunts at the edge of lamplight.',
    ...STAT_PRESETS.glass_cannon,
    skills: ['shadow_claw', 'dark_pulse', 'void_strike'],
    skillUnlocks: { tier2: 18, tier3: 30 },
  },
  luminos: {
    id: 'luminos', name: 'Luminos', element: 'light', archetype: 'balanced',
    emoji: '🦊', description: 'A small glowing fox with a radiant tail. Its tail works like a lantern that dims and brightens with its breathing. Leaves faint light pawprints that fade by morning.',
    ...STAT_PRESETS.balanced,
    skills: ['flash', 'sacred_beam', 'divine_burst'],
    skillUnlocks: { tier2: 18, tier3: 30 },
  },
  emberwyrm: {
    id: 'emberwyrm', name: 'Emberwyrm', element: 'fire', archetype: 'tank',
    emoji: '🐉', description: 'A legendary wyrm wreathed in slow, eternal flame. Sleeps coiled around dormant volcanoes. Its flame moves so slowly you can watch it crawl across its scales over days.',
    ...WILD_STAT_PRESET,
    skills: ['ember', 'flamethrower', 'legendary_fire'],
    skillUnlocks: { tier2: 18, tier3: 30 },
    isLegendary: true,
  },
  tidalynx: {
    id: 'tidalynx', name: 'Tidalynx', element: 'water', archetype: 'tank',
    emoji: '🐋', description: 'A serene leviathan said to command the deep tides. Lives along untouched coasts. Where it steps, water pulls back, leaving its pawprints filled with clear tide.',
    ...WILD_STAT_PRESET,
    skills: ['water_gun', 'hydro_pump', 'legendary_water'],
    skillUnlocks: { tier2: 18, tier3: 30 },
    isLegendary: true,
  },
  zephyrion: {
    id: 'zephyrion', name: 'Zephyrion', element: 'storm', archetype: 'tank',
    emoji: '🦅', description: 'A storm-forged raptor that rides lightning itself. Nests above the clouds where air is thin and stays aloft for weeks. Its shadow passing makes flags change direction.',
    ...WILD_STAT_PRESET,
    skills: ['thunder_shock', 'thunderbolt', 'legendary_storm'],
    skillUnlocks: { tier2: 18, tier3: 30 },
    isLegendary: true,
  },
  nyxfang: {
    id: 'nyxfang', name: 'Nyxfang', element: 'shadow', archetype: 'tank',
    emoji: '🐺', description: 'A wolf woven from pure night, rarely ever seen. Its fur absorbs light, so at night it looks like a wolf-shaped hole in the dark. Its howl feels like pressure more than sound.',
    ...WILD_STAT_PRESET,
    skills: ['shadow_claw', 'dark_pulse', 'legendary_shadow'],
    skillUnlocks: { tier2: 18, tier3: 30 },
    isLegendary: true,
  },
  aureon: {
    id: 'aureon', name: 'Aureon', element: 'light', archetype: 'tank',
    emoji: '🦄', description: 'A radiant beast said to bring fortune to its keeper. Its mane scatters light like golden dust. At dawn, the air around it glitters for minutes after it has already left.',
    ...WILD_STAT_PRESET,
    skills: ['flash', 'sacred_beam', 'legendary_light'],
    skillUnlocks: { tier2: 18, tier3: 30 },
    isLegendary: true,
  },
  emberpaw: {
    id: 'emberpaw', name: 'Emberpaw', element: 'fire', archetype: 'balanced',
    emoji: '🐾', description: 'Found near hearths and campfires. Leaves glowing pawprints that last hours. Superstitious travelers follow them at night, but Emberpaw just likes warm stones. It sneezes embers when nervous.',
    ...STAT_PRESETS.balanced,
    skills: ['ember', 'flamethrower', 'inferno_blast'],
    skillUnlocks: { tier2: 18, tier3: 30 },
  },
  magmarox: {
    id: 'magmarox', name: 'Magmarox', element: 'fire', archetype: 'tank',
    emoji: '🦏', description: 'A solitary magma rhino that lives in cooled lava fields. Its armor is volcanic rock it coats itself in for protection, then sheds when it gets too heavy. It bathes in ash, not water.',
    ...STAT_PRESETS.tank,
    skills: ['ember', 'flamethrower', 'inferno_blast'],
    skillUnlocks: { tier2: 18, tier3: 30 },
  },
  bubbloon: {
    id: 'bubbloon', name: 'Bubbloon', element: 'water', archetype: 'balanced',
    emoji: '🫧', description: 'A tidepool axolotl that stores fresh water in its cheek bubbles to survive low tide. It drifts with the current and inflates to look bigger. Its bubbles pop with a clean ping.',
    ...STAT_PRESETS.balanced,
    skills: ['water_gun', 'hydro_pump', 'hydro_blast'],
    skillUnlocks: { tier2: 18, tier3: 30 },
  },
  coralune: {
    id: 'coralune', name: 'Coralune', element: 'water', archetype: 'balanced',
    emoji: '🪸', description: 'A shy reef seahorse that grows a small living coral crown. The coral’s health reflects the water’s. Coralune hums to keep the polyps calm. If water turns sour, it leaves.',
    ...STAT_PRESETS.balanced,
    skills: ['water_gun', 'hydro_pump', 'hydro_blast'],
    skillUnlocks: { tier2: 18, tier3: 30 },
  },
  luminibee: {
    id: 'luminibee', name: 'Luminibee', element: 'light', archetype: 'balanced',
    emoji: '🐝', description: 'A nocturnal bee whose abdomen hardens into a lantern of solid light. It uses it to lure moths and to signal other Luminibee across meadows. The light never goes out, even after death.',
    ...STAT_PRESETS.balanced,
    skills: ['flash', 'sacred_beam', 'divine_burst'],
    skillUnlocks: { tier2: 18, tier3: 30 },
  },
  solaraffe: {
    id: 'solaraffe', name: 'Solaraffe', element: 'light', archetype: 'tank',
    emoji: '🦒', description: 'A savanna giraffe with sun-like spots that hold heat through the night. It stands still for hours absorbing light, then releases it slowly to warm the grass around it in winter.',
    ...STAT_PRESETS.tank,
    skills: ['flash', 'sacred_beam', 'divine_burst'],
    skillUnlocks: { tier2: 18, tier3: 30 },
  },
  zapkit: {
    id: 'zapkit', name: 'Zapkit', element: 'storm', archetype: 'glass_cannon',
    emoji: '🐱', description: 'A mountain kitten whose fur generates static. Before a storm, its fur stands straight up and crackles. It hunts by zapping insects out of the air.',
    ...STAT_PRESETS.glass_cannon,
    skills: ['thunder_shock', 'thunderbolt', 'thunder_surge'],
    skillUnlocks: { tier2: 18, tier3: 30 },
  },
  thundrake: {
    id: 'thundrake', name: 'Thundrake', element: 'storm', archetype: 'tank',
    emoji: '🐉', description: 'A serpentine dragon that lives inside storm clouds. It doesn’t create thunder — it lives where thunder already is, because the vibrations help it shed old cloud-scales. Often mistaken for distant thunder.',
    ...STAT_PRESETS.tank,
    skills: ['thunder_shock', 'thunderbolt', 'thunder_surge'],
    skillUnlocks: { tier2: 18, tier3: 30 },
  },
  gloombat: {
    id: 'gloombat', name: 'Gloombat', element: 'shadow', archetype: 'glass_cannon',
    emoji: '🦇', description: 'A small bat that roosts in abandoned attics and caves. Its large ears absorb sound, so it hears whispers from far rooms. It is active only when the moon is thin.',
    ...STAT_PRESETS.glass_cannon,
    skills: ['shadow_claw', 'dark_pulse', 'void_strike'],
    skillUnlocks: { tier2: 18, tier3: 30 },
  },
  umbraven: {
    id: 'umbraven', name: 'Umbraven', element: 'shadow', archetype: 'balanced',
    emoji: '🐦‍⬛', description: 'A forest raven whose feathers have a soft ink-like edge that blurs in dim light. It is hard to photograph because cameras can’t focus on it. It collects shiny black stones.',
    ...STAT_PRESETS.balanced,
    skills: ['shadow_claw', 'dark_pulse', 'void_strike'],
    skillUnlocks: { tier2: 18, tier3: 30 },
  },
  sproutle: {
    id: 'sproutle', name: 'Sproutle', element: 'leaf', archetype: 'balanced',
    emoji: '🦌', description: 'A fawn that sprouts a single seed on its head at birth. The sprout grows based on soil and mood, but never roots. Sproutle eat morning dew off their own leaves.',
    ...STAT_PRESETS.balanced,
    skills: ['vine_whip', 'razor_leaf', 'solar_beam'],
    skillUnlocks: { tier2: 18, tier3: 30 },
  },
  brambleon: {
    id: 'brambleon', name: 'Brambleon', element: 'leaf', archetype: 'tank',
    emoji: '🦁', description: 'A lowland lion with a mane of thick leaves and vines. The leaves change color with the season, but never fall out completely. It marks territory by tangling vines into knots.',
    ...STAT_PRESETS.tank,
    skills: ['vine_whip', 'razor_leaf', 'solar_beam'],
    skillUnlocks: { tier2: 18, tier3: 30 },
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

// ─── WILD ENCOUNTER PITY TIMER ──────────────────────────────────────────────
// Early-game safety net so a player who hasn't caught much yet isn't left to
// the raw ~0.5-1.5% roll above. Once unlocked (2+ NPC trainers defeated), a
// wild encounter is forced after this many correctly-answered grass questions
// go by without one occurring naturally. Resets to standard-odds-only once
// the player owns 5+ monsters (team + box combined).
const WILD_ENCOUNTER_PITY_THRESHOLDS: Record<number, number> = {
  1: 10,
  2: 30,
  3: 50,
  4: 100,
};

// Number of correctly-answered questions after which an encounter should be
// forced, given the player's total owned monster count — or null if the
// player has 5+ monsters and should rely on getWildEncounterChance alone.
export function getWildEncounterPityThreshold(totalMonstersOwned: number): number | null {
  return WILD_ENCOUNTER_PITY_THRESHOLDS[totalMonstersOwned] ?? null;
}

// ─── GUILD COMPANION MONSTERS ────────────────────────────────────────────────
// One dedicated monster per Side Quest Guild, granted the first time that
// guild reaches level 5 (see ensureGuildMonsterGranted in lib/guildEngine.ts).
// Skills/skillUnlocks/EXP work exactly like any other monster and never
// change. The tier1 fields above (name/emoji/description/base stats) are
// what's active until the player's guild level crosses
// guildEvolution.tier2/tier3.level, at which point that stage's own
// name/emoji/description take over and stats scale up per
// GUILD_ENHANCEMENT_GROWTH (tier2 'enhanced', tier3 'super_enhanced', or
// 'legendary' — the top tier — if that stage sets isLegendary, regardless of
// whether it's reached at tier2 or tier3). See getGuildMonsterDisplay below.
export const GUILD_MONSTERS: Record<string, MonsterDef> = {
  lorekeeper_familiar: {
    id: 'lorekeeper_familiar', name: 'Scryvyn', element: 'leaf', archetype: 'tank',
    emoji: '📜', spriteId: 'scryvyn',
    description: 'The Scroll Wyrm — a tiny dragon made entirely of old study scrolls, with green self-rewriting runes and a hooded cloak fused from its first master\'s robe. It lives in libraries closed too long, eating forgotten footnotes and orbiting itself with floating scrolls of memory.',
    ...STAT_PRESETS.tank,
    skills: ['vine_whip', 'razor_leaf', 'solar_beam'],
    skillUnlocks: { tier2: 18, tier3: 30 },
    guildEvolution: {
      guildKey: 'lorekeeper',
      tier2: {
        level: 10, name: 'Lexiwyrm', emoji: '📚', spriteId: 'lexiwyrm',
        description: 'The scrolls have bound themselves into a spine of pages that never quite closes. It reads its own margins aloud in a voice like turning paper, filing away everything its keeper has learned.',
      },
      tier3: {
        level: 20, name: 'ChroniLex', emoji: '🌌', spriteId: 'chronilex', isLegendary: true,
        description: 'A living archive that has outgrown its shelf and started keeping the library instead. Its runes now trail off into the space between stars, cataloguing knowledge no one has asked for yet.',
      },
    },
  },
  spellcaster_familiar: {
    id: 'spellcaster_familiar', name: 'Inkybble', element: 'shadow', archetype: 'glass_cannon',
    emoji: '🖋️', spriteId: 'inkybble',
    description: 'A tiny ink blot that spilled from an unfinished spell and learned to crawl. It hides in margins and erasures, feeding on crossed-out words and misspelled letters.',
    ...STAT_PRESETS.glass_cannon,
    skills: ['shadow_claw', 'dark_pulse', 'void_strike'],
    skillUnlocks: { tier2: 18, tier3: 30 },
    guildEvolution: {
      guildKey: 'spellcaster',
      tier2: {
        level: 10, name: 'Quillara', emoji: '🪶', spriteId: 'quillara',
        description: 'The ink has grown a spine of quills that write faster than thought. It leaves perfect sentences in its wake, correcting typos it hasn\'t even seen yet.',
      },
      tier3: {
        level: 20, name: 'Astrypta', emoji: '🌑', spriteId: 'astrypta', isLegendary: true,
        description: 'A constellation of ink and eclipse, spelling out incantations no spellbook has printed. Where it drifts, unfinished spells finish themselves.',
      },
    },
  },
  numberrealm_familiar: {
    id: 'numberrealm_familiar', name: 'Digitot', element: 'water', archetype: 'balanced',
    emoji: '🐠', spriteId: 'digitot',
    description: 'A small fish whose scales are etched with tally marks. It counts its own bubbles as it swims.',
    ...STAT_PRESETS.balanced,
    skills: ['water_gun', 'hydro_pump', 'hydro_blast'],
    skillUnlocks: { tier2: 18, tier3: 30 },
    guildEvolution: {
      guildKey: 'number_realm',
      tier2: {
        level: 10, name: 'Sumray', emoji: '🐡', spriteId: 'sumray',
        description: 'Its tally-mark scales have multiplied into a puffed-up ledger of sums, bristling whenever a calculation comes up short.',
      },
      tier3: {
        level: 20, name: 'Infinifin', emoji: '🐋', spriteId: 'infinifin', isLegendary: true,
        description: 'A leviathan built from every number it has ever counted, so vast that some digits are still catching up to its tail.',
      },
    },
  },
  logiclabyrinth_familiar: {
    id: 'logiclabyrinth_familiar', name: 'Quizzicube', element: 'storm', archetype: 'tank',
    emoji: '🧊', spriteId: 'quizzicube',
    description: 'A small cube built from shifting question-mark panels, each face humming with a different riddle. It rolls in place when stumped, waiting for the right answer to click it into shape.',
    ...STAT_PRESETS.tank,
    skills: ['thunder_shock', 'thunderbolt', 'thunder_surge'],
    skillUnlocks: { tier2: 18, tier3: 30 },
    guildEvolution: {
      guildKey: 'logic_labyrinth',
      tier2: {
        level: 10, name: 'Labrynthox', emoji: '🌀', spriteId: 'labrynthox',
        description: 'The cube has unfolded into a maze-backed beast, corridors running the length of its shell. Wrong turns echo through its body until the right path lights up on its own.',
      },
      tier3: {
        level: 20, name: 'Infinitaze', emoji: '♾️', spriteId: 'infinitaze', isLegendary: true,
        description: 'A labyrinth given form, its passages looping back through themselves without end. It doesn\'t solve puzzles anymore — it simply becomes the answer, and lets you catch up.',
      },
    },
  },
  lexiconarena_familiar: {
    id: 'lexiconarena_familiar', name: 'Pollyglyph', element: 'light', archetype: 'glass_cannon',
    emoji: '🦜', spriteId: 'pollyglyph',
    description: 'A fledgling parrot that mimics every word it hears until each one sprouts a tiny glowing glyph on its feathers.',
    ...STAT_PRESETS.glass_cannon,
    skills: ['flash', 'sacred_beam', 'divine_burst'],
    skillUnlocks: { tier2: 18, tier3: 30 },
    guildEvolution: {
      guildKey: 'lexicon_arena',
      tier2: {
        level: 10, name: 'Squawkolar', emoji: '🦉', spriteId: 'squawkolar',
        description: 'It has traded mimicry for mastery, footnoting its own squawks with etymology no one asked for.',
      },
      tier3: {
        level: 20, name: 'Admiral Psquawk', emoji: '🦅', spriteId: 'admiral_psquawk', isLegendary: true,
        description: 'A decorated commander of every word ever spoken, barking corrections from a crow\'s nest built out of dictionaries.',
      },
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

// Monster levels below are calibrated off real monster_level progress across
// the 4 active players rather than off levelRequirement (a separate player-
// level gate): after ~1-2 weeks of play, levels ranged from 2 (a player just
// starting out) up through 9, 14, and 42 (a heavy grinder) — see git history
// around 2026-07-20 for the actual reference numbers. Each trainer now fields
// 3 monsters (was 2) for a longer, more attritional fight, with levels ramped
// gradually so the curve tracks a normally-active player's real pace instead
// of jumping straight to the levelRequirement number. The Grand Master tops
// out around 29 — a real capstone for a dedicated player, without requiring
// the outlier-grinder pace to ever be reachable.
export const NPC_TRAINERS: NpcTrainer[] = [
  {
    id: 'forest_scout', name: 'Forest Scout', element: 'leaf', levelRequirement: 1,
    emoji: '🌿', intro: 'The forest protects its own. Can you survive its embrace?',
    monsters: [
      { monsterId: 'mosshorn', level: 2 },
      { monsterId: 'fernix',   level: 3 },
      { monsterId: 'sproutle', level: 4 },
    ],
    reward: { exp: 50, gold: 20 },
  },
  {
    id: 'tide_watcher', name: 'Tide Watcher', element: 'water', levelRequirement: 5,
    emoji: '🌊', intro: 'The sea is patient. Let\'s see if you are.',
    monsters: [
      { monsterId: 'coralyn',  level: 6 },
      { monsterId: 'torrenth', level: 7 },
      { monsterId: 'bubbloon', level: 8 },
    ],
    reward: { exp: 75, gold: 30 },
  },
  {
    id: 'ember_acolyte', name: 'Ember Acolyte', element: 'fire', levelRequirement: 7,
    emoji: '🔥', intro: 'Fire consumes the weak. Prove you are not.',
    monsters: [
      { monsterId: 'embrak',   level: 9 },
      { monsterId: 'pyravex',  level: 10 },
      { monsterId: 'emberpaw', level: 11 },
    ],
    reward: { exp: 100, gold: 40 },
  },
  {
    id: 'storm_caller', name: 'Storm Caller', element: 'storm', levelRequirement: 10,
    emoji: '⚡', intro: 'The storm answers to no one. Can you say the same?',
    monsters: [
      { monsterId: 'voltmane',  level: 12 },
      { monsterId: 'galestrik', level: 13 },
      { monsterId: 'zapkit',    level: 14 },
    ],
    reward: { exp: 125, gold: 50 },
  },
  {
    id: 'shadow_stalker', name: 'Shadow Stalker', element: 'shadow', levelRequirement: 13,
    emoji: '🌑', intro: 'You cannot fight what you cannot see.',
    monsters: [
      { monsterId: 'shadrak',  level: 15 },
      { monsterId: 'duskral',  level: 16 },
      { monsterId: 'gloombat', level: 17 },
    ],
    reward: { exp: 150, gold: 60 },
  },
  {
    id: 'light_bearer', name: 'Light Bearer', element: 'light', levelRequirement: 16,
    emoji: '✨', intro: 'True strength shines from within.',
    monsters: [
      { monsterId: 'luminos',   level: 18 },
      { monsterId: 'solarch',   level: 19 },
      { monsterId: 'luminibee', level: 20 },
    ],
    reward: { exp: 175, gold: 70 },
  },
  {
    id: 'elemental_knight', name: 'Elemental Knight', element: 'mixed', levelRequirement: 20,
    emoji: '⚔️', intro: 'I have mastered all elements. Have you?',
    monsters: [
      { monsterId: 'pyravex',  level: 21 },
      { monsterId: 'torrenth', level: 22 },
      { monsterId: 'voltmane', level: 23 },
    ],
    reward: { exp: 200, gold: 100 },
  },
  {
    id: 'grand_master', name: 'The Grand Master', element: 'mixed', levelRequirement: 25,
    emoji: '👑', intro: 'Few reach this point. None have passed.',
    monsters: [
      { monsterId: 'solarch',   level: 25 },
      { monsterId: 'galestrik', level: 27 },
      { monsterId: 'duskral',   level: 29 },
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

// Resolves a monster instance's actual 3 skill slots, layering its
// `equipped_skills` override (from the Vault learn/unlearn scrolls) on top of
// its species' default kit. Per slot: `null`/`undefined` = species default
// still active (free, never customized), `'EMPTY'` = unlearned and awaiting a
// scroll (no skill usable in that slot), anything else = the taught skill id.
// This is the single source of truth battle/UI code should read from instead
// of `monsterDef.skills` directly, since the latter ignores any customization.
export function getEquippedSkills(equippedSkills: (string | null)[] | null | undefined, monsterDef: MonsterDef): (Skill | null)[] {
  return [0, 1, 2].map(i => {
    const slot = equippedSkills?.[i];
    if (slot == null) return SKILLS[monsterDef.skills[i]] ?? null;
    if (slot === 'EMPTY') return null;
    return SKILLS[slot] ?? null;
  });
}

// ─── SKILL EFFECTS (alt/universal skills taught via Vault scrolls) ──────────
// A multi-turn buff/debuff a monster is currently carrying, stacked from
// `SkillEffect`s of kind self_atk_up/self_def_up/self_speed_up/enemy_atk_down/
// enemy_def_down/accuracy_soften. Only one modifier per `kind` is ever active
// at a time (a fresh one replaces the old, it doesn't stack additively) —
// mirrors how the existing potion-driven atk_boost/def_boost statuses work.
export interface ActiveModifier {
  kind: 'atk' | 'def' | 'speed' | 'accuracy';
  magnitude: number; // decimal fraction; negative = a downside
  turnsRemaining: number | 'battle';
}

// 1 + net magnitude for atk/def/speed (multiply straight into the stat), or
// the raw magnitude for 'accuracy' (added onto the 0.5 partial-credit floor).
export function getModifierMultiplier(modifiers: ActiveModifier[] | undefined, kind: ActiveModifier['kind']): number {
  const total = (modifiers ?? []).filter(m => m.kind === kind).reduce((sum, m) => sum + m.magnitude, 0);
  return kind === 'accuracy' ? total : 1 + total;
}

// Called once per turn end for each monster still carrying modifiers —
// decrements turn-limited ones and drops any that just expired. 'battle'
// duration modifiers (Iron Resolve, Berserker's Edge) never tick down.
export function tickModifiers(modifiers: ActiveModifier[] | undefined): ActiveModifier[] {
  return (modifiers ?? [])
    .map(m => (m.turnsRemaining === 'battle' ? m : { ...m, turnsRemaining: m.turnsRemaining - 1 }))
    .filter(m => m.turnsRemaining === 'battle' || m.turnsRemaining > 0);
}

export interface SkillEffectResult {
  casterModifiers: ActiveModifier[];
  targetModifiers: ActiveModifier[];
  casterHpDelta: number; // lifesteal/flat_heal — added to caster's currentHp
  cleanseCaster: boolean;
  logMessages: string[];
}

// Applies one skill's `effects` (Phase B — alt/universal skills only; base
// species skills have no `effects` and this is a no-op for them) to the
// caster's and target's modifier stacks. Shared by both battle screens so the
// two turn engines can't drift on what a given effect actually does.
export function applySkillEffects(
  skill: Skill,
  damageDealt: number,
  casterMaxHp: number,
  casterModifiers: ActiveModifier[] | undefined,
  targetModifiers: ActiveModifier[] | undefined,
): SkillEffectResult {
  let nextCaster = [...(casterModifiers ?? [])];
  let nextTarget = [...(targetModifiers ?? [])];
  let hpDelta = 0;
  let cleanse = false;
  const logs: string[] = [];

  const setCaster = (kind: ActiveModifier['kind'], magnitude: number, duration: SkillEffect['duration']) => {
    nextCaster = nextCaster.filter(m => m.kind !== kind);
    nextCaster.push({ kind, magnitude, turnsRemaining: duration === 'instant' || duration == null ? 'battle' : duration });
  };
  const setTarget = (kind: ActiveModifier['kind'], magnitude: number, duration: SkillEffect['duration']) => {
    nextTarget = nextTarget.filter(m => m.kind !== kind);
    nextTarget.push({ kind, magnitude, turnsRemaining: duration === 'instant' || duration == null ? 'battle' : duration });
  };

  for (const effect of skill.effects ?? []) {
    switch (effect.kind) {
      case 'self_atk_up':
        setCaster('atk', effect.magnitude ?? 0, effect.duration);
        logs.push(`${effect.magnitude! >= 0 ? '⬆️' : '⬇️'} Attack ${effect.magnitude! >= 0 ? 'rose' : 'fell'}!`);
        break;
      case 'self_def_up':
        setCaster('def', effect.magnitude ?? 0, effect.duration);
        logs.push(`${effect.magnitude! >= 0 ? '⬆️' : '⬇️'} Defense ${effect.magnitude! >= 0 ? 'rose' : 'fell'}!`);
        break;
      case 'self_speed_up':
        setCaster('speed', effect.magnitude ?? 0, effect.duration);
        logs.push(`⬆️ Speed rose!`);
        break;
      case 'enemy_atk_down':
        setTarget('atk', -(effect.magnitude ?? 0), effect.duration);
        logs.push(`⬇️ The enemy's Attack fell!`);
        break;
      case 'enemy_def_down':
        setTarget('def', -(effect.magnitude ?? 0), effect.duration);
        logs.push(`⬇️ The enemy's Defense fell!`);
        break;
      case 'accuracy_soften':
        setCaster('accuracy', effect.magnitude ?? 0, effect.duration);
        logs.push(`🎯 Accuracy sharpened!`);
        break;
      case 'lifesteal':
        hpDelta += Math.round(damageDealt * (effect.magnitude ?? 0));
        logs.push(`🩸 Drained some HP!`);
        break;
      case 'flat_heal':
        hpDelta += Math.round(casterMaxHp * (effect.magnitude ?? 0));
        logs.push(`💚 Restored some HP!`);
        break;
      case 'cleanse':
        cleanse = true;
        logs.push(`🧼 Status conditions cleansed!`);
        break;
    }
  }

  return { casterModifiers: nextCaster, targetModifiers: nextTarget, casterHpDelta: hpDelta, cleanseCaster: cleanse, logMessages: logs };
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

// Stat "power level" a guild companion's tier maps to. Tier1 is always
// 'normal'; tier2/tier3 are 'enhanced'/'super_enhanced' UNLESS that stage is
// flagged isLegendary, in which case 'legendary' — the top enhancement —
// overrides it regardless of whether legendary status lands on tier2 or tier3.
export type GuildEnhancementLevel = 'normal' | 'enhanced' | 'super_enhanced' | 'legendary';

// Multiplier applied to a guild companion's tier1 base stats to produce each
// enhancement level's stats. Always grown from the tier1 base, never stacked
// tier-on-tier, so legendary status gives the same top stats whether it hits
// at tier2 or tier3.
const GUILD_ENHANCEMENT_GROWTH: Record<GuildEnhancementLevel, number> = {
  normal: 1.0,
  enhanced: 1.20,
  super_enhanced: 1.45,
  legendary: 1.70,
};

export function getGuildEnhancementLevel(monsterDef: MonsterDef, tier: 1 | 2 | 3): GuildEnhancementLevel {
  if (tier === 1) return 'normal';
  const stage = tier === 2 ? monsterDef.guildEvolution?.tier2 : monsterDef.guildEvolution?.tier3;
  if (stage?.isLegendary) return 'legendary';
  return tier === 2 ? 'enhanced' : 'super_enhanced';
}

// A guild companion that reaches 'legendary' swaps its tier3 skill slot for
// its element's exclusive legendary move (see the LEGENDARY SKILLS block in
// SKILLS above) instead of the normal species tier3 skill.
const LEGENDARY_SKILL_BY_ELEMENT: Record<Element, string> = {
  fire: 'legendary_fire', water: 'legendary_water', leaf: 'legendary_leaf',
  storm: 'legendary_storm', shadow: 'legendary_shadow', light: 'legendary_light',
};

// Returns a MonsterDef with name/emoji/spriteId/isLegendary/description/base
// stats/tier3 skill swapped for a specific evolution tier of a guild
// companion — independent of any player's current guild level (unlike
// getGuildMonsterDisplay below), so the Compendium can render all 3 tiers as
// separate cards side by side. Skills stay the base species values, EXCEPT
// the tier3 slot when this tier resolves to 'legendary' (see
// LEGENDARY_SKILL_BY_ELEMENT) — skillUnlocks never change.
export function getGuildMonsterTierDef(monsterDef: MonsterDef, tier: 1 | 2 | 3): MonsterDef {
  const evo = monsterDef.guildEvolution;
  if (!evo || tier === 1) return monsterDef;
  const t = tier === 2 ? evo.tier2 : evo.tier3;
  const enhancementLevel = getGuildEnhancementLevel(monsterDef, tier);
  const growth = GUILD_ENHANCEMENT_GROWTH[enhancementLevel];
  const skills: [string, string, string] = enhancementLevel === 'legendary'
    ? [monsterDef.skills[0], monsterDef.skills[1], LEGENDARY_SKILL_BY_ELEMENT[monsterDef.element]]
    : monsterDef.skills;
  return {
    ...monsterDef,
    name: t.name,
    emoji: t.emoji,
    spriteId: t.spriteId ?? monsterDef.spriteId,
    isLegendary: t.isLegendary ?? monsterDef.isLegendary,
    description: t.description ?? monsterDef.description,
    baseHp: Math.round(monsterDef.baseHp * growth),
    baseAttack: Math.round(monsterDef.baseAttack * growth),
    baseDefense: Math.round(monsterDef.baseDefense * growth),
    baseSpeed: Math.round(monsterDef.baseSpeed * growth),
    skills,
  };
}

// Resolves the full display+stat def for a monster, given the owning
// player's level in that monster's linked guild (0 if unknown/n/a). Skills
// and EXP are unaffected by this — see getGuildMonsterTier.
export function getGuildMonsterDisplay(monsterDef: MonsterDef, guildLevel: number): MonsterDef & { tier: 1 | 2 | 3; enhancementLevel: GuildEnhancementLevel } {
  const tier = getGuildMonsterTier(monsterDef, guildLevel);
  const d = getGuildMonsterTierDef(monsterDef, tier);
  return { ...d, tier, enhancementLevel: getGuildEnhancementLevel(monsterDef, tier) };
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
  // Net magnitude from any active 'accuracy' modifiers (Focus Stance and
  // friends) — added onto the 0.5 partial-credit floor, e.g. 0.15 -> 0.65.
  accuracyBonus: number = 0,
): number {
  const ratio = correctAnswers / totalQuestions;
  if (ratio === 0) return 0;

  let damage = baseAttack * skill.baseDamageMultiplier;
  if (ratio < 1) damage *= Math.min(1, 0.5 + accuracyBonus); // partial correct = reduced damage
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
