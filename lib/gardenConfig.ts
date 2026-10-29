// lib/gardenConfig.ts
// Wild veggies and trees on the Training Map (behind the 'garden' switch). Plants grow at
// fixed spots; next to a ripe one, a kid asks to pick it (E, a tap on it, or the Pick button)
// and answering one question right picks it. The
// veggie goes into the bag, sometimes with a seed packet, and the plant regrows for
// REGROW_MS. Every tree on the day's map takes CHOP_SWINGS right answers, one per swing, and
// gives wood and sometimes a sapling; it stays a stump until the next day's map. The rules live in
// supabase/migrations/20261022120000_garden_wild_plants.sql (gather_wild_plant,
// sell_garden_items) and 20261023120000_garden_wild_trees.sql (chop_wild_tree); the numbers
// here mirror them for the screen.

// Each region's finds ride along as a "veggie": seashells on Tidewrit's beaches, storm crystals in
// the Stormrun's rubble, ink pearls by the Unread Margins' pools, golden petals in the Radiant
// Archive. They're picked with one question the same way and sold at the Recycler for the same
// gold, but they never come with seeds, and a new one turns up instead of the plant growing back
// (`found` below).
export type VeggieId = 'tomato' | 'eggplant' | 'pumpkin' | 'carrot' | 'cabbage' | 'corn' | 'beans'
  | 'seashell' | 'crystal' | 'inkpearl' | 'petal';

export interface VeggieDef {
  id: VeggieId;
  label: string;
  // Two tiles tall (a 32x64 art frame) instead of one.
  tall: boolean;
  // Found rather than grown: no seeds, and the words change (see below).
  found?: {
    noun: string; // what the kid calls one ("shell")
    where: string; // the bag's note: "Found on the beach!"
    back: string; // what brings the next one: "The waves will bring"
  };
}

export const VEGGIES: Record<VeggieId, VeggieDef> = {
  tomato:   { id: 'tomato',   label: 'Tomato',   tall: false },
  eggplant: { id: 'eggplant', label: 'Eggplant', tall: false },
  pumpkin:  { id: 'pumpkin',  label: 'Pumpkin',  tall: false },
  carrot:   { id: 'carrot',   label: 'Carrot',   tall: false },
  cabbage:  { id: 'cabbage',  label: 'Cabbage',  tall: false },
  corn:     { id: 'corn',     label: 'Corn',     tall: true },
  beans:    { id: 'beans',    label: 'Beans',    tall: true },
  seashell: { id: 'seashell', label: 'Seashell', tall: false, found: { noun: 'shell', where: 'Found on the beach!', back: 'The waves will bring' } },
  crystal: { id: 'crystal', label: 'Storm Crystal', tall: false, found: { noun: 'crystal', where: 'Found in the rocks!', back: 'The storm will leave' } },
  inkpearl: { id: 'inkpearl', label: 'Ink Pearl', tall: false, found: { noun: 'pearl', where: 'Found by an ink pool!', back: 'The ink pool will bring up' } },
  petal: { id: 'petal', label: 'Golden Petal', tall: false, found: { noun: 'petal', where: 'Found in the meadow!', back: 'The wind will blow' } },
};
export const VEGGIE_ORDER: VeggieId[] = ['tomato', 'eggplant', 'pumpkin', 'carrot', 'cabbage', 'corn', 'beans',
  'seashell', 'crystal', 'inkpearl', 'petal'];
// Veggies that can give seed packets (not the finds).
export const SEED_ORDER: VeggieId[] = VEGGIE_ORDER.filter(v => !VEGGIES[v].found);

// "a Tomato", "an Ink Pearl".
export const withA = (word: string) => `${/^[aeiou]/i.test(word) ? 'an' : 'a'} ${word}`;

// The words for one spot: "Pick Tomato" / "Pick up Seashell", and what to say while it comes back.
export const pickVerb = (v: VeggieId) => (VEGGIES[v].found ? 'Pick up' : 'Pick');
export const regrowWords = (v: VeggieId, mins: number) => {
  const time = `about ${mins} minute${mins === 1 ? '' : 's'}`;
  const found = VEGGIES[v].found;
  return found
    ? `${found.back} a new ${found.noun} here in ${time}!`
    : `This ${VEGGIES[v].label.toLowerCase()} is growing back. Ready in ${time}!`;
};

// Same list as wild_plant_nodes in the migration.
export interface WildPlantNode { id: string; veggie: VeggieId; x: number; y: number }

// A fenced field planted edge to edge with one crop, one plant per tile ("tomato_3_23" is the
// tomato at tile 3, 23). Corners are inclusive.
function field(veggie: VeggieId, x0: number, y0: number, x1: number, y1: number): WildPlantNode[] {
  const plants: WildPlantNode[] = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) plants.push({ id: `${veggie}_${x}_${y}`, veggie, x, y });
  return plants;
}

export const WILD_PLANTS: Record<string, WildPlantNode[]> = {
  ledgers_heart: [
    { id: 'tomato_1',   veggie: 'tomato',   x: 12, y: 10 },
    { id: 'corn_1',     veggie: 'corn',     x: 15, y: 12 },
    { id: 'eggplant_1', veggie: 'eggplant', x: 13, y: 14 },
    { id: 'pumpkin_1',  veggie: 'pumpkin',  x: 12, y: 28 },
    { id: 'carrot_1',   veggie: 'carrot',   x: 14, y: 29 },
    { id: 'tomato_2',   veggie: 'tomato',   x: 40, y: 6 },
    { id: 'cabbage_1',  veggie: 'cabbage',  x: 50, y: 13 },
    { id: 'beans_1',    veggie: 'beans',    x: 48, y: 15 },
  ],
  // Inkwell Town's two fenced dirt pens, west of the fountain (town.tmx Fences): tomatoes fill
  // the small one, pumpkins the big one.
  town: [
    ...field('tomato', 3, 23, 7, 27),
    ...field('pumpkin', 10, 23, 17, 27),
  ],
  // Seashells along Tidewrit's beaches, each right by the water.
  tidewrit_shallows: [
    { id: 'shell_1', veggie: 'seashell', x: 9,  y: 3 },
    { id: 'shell_2', veggie: 'seashell', x: 6,  y: 11 },
    { id: 'shell_3', veggie: 'seashell', x: 10, y: 21 },
    { id: 'shell_4', veggie: 'seashell', x: 17, y: 31 },
    { id: 'shell_5', veggie: 'seashell', x: 26, y: 36 },
    { id: 'shell_6', veggie: 'seashell', x: 45, y: 36 },
    { id: 'shell_7', veggie: 'seashell', x: 55, y: 35 },
  ],
  // Storm crystals in the Stormrun rubble fields.
  stormrun_reaches: [
    { id: 'crystal_1', veggie: 'crystal', x: 44, y: 3 },
    { id: 'crystal_2', veggie: 'crystal', x: 15, y: 21 },
    { id: 'crystal_3', veggie: 'crystal', x: 46, y: 25 },
    { id: 'crystal_4', veggie: 'crystal', x: 33, y: 27 },
    { id: 'crystal_5', veggie: 'crystal', x: 56, y: 32 },
    { id: 'crystal_6', veggie: 'crystal', x: 2, y: 36 },
    { id: 'crystal_7', veggie: 'crystal', x: 21, y: 37 },
  ],
  // Ink pearls by the Unread Margins ink pools.
  unread_margins: [
    { id: 'pearl_1', veggie: 'inkpearl', x: 36, y: 2 },
    { id: 'pearl_2', veggie: 'inkpearl', x: 27, y: 8 },
    { id: 'pearl_3', veggie: 'inkpearl', x: 54, y: 17 },
    { id: 'pearl_4', veggie: 'inkpearl', x: 16, y: 21 },
    { id: 'pearl_5', veggie: 'inkpearl', x: 27, y: 23 },
    { id: 'pearl_6', veggie: 'inkpearl', x: 47, y: 23 },
    { id: 'pearl_7', veggie: 'inkpearl', x: 21, y: 28 },
  ],
  // Golden petals in the Radiant Archive meadow.
  radiant_archive: [
    { id: 'petal_1', veggie: 'petal', x: 3, y: 3 },
    { id: 'petal_2', veggie: 'petal', x: 54, y: 3 },
    { id: 'petal_3', veggie: 'petal', x: 29, y: 14 },
    { id: 'petal_4', veggie: 'petal', x: 13, y: 18 },
    { id: 'petal_5', veggie: 'petal', x: 57, y: 34 },
    { id: 'petal_6', veggie: 'petal', x: 2, y: 37 },
    { id: 'petal_7', veggie: 'petal', x: 31, y: 37 },
  ],
};

export const REGROW_MS = 20 * 60 * 1000;
// Wrong answers in a row before a plant rests for REST_MS.
export const WRONG_LIMIT = 3;
export const REST_MS = 60 * 1000;
export const VEGGIE_SELL_PRICE = 2;
// The harder finds (they need a tool) sell for more; sell_garden_items mirrors these.
export const FIND_SELL_PRICE = 4;
export const RARE_SELL_PRICE = 10;
// Veggies or seed packets of one kind per bag square (same as trash).
export const GARDEN_STACK = 20;

// ── Trees ──────────────────────────────────────────────────────────────────
// Art: public/garden/tree_<id>.png, two 128x160 frames (grown, stump) with the trunk base at
// (64, 134). Ledger's Heart's trees are cut from the map's own tileset (Props.png); each region
// also has trees found only there, drawn by Rowil (garden-art/out/region-<element>). Each kind
// has its own stump. `name` is what the kid sees on the map ("Chop Ember Tree").
export type TreeId = 'maple' | 'oak' | 'birch' | 'pine' | 'ember' | 'ashwillow' | 'palm' | 'mangrove' | 'elder' | 'bamboo'
  | 'stormpine' | 'silverbirch' | 'dusk' | 'glowcap' | 'paperleaf' | 'sunblossom';
export const TREES: Record<TreeId, { id: TreeId; label: string; name: string }> = {
  maple:     { id: 'maple',     label: 'Maple',      name: 'Maple Tree' },
  oak:       { id: 'oak',       label: 'Oak',        name: 'Oak Tree' },
  birch:     { id: 'birch',     label: 'Birch',      name: 'Birch Tree' },
  pine:      { id: 'pine',      label: 'Pine',       name: 'Pine Tree' },
  ember:     { id: 'ember',     label: 'Ember',      name: 'Ember Tree' },
  ashwillow: { id: 'ashwillow', label: 'Ash Willow', name: 'Ash Willow' },
  palm:      { id: 'palm',      label: 'Palm',       name: 'Palm Tree' },
  mangrove:  { id: 'mangrove',  label: 'Mangrove',   name: 'Mangrove' },
  elder:     { id: 'elder',     label: 'Elder',      name: 'Elder Tree' },
  bamboo:    { id: 'bamboo',    label: 'Bamboo',     name: 'Bamboo' },
  stormpine:   { id: 'stormpine',   label: 'Storm Pine',  name: 'Storm Pine' },
  silverbirch: { id: 'silverbirch', label: 'Silver Birch', name: 'Silver Birch' },
  dusk:        { id: 'dusk',        label: 'Dusk',        name: 'Dusk Tree' },
  glowcap:     { id: 'glowcap',     label: 'Glowcap',     name: 'Glowcap' },
  paperleaf:   { id: 'paperleaf',   label: 'Paperleaf',   name: 'Paperleaf Tree' },
  sunblossom:  { id: 'sunblossom',  label: 'Sunblossom',  name: 'Sunblossom Tree' },
};
// Which trees grow where (chop_wild_tree checks the same pairs). Every region is listed ahead of
// its map; a region's trees only grow once its map has the daily nature layer.
export const REGION_TREES: Record<string, TreeId[]> = {
  ledgers_heart: ['maple', 'oak', 'birch', 'pine'],
  town: ['maple', 'oak', 'birch', 'pine'],
  cinderreach: ['ember', 'ashwillow'],
  tidewrit_shallows: ['palm', 'mangrove'],
  rootbound_wilds: ['elder', 'bamboo'],
  stormrun_reaches: ['stormpine', 'silverbirch'],
  unread_margins: ['dusk', 'glowcap'],
  radiant_archive: ['paperleaf', 'sunblossom'],
};
export const TREE_ORDER: TreeId[] = ['maple', 'oak', 'birch', 'pine', 'ember', 'ashwillow', 'palm', 'mangrove', 'elder', 'bamboo',
  'stormpine', 'silverbirch', 'dusk', 'glowcap', 'paperleaf', 'sunblossom'];

// The trees themselves grow with the day's nature layer (lib/mapNature.ts): every one of them
// can be chopped, and a chopped tree stays a stump until the next day's map.
export interface WildTreeNode { id: string; tree: TreeId; x: number; y: number }

// With a Stone Axe. Better axes take fewer swings and chop more trees a day (lib/gearConfig.ts
// chopSwingsFor, dailyTreeLimitFor).
export const CHOP_SWINGS = 3;
export const WOOD_PER_TREE = 3;
// Trees one kid can chop a day (chop_wild_tree mirrors it): 8 trees is 24 wood, 48 gold at the
// Recycler, about a sixth of an active player's daily gold.
export const DAILY_TREE_LIMIT = 8;

export type TreeStage = 'ready' | 'stump';

// One swing of the axe, shared by the map animation (lib/phaserMap/chopSwing.ts), its sounds and
// the chop panel, which steps aside while it plays. Times in ms from when the swing starts:
// the kid winds up (lean back, axe high), strikes, freezes for a beat on contact, the axe
// recoils, and they settle back to the ready stance. The blow that fells a tree winds up
// longer and lands harder. A miss swings through and stumbles instead of landing.
export type SwingKind = 'hit' | 'miss' | 'felled';
export function swingTiming(kind: SwingKind) {
  const windUp = kind === 'felled' ? 520 : 400;
  const strike = 110;
  const freeze = kind === 'felled' ? 150 : kind === 'hit' ? 90 : 0;
  const recover = kind === 'miss' ? 650 : 520;
  return { windUp, strike, impact: windUp + strike, freeze, total: windUp + strike + freeze + recover };
}
// The right/wrong reveal stays up this long before the panel steps aside and the swing starts.
export const SWING_REVEAL_MS = 500;
// A pickaxe or shovel blow at a find (chopSwing.ts strike()): the tool appears over it (260 ms),
// then one 'hit' swing; the find pops into the bag when it lands.
export const STRIKE_LEAD_MS = 260;
export const strikeImpactMs = () => STRIKE_LEAD_MS + swingTiming('hit').impact + swingTiming('hit').freeze;

// ── Bag items ──────────────────────────────────────────────────────────────
// Keys in player_bag_items.item_key.
export const veggieKey = (v: VeggieId) => `veggie_${v}`;
export const seedsKey = (v: VeggieId) => `seeds_${v}`;
// Every tree gives its own wood (crafting step 1, 2026-10-29), so recipes and Hideout buildings
// can ask for the wood of a far-off region.
export const woodKey = (t: TreeId) => `wood_${t}`;
export const saplingKey = (t: TreeId) => `sapling_${t}`;
export type GardenBag = Partial<Record<string, number>>;
// The four town trees' woods sell like a veggie; a region's own wood takes a trip, so it sells
// for more. garden_sell_price mirrors these.
export const TOWN_WOODS: TreeId[] = ['maple', 'oak', 'birch', 'pine'];
export const WOOD_SELL_PRICE = VEGGIE_SELL_PRICE;
export const REGION_WOOD_SELL_PRICE = 3;
export const woodSellPrice = (t: TreeId) => (TOWN_WOODS.includes(t) ? WOOD_SELL_PRICE : REGION_WOOD_SELL_PRICE);
// What each wood is known for, in the bag (a hint at what it's for).
export const WOOD_NOTES: Record<TreeId, string> = {
  maple: 'Easy to work with.', oak: 'Strong and steady.', birch: 'Smooth and pale.', pine: 'Tall and straight.',
  ember: 'Burns hot for a long time.', ashwillow: 'Bends without breaking.', palm: 'Light, and it floats.',
  mangrove: 'Never rots in water.', elder: 'Old and wise.', bamboo: 'Hollow and fast-growing.',
  stormpine: 'Tough as stone.', silverbirch: 'Shines like metal.', dusk: 'Dark as night.',
  glowcap: 'Glows in the dark.', paperleaf: 'Makes the best paper.', sunblossom: 'Smells sweet. Bees love it!',
};
// Where each tree grows, in words ("Chop Ember Trees in Cinderreach.").
const TREE_PLACE: Record<string, string> = {
  ledgers_heart: "Ledger's Heart", cinderreach: 'Cinderreach', tidewrit_shallows: 'Tidewrit Shallows', rootbound_wilds: 'Rootbound Wilds',
  stormrun_reaches: 'Stormrun Reaches', unread_margins: 'the Unread Margins', radiant_archive: 'the Radiant Archive',
};
export const whereTreeGrows = (t: TreeId) => (TOWN_WOODS.includes(t)
  ? "Inkwell Town and Ledger's Heart"
  : Object.entries(REGION_TREES).filter(([r, ts]) => ts.includes(t) && TREE_PLACE[r]).map(([r]) => TREE_PLACE[r]).join(' and '));
export const woodLabel = (t: TreeId) => (t === 'bamboo' ? 'Bamboo' : t === 'glowcap' ? 'Glowcap Stem' : `${TREES[t].label} Wood`);

// Rare finds a Silver or Gold tool sometimes digs up (gather_wild_plant).
export type RareId = 'gem' | 'coin';
export const RARES: Record<RareId, { id: RareId; key: string; label: string; where: string }> = {
  gem: { id: 'gem', key: 'find_gem', label: 'Storm Gem', where: 'A rare gem from deep in the rocks!' },
  coin: { id: 'coin', key: 'find_coin', label: 'Old Coin', where: 'A very old coin, dug out of the sand!' },
};
export const RARE_ORDER: RareId[] = ['gem', 'coin'];

// Things made at the Hideout's stations that stay in the bag (lib/craftingConfig.ts has the
// recipes). Battle food goes to the Vault instead.
export type CraftedId = 'stone_ring' | 'garden_soil' | 'food_kibble' | 'food_mash';
export const CRAFTED: Record<CraftedId, { id: CraftedId; label: string; note: string }> = {
  stone_ring: { id: 'stone_ring', label: 'Stone Ring', note: 'Stones for a tree spot at your Hideout.' },
  garden_soil: { id: 'garden_soil', label: 'Garden Soil', note: 'Rich soil for a tree spot at your Hideout.' },
  food_kibble: { id: 'food_kibble', label: 'Curio Kibble', note: 'Feed it to a curio at your Curio Camp.' },
  food_mash: { id: 'food_mash', label: 'Veggie Mash', note: 'Feed it to a curio at your Curio Camp. Its next mission is shorter!' },
};
export const CRAFTED_ORDER: CraftedId[] = ['food_kibble', 'food_mash', 'stone_ring', 'garden_soil'];

export type ParsedGardenKey =
  | { kind: 'veggie' | 'seeds'; veggie: VeggieDef }
  | { kind: 'wood'; tree: TreeId }
  | { kind: 'sapling'; tree: TreeId }
  | { kind: 'rare'; rare: RareId }
  | { kind: 'crafted'; crafted: CraftedId };

export function parseGardenKey(key: string): ParsedGardenKey | null {
  const r = RARE_ORDER.find(id => RARES[id].key === key);
  if (r) return { kind: 'rare', rare: r };
  if (key in CRAFTED) return { kind: 'crafted', crafted: key as CraftedId };
  const s = /^(sapling|wood)_(\w+)$/.exec(key);
  if (s) return s[2] in TREES ? { kind: s[1] as 'sapling' | 'wood', tree: s[2] as TreeId } : null;
  const m = /^(veggie|seeds)_(\w+)$/.exec(key);
  const def = m ? VEGGIES[m[2] as VeggieId] : undefined;
  if (!m || !def || (m[1] === 'seeds' && def.found)) return null;
  return { kind: m[1] as 'veggie' | 'seeds', veggie: def };
}

// What the Recycler pays for one (0 = it doesn't buy it: seeds and saplings are for planting,
// and what you make is for using).
export const gardenSellPrice = (key: string) => {
  const p = parseGardenKey(key);
  if (!p) return 0;
  if (p.kind === 'rare') return RARE_SELL_PRICE;
  if (p.kind === 'wood') return woodSellPrice(p.tree);
  if (p.kind !== 'veggie') return 0;
  return p.veggie.id === 'crystal' || p.veggie.id === 'inkpearl' || p.veggie.id === 'petal' ? FIND_SELL_PRICE : VEGGIE_SELL_PRICE;
};
export const gardenSellable = (key: string) => gardenSellPrice(key) > 0;

export const gardenItemLabel = (key: string) => {
  const p = parseGardenKey(key);
  if (!p) return key;
  if (p.kind === 'wood') return woodLabel(p.tree);
  if (p.kind === 'sapling') return `${TREES[p.tree].label} Sapling`;
  if (p.kind === 'rare') return RARES[p.rare].label;
  if (p.kind === 'crafted') return CRAFTED[p.crafted].label;
  return p.kind === 'veggie' ? p.veggie.label : `${p.veggie.label} Seeds`;
};
export const gardenItemIcon = (key: string) => {
  const p = parseGardenKey(key);
  if (!p) return '';
  if (p.kind === 'wood') return `/garden/icon_wood_${p.tree}.png`;
  if (p.kind === 'sapling') return `/garden/icon_sapling_${p.tree}.png`;
  if (p.kind === 'rare') return `/garden/icon_${RARES[p.rare].key}.png`;
  if (p.kind === 'crafted') return `/craft/icon_${p.crafted}.png`;
  return `/garden/icon_${p.kind === 'seeds' ? 'seeds_' : ''}${p.veggie.id}.png`;
};
// Any wood, for words like "Collect Wood".
export const WOOD_ICON = '/garden/icon_wood.png';

// Bag keys in display order: veggies, rare finds, woods, things made at the Hideout, then seed
// packets and saplings.
export const GARDEN_KEYS: string[] = [
  ...VEGGIE_ORDER.map(veggieKey), ...RARE_ORDER.map(r => RARES[r].key), ...TREE_ORDER.map(woodKey), ...CRAFTED_ORDER,
  ...SEED_ORDER.map(seedsKey), ...TREE_ORDER.map(saplingKey),
];

export const gardenSquares = (bag: GardenBag) =>
  GARDEN_KEYS.reduce((sum, k) => sum + Math.ceil((bag[k] ?? 0) / GARDEN_STACK), 0);

// How a plant looks: ripe (pick it), just picked, or growing back (second half of the regrow).
export type PlantStage = 'ripe' | 'picked' | 'growing';
export function plantStage(readyAt: number | null, now: number): PlantStage {
  if (readyAt === null || now >= readyAt) return 'ripe';
  return readyAt - now > REGROW_MS / 2 ? 'picked' : 'growing';
}
