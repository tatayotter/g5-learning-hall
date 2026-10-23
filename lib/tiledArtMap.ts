// lib/tiledArtMap.ts
// Loader for real-tile-art Tiled maps authored as .tmx (Tiled's native XML
// format) — as opposed to lib/tiledMap.ts, which parses the script-generated
// walkability-only JSON maps used by the painted-background regions.
//
// Parses the .tmx directly (via DOMParser) rather than requiring the author
// to remember to "Export As JSON" every time — one less step in an already
// fiddly workflow. External .tsx tileset references are fetched + parsed too
// and merged into a single embedded Tiled-JSON object Phaser can consume via
// `this.load.tilemapTiledJSON()`.
//
// Walkability/collision is NOT hand-authored as a separate logic layer here
// (unlike the painted-background maps) — it's derived automatically from any
// objectgroup whose name contains "collision" (e.g. "Fence Collision", "Tree
// collision"): a tile is blocked if its center point falls inside any object
// rect in one of those groups. Any objectgroup whose name contains
// "encounter" (e.g. "no encounter layer") instead marks tiles as walkable but
// exempt from wild-encounter rolls (dirt paths, typically) — see the 'path'
// TileType in lib/regions.ts. Every other walkable tile counts as a normal
// wild-encounter tile (this map has no separate "town/heal" tile type).
import { REGIONS, type MapTile } from './regions';
import { growNature, natureDay, type NatureRect, type NatureTree } from './mapNature';

// The .tsx files' own recorded `<image source>` points at the *author's*
// local filesystem (e.g. "../Downloads/ForgottenMemories/X.png") — not
// something we can serve. We know exactly which 5 tileset images this pack
// ships (see public/tilesets/forgotten-memories/ATTRIBUTION.md), so resolve
// by tileset name instead of trusting the recorded path.
const KNOWN_TILESET_IMAGES: Record<string, string> = {
  'Props': '/tilesets/forgotten-memories/Props.png',
  'TileSet': '/tilesets/forgotten-memories/TileSet.png',
  'Trees': '/tilesets/forgotten-memories/Trees.png',
  'Trees_seperated': '/tilesets/forgotten-memories/Trees_seperated.png',
  'Town Props 2': '/tilesets/forgotten-memories/Town_Props_2.png',
  // The town: buildings, stalls and the fountain, and the round stone floor around it.
  'Town Props 1': '/tilesets/forgotten-memories/Town_Props_1.png',
  'fountain floor': '/tilesets/forgotten-memories/fountain_floor.png',
  // Crates, barrels, benches, flower boxes, pots and the well, cut from the town sheets onto the
  // tile grid (/mnt/project-files/town-map/build_decor.py).
  'TownDecor': '/tilesets/forgotten-memories/TownDecor.png',
  // The town's ground shadows, drawn by its build script.
  'TownShadows': '/tilesets/forgotten-memories/TownShadows.png',
  // The fountain's animation frames, made from its picture (/mnt/project-files/town-map/build_fountain.py).
  'FountainAnim': '/tilesets/forgotten-memories/FountainAnim.png',
  'WaterTiles-6frames': '/tilesets/forgotten-memories/WaterTiles-6frames.png',
  // Region looks (recolored copies of the pack's sheets, same layout): Cinderreach is scorched
  // and its liquid is lava.
  'TileSet-fire': '/tilesets/forgotten-memories/TileSet-fire.png',
  'LavaTiles-6frames': '/tilesets/forgotten-memories/LavaTiles-6frames.png',
  // Tidewrit: beach sand (the light-dirt blobs recolored), water with bright shallows, a bridge.
  'TileSet-tide': '/tilesets/forgotten-memories/TileSet-tide.png',
  'TideWater-6frames': '/tilesets/forgotten-memories/TideWater-6frames.png',
  'TideBridge': '/tilesets/region-nature/TideBridge.png',
  // Rootbound: lusher greens, riverbank loam, the cliff face over grass, and a tall waterfall.
  'TileSet-leaf': '/tilesets/forgotten-memories/TileSet-leaf.png',
  'RootFalls': '/tilesets/region-nature/RootFalls.png',
  // Each region's own plants for the daily nature layer, on a 32 px grid.
  'FireNature': '/tilesets/region-nature/FireNature.png',
  'TideNature': '/tilesets/region-nature/TideNature.png',
  'LeafNature': '/tilesets/region-nature/LeafNature.png',
};

export interface TiledArtLayer {
  name: string;
  data: number[];
  opacity: number;
}

// The fixed layer contract every tile-art map follows (see
// public/maps-tiled-art/README.md). Role order is also draw order.
type LayerRole = 'under' | 'liquid' | 'ground' | 'detail' | 'shadows' | 'base' | 'top';
const ROLE_BY_NAME: Record<string, LayerRole> = {
  // Plain dirt under see-through ground (the town's brick road), drawn first.
  'under ground': 'under',
  // Water or lava under the ground's see-through edges.
  'liquid': 'liquid',
  'ground': 'ground',
  'ground detail': 'detail',
  // Cliff skirts: drawn like Ground Detail (the "collision" boxes say where cliffs block).
  'skirt': 'detail',
  'excess skirt': 'detail',
  'shadows': 'shadows',
  'objects base': 'base',
  'objects top': 'top',
  // The town's plaza floor is walked on like a path.
  'fountain circle': 'detail',
  // The town's lamp posts and decor above their feet: drawn over the players.
  'lamp tops': 'top',
  'town decor top': 'top',
  // Building roofs and stall awnings (everything above their bottom rows): players walk behind them.
  'roofs': 'top',
  'roofs 2': 'top',
  'roofs 3': 'top',
};
// Any other layer is a thing standing on the ground (the town's buildings, fences, walls, stalls,
// fountain): drawn behind the player and solid, like Objects Base.
const roleFor = (name: string): LayerRole => ROLE_BY_NAME[name.trim().toLowerCase()] ?? 'base';
const ROLE_ORDER: LayerRole[] = ['under', 'liquid', 'ground', 'detail', 'shadows', 'base', 'top'];

export interface TiledArtPortal {
  x: number;
  y: number;
  regionId: string;
}

export interface TiledArtMap {
  mapJson: object;
  tilesetImages: Record<string, string>;
  mapWidth: number;
  mapHeight: number;
  tileSize: number;
  belowPlayerLayers: string[];
  abovePlayerLayers: string[];
  layerOpacity: Record<string, number>;
  layout: MapTile[][];
  spawn: { x: number; y: number };
  // Optional "Recycler" object layer point; null → caller falls back to RECYCLER_TILES.
  recycler: { x: number; y: number } | null;
  // Walkable tiles that transition to another region when stepped on — see
  // the "Portals" objectgroup convention documented in
  // public/maps-tiled-art/README.md.
  portals: TiledArtPortal[];
  // True where the "Trees" tile layer draws canopy art, even though the
  // tile itself is walkable (only the trunk — a much smaller area — is
  // marked 'wall' via "Tree collision"). Used to keep spawned scroll/curio
  // markers from rendering visually under/behind tree foliage; has no
  // effect on walkability/collision itself.
  foliage: boolean[][];
  // Trees grown by the daily nature layer (lib/mapNature.ts); empty for hand-made maps.
  trees: NatureTree[];
  // Animated tiles (water, lava), from the tilesets' Tiled animations: gid -> its frames' gids.
  animatedTiles: Record<number, { frames: number[]; ms: number }>;
  // True where the "Liquid" layer has water or lava (where the map's critters live near).
  liquid: boolean[][];
  // True on beach sand (Tidewrit's sand tiles), where footsteps leave prints.
  sand: boolean[][];
  // Flower tiles grown by the daily nature layer (empty for hand-made maps).
  flowers: { x: number; y: number }[];
  // Tiles drawn with a "light" tile (lamps): they glow at night.
  lights: { x: number; y: number }[];
}

// A map drawn as ground and paths only gets the day's nature layer (lib/mapNature.ts).
export interface NatureOptions {
  regionId: string;
  // Tiles that must stay free, e.g. the wild veggies.
  reserved: { x: number; y: number }[];
}

interface Rect { x: number; y: number; width: number; height: number }

function resolve(relativePath: string, fromUrl: string): string {
  return new URL(relativePath, `${window.location.origin}${fromUrl}`).pathname;
}

function attr(el: Element, name: string): string {
  return el.getAttribute(name) ?? '';
}

async function fetchXml(url: string): Promise<Document> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Couldn't load ${url} (${res.status})`);
  const text = await res.text();
  return new DOMParser().parseFromString(text, 'application/xml');
}

interface EmbeddedTileset {
  firstgid: number;
  name: string;
  image: string;
  imagewidth: number;
  imageheight: number;
  tilewidth: number;
  tileheight: number;
  columns: number;
  tilecount: number;
  margin: number;
  spacing: number;
  // Per-tile data from the tileset (local tile ids): tiles marked solid, and animations.
  solid: number[];
  // Tiles that are almost all see-through (the empty corners of a building or fountain stamp):
  // walkable even on Objects Base.
  walkable: number[];
  // Tiles that shine at night (the town's lamps).
  light: number[];
  anims: Record<number, { frames: number[]; ms: number }>;
}

// <tile id> entries: a "solid", "walkable" or "light" bool property, and an <animation> of frames.
function parseTileData(tilesetEl: Element) {
  const solid: number[] = [];
  const walkable: number[] = [];
  const light: number[] = [];
  const anims: Record<number, { frames: number[]; ms: number }> = {};
  for (const tileEl of Array.from(tilesetEl.querySelectorAll(':scope > tile'))) {
    const id = Number(attr(tileEl, 'id'));
    if (tileEl.querySelector('properties > property[name="solid"][value="true"]')) solid.push(id);
    if (tileEl.querySelector('properties > property[name="walkable"][value="true"]')) walkable.push(id);
    if (tileEl.querySelector('properties > property[name="light"][value="true"]')) light.push(id);
    const frames = Array.from(tileEl.querySelectorAll('animation > frame'));
    if (frames.length > 1) {
      anims[id] = { frames: frames.map(f => Number(attr(f, 'tileid'))), ms: Number(attr(frames[0], 'duration')) || 200 };
    }
  }
  return { solid, walkable, light, anims };
}

async function resolveTileset(tilesetEl: Element, tmxUrl: string): Promise<EmbeddedTileset> {
  const firstgid = Number(attr(tilesetEl, 'firstgid'));
  const source = attr(tilesetEl, 'source');
  if (!source) {
    // Already-embedded tileset (unlikely for this project's maps, but handle
    // it rather than silently producing a broken tileset).
    const imageEl = tilesetEl.querySelector('image');
    return {
      firstgid,
      name: attr(tilesetEl, 'name'),
      image: KNOWN_TILESET_IMAGES[attr(tilesetEl, 'name')] ?? attr(imageEl!, 'source'),
      imagewidth: Number(attr(imageEl!, 'width')),
      imageheight: Number(attr(imageEl!, 'height')),
      tilewidth: Number(attr(tilesetEl, 'tilewidth')),
      tileheight: Number(attr(tilesetEl, 'tileheight')),
      columns: Number(attr(tilesetEl, 'columns')),
      tilecount: Number(attr(tilesetEl, 'tilecount')),
      margin: Number(attr(tilesetEl, 'margin') || 0),
      spacing: Number(attr(tilesetEl, 'spacing') || 0),
      ...parseTileData(tilesetEl),
    };
  }

  const tsxUrl = resolve(source, tmxUrl);
  const doc = await fetchXml(tsxUrl);
  const tileset = doc.querySelector('tileset')!;
  const image = doc.querySelector('image')!;
  const name = attr(tileset, 'name');
  const knownImage = KNOWN_TILESET_IMAGES[name];
  if (!knownImage) {
    throw new Error(`Unknown tileset "${name}" — add its image path to KNOWN_TILESET_IMAGES in lib/tiledArtMap.ts.`);
  }
  return {
    firstgid,
    name,
    image: knownImage,
    imagewidth: Number(attr(image, 'width')),
    imageheight: Number(attr(image, 'height')),
    tilewidth: Number(attr(tileset, 'tilewidth')),
    tileheight: Number(attr(tileset, 'tileheight')),
    columns: Number(attr(tileset, 'columns')),
    tilecount: Number(attr(tileset, 'tilecount')),
    margin: Number(attr(tileset, 'margin') || 0),
    spacing: Number(attr(tileset, 'spacing') || 0),
    ...parseTileData(tileset),
  };
}

function parseCsvLayerData(dataEl: Element): number[] {
  return (dataEl.textContent ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(Number);
}

function parseObjectRect(objectEl: Element): Rect {
  return {
    x: Number(attr(objectEl, 'x')),
    y: Number(attr(objectEl, 'y')),
    width: Number(attr(objectEl, 'width') || 0),
    height: Number(attr(objectEl, 'height') || 0),
  };
}

function parseObjectProperty(objectEl: Element, name: string): string | undefined {
  const propEl = objectEl.querySelector(`properties > property[name="${name}"]`);
  return propEl?.getAttribute('value') ?? undefined;
}

// A portal's region, forgiving spelling: "ledgersheart" or "Ledger's Heart" for ledgers_heart.
function regionIdFrom(name: string): string {
  if (REGIONS[name]) return name;
  const squash = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
  return Object.keys(REGIONS).find(id => squash(id) === squash(name) || squash(REGIONS[id].name).replace(/^the/, '') === squash(name).replace(/^the/, '')) ?? name;
}

/** The tile one step into the map from a portal on its edge: where a kid walking in through it
 *  arrives (the road continues from the map they came from). */
export function stepInside(p: { x: number; y: number }, width: number, height: number) {
  const gaps = [
    { d: p.x, to: { x: p.x + 1, y: p.y } },
    { d: width - 1 - p.x, to: { x: p.x - 1, y: p.y } },
    { d: p.y, to: { x: p.x, y: p.y + 1 } },
    { d: height - 1 - p.y, to: { x: p.x, y: p.y - 1 } },
  ];
  return gaps.sort((a, b) => a.d - b.d)[0].to;
}

const cache = new Map<string, Promise<TiledArtMap>>();

export function loadTiledArtMap(tmxUrl: string, nature?: NatureOptions): Promise<TiledArtMap> {
  // A grown map is new every day.
  const day = nature ? natureDay() : '';
  const key = nature ? `${tmxUrl}|${nature.regionId}|${day}` : tmxUrl;
  let promise = cache.get(key);
  if (!promise) {
    promise = parseTiledArtMap(tmxUrl, nature ? { ...nature, day } : undefined);
    cache.set(key, promise);
  }
  return promise;
}

async function parseTiledArtMap(tmxUrl: string, nature?: NatureOptions & { day: string }): Promise<TiledArtMap> {
  const doc = await fetchXml(tmxUrl);
  const mapEl = doc.querySelector('map')!;
  const mapWidth = Number(attr(mapEl, 'width'));
  const mapHeight = Number(attr(mapEl, 'height'));
  const tileWidth = Number(attr(mapEl, 'tilewidth'));
  const tileHeight = Number(attr(mapEl, 'tileheight'));

  const tilesetEls = Array.from(mapEl.querySelectorAll(':scope > tileset'));
  const tilesets = await Promise.all(tilesetEls.map(el => resolveTileset(el, tmxUrl)));

  // Layer contract: Ground, Ground Detail, Shadows, Objects Base (solid, draws
  // behind the player), Objects Top (never solid, draws in front of the
  // player). Hidden layers are skipped; any other name counts as Objects Base.
  const layerEls = Array.from(mapEl.querySelectorAll(':scope > layer'));
  const roleOf = new Map<string, LayerRole>();
  const layers: TiledArtLayer[] = [];
  for (const layerEl of layerEls) {
    const name = attr(layerEl, 'name');
    if (attr(layerEl, 'visible') === '0') continue;
    const role = roleFor(name);
    roleOf.set(name, role);
    layers.push({
      name,
      data: parseCsvLayerData(layerEl.querySelector('data')!),
      opacity: attr(layerEl, 'opacity') === '' ? 1 : Number(attr(layerEl, 'opacity')),
    });
  }
  if (!layers.some(l => roleOf.get(l.name) === 'ground')) {
    throw new Error(`${tmxUrl} has no visible "Ground" tile layer.`);
  }
  layers.sort((a, b) => ROLE_ORDER.indexOf(roleOf.get(a.name)!) - ROLE_ORDER.indexOf(roleOf.get(b.name)!));
  let belowPlayerLayers = layers.filter(l => roleOf.get(l.name) !== 'top').map(l => l.name);
  let abovePlayerLayers = layers.filter(l => roleOf.get(l.name) === 'top').map(l => l.name);
  const layerOpacity: Record<string, number> = {};
  for (const l of layers) layerOpacity[l.name] = l.opacity;

  // Collision: any objectgroup whose name contains "collision" contributes
  // blocking rects. Everything else stays walkable (and, per this map's
  // design, doubles as a wild-encounter tile — there's no separate "town"
  // tile type here).
  const objectGroupEls = Array.from(mapEl.querySelectorAll(':scope > objectgroup'));
  const noEncounterRects: Rect[] = [];
  const portals: TiledArtPortal[] = [];
  let spawnTile: { x: number; y: number } | null = null;
  let recyclerTile: { x: number; y: number } | null = null;
  const keepClearRects: NatureRect[] = [];
  const collisionRects: Rect[] = [];
  const forestRects: NatureRect[] = [];
  // "Tree Row": points where a tree grows every day (the town's line of trees under its top hedge).
  const treeSpots: { x: number; y: number }[] = [];
  for (const groupEl of objectGroupEls) {
    const groupName = attr(groupEl, 'name');
    const objectEls = Array.from(groupEl.querySelectorAll('object'));
    if (/tree\s*row/i.test(groupName)) {
      for (const o of objectEls) treeSpots.push({ x: Math.floor(Number(attr(o, 'x')) / tileWidth), y: Math.floor(Number(attr(o, 'y')) / tileHeight) });
    } else if (/collision/i.test(groupName)) {
      collisionRects.push(...objectEls.map(parseObjectRect).filter(r => r.width > 0 && r.height > 0));
    } else if (/keep\s*clear/i.test(groupName)) {
      keepClearRects.push(...objectEls.map(parseObjectRect));
    } else if (/forest/i.test(groupName)) {
      forestRects.push(...objectEls.map(parseObjectRect));
    } else if (/encounter/i.test(groupName)) {
      noEncounterRects.push(...objectEls.map(parseObjectRect));
    } else if (/spawn/i.test(groupName)) {
      const spawnEl = objectEls.find(o => /spawn/i.test(attr(o, 'name'))) ?? objectEls[0];
      if (spawnEl) {
        const rect = parseObjectRect(spawnEl);
        spawnTile = { x: Math.floor(rect.x / tileWidth), y: Math.floor(rect.y / tileHeight) };
      }
    } else if (/recycler/i.test(groupName)) {
      if (objectEls[0]) {
        const rect = parseObjectRect(objectEls[0]);
        recyclerTile = { x: Math.floor(rect.x / tileWidth), y: Math.floor(rect.y / tileHeight) };
      }
    } else if (/portal/i.test(groupName)) {
      for (const objectEl of objectEls) {
        // Accept either a custom "region" property or the object's own Name
        // field set to a region id (simpler to author — just rename the
        // point in Tiled) — whichever is present.
        const regionId = regionIdFrom((parseObjectProperty(objectEl, 'region') ?? attr(objectEl, 'name')).trim());
        if (!regionId) {
          console.warn(`[tiledArtMap] Portal object in "${groupName}" has no region id (set a "region" property or name the object) — skipping.`);
          continue;
        }
        if (!REGIONS[regionId]) {
          console.warn(`[tiledArtMap] Portal object in "${groupName}" references unknown region "${regionId}" — skipping.`);
          continue;
        }
        const rect = parseObjectRect(objectEl);
        portals.push({ x: Math.floor(rect.x / tileWidth), y: Math.floor(rect.y / tileHeight), regionId });
      }
    }
  }

  // No spawn point drawn: a region map starts at its entrance from the Ledger's Heart.
  if (!spawnTile) {
    const door = portals.find(p => p.regionId === 'ledgers_heart');
    spawnTile = door ? stepInside(door, mapWidth, mapHeight) : { x: 1, y: 1 };
  }

  // Tiles the tilesets mark solid (water, lava), and tiles under a "collision" box.
  const solidGids = new Set<number>();
  const walkableGids = new Set<number>();
  const lightGids = new Set<number>();
  const animatedTiles: Record<number, { frames: number[]; ms: number }> = {};
  for (const ts of tilesets) {
    for (const id of ts.solid) solidGids.add(ts.firstgid + id);
    for (const id of ts.walkable) walkableGids.add(ts.firstgid + id);
    for (const id of ts.light) lightGids.add(ts.firstgid + id);
    for (const [id, a] of Object.entries(ts.anims)) {
      animatedTiles[ts.firstgid + Number(id)] = { frames: a.frames.map(f => ts.firstgid + f), ms: a.ms };
    }
  }
  const stands = (g: number) => g !== 0 && !walkableGids.has(g & 0x1fffffff);
  const inCollision = (x: number, y: number) => {
    const cx = (x + 0.5) * tileWidth, cy = (y + 0.5) * tileHeight;
    return collisionRects.some(r => cx >= r.x && cx <= r.x + r.width && cy >= r.y && cy <= r.y + r.height);
  };
  const hardBlocked: boolean[] = new Array(mapWidth * mapHeight).fill(false);
  for (let y = 0; y < mapHeight; y++) for (let x = 0; x < mapWidth; x++) {
    const i = y * mapWidth + x;
    hardBlocked[i] = inCollision(x, y) || layers.some(l => solidGids.has(l.data[i] & 0x1fffffff));
  }

  // The day's nature layer: bushes go on Objects Base, grass, rocks and flowers on Ground
  // Detail (made if the map has none), trees are drawn by the scene.
  let trees: NatureTree[] = [];
  let flowers: { x: number; y: number }[] = [];
  if (nature) {
    const ensure = (role: LayerRole, name: string) => {
      let l = layers.find(x => roleOf.get(x.name) === role);
      if (!l) {
        l = { name, data: new Array(mapWidth * mapHeight).fill(0), opacity: 1 };
        roleOf.set(name, role);
        layers.push(l);
        layers.sort((a, b) => ROLE_ORDER.indexOf(roleOf.get(a.name)!) - ROLE_ORDER.indexOf(roleOf.get(b.name)!));
        layerOpacity[name] = 1;
      }
      return l;
    };
    const ground = layers.find(l => roleOf.get(l.name) === 'ground')!;
    const detail = ensure('detail', 'Ground Detail');
    const base = ensure('base', 'Objects Base');
    // Nothing grows on cliffs, skirts or liquid either, nor on the town's buildings and fences
    // (plants may grow in a shadow).
    const occupied = hardBlocked.map((b, i) => b || layers.some(l => l !== ground && l !== detail && l !== base && roleOf.get(l.name) !== 'liquid' && roleOf.get(l.name) !== 'shadows' && l.data[i] !== 0));
    // Things standing on the ground (other than the layer nature grows bushes on) can't be walked through.
    const standing = layers.filter(l => roleOf.get(l.name) === 'base' && l !== base);
    const walls = hardBlocked.map((b, i) => b || standing.some(l => stands(l.data[i])));
    const firstgid: Record<string, number> = {};
    for (const ts of tilesets) firstgid[ts.name] = ts.firstgid;
    const grown = growNature({
      regionId: nature.regionId, day: nature.day, width: mapWidth, height: mapHeight, tileSize: tileWidth,
      ground: ground.data, detail: detail.data, base: base.data, firstgid,
      spawn: spawnTile, portals, recycler: recyclerTile, reserved: nature.reserved,
      keepClear: keepClearRects, forest: forestRects, treeSpots, occupied, blocked: walls,
    });
    detail.data = grown.detail;
    base.data = grown.base;
    trees = grown.trees;
    flowers = grown.flowers;
    if (grown.overhang.some(g => g !== 0)) {
      const top = ensure('top', 'Nature Overhang');
      top.data = top.data.map((g, i) => grown.overhang[i] || g);
    }
    belowPlayerLayers = layers.filter(l => roleOf.get(l.name) !== 'top').map(l => l.name);
    abovePlayerLayers = layers.filter(l => roleOf.get(l.name) === 'top').map(l => l.name);
  }
  const trunkAt = new Set(trees.map(t => `${t.x},${t.y}`));

  const baseLayers = layers.filter(l => roleOf.get(l.name) === 'base');
  const layout: MapTile[][] = [];
  for (let y = 0; y < mapHeight; y++) {
    const row: MapTile[] = [];
    for (let x = 0; x < mapWidth; x++) {
      const cx = (x + 0.5) * tileWidth;
      const cy = (y + 0.5) * tileHeight;
      const inRect = (r: Rect) => cx >= r.x && cx <= r.x + r.width && cy >= r.y && cy <= r.y + r.height;
      // Painted means blocked: any tile on an Objects Base layer is solid (but see-through ones).
      const blocked = baseLayers.some(l => stands(l.data[y * mapWidth + x])) || trunkAt.has(`${x},${y}`) || hardBlocked[y * mapWidth + x];
      const noEncounter = !blocked && noEncounterRects.some(inRect);
      row.push({ type: blocked ? 'wall' : noEncounter ? 'path' : 'grass' });
    }
    layout.push(row);
  }
  // Land nobody can walk to (across a river, behind a cliff) counts as solid too, so no trash,
  // scroll, curio, bot or other player ever lands there. Walk out from the start and every door.
  const reached = new Uint8Array(mapWidth * mapHeight);
  const todo = [spawnTile, ...portals.map(p => stepInside(p, mapWidth, mapHeight))]
    .filter(t => layout[t.y]?.[t.x] && layout[t.y][t.x].type !== 'wall');
  for (const t of todo) reached[t.y * mapWidth + t.x] = 1;
  while (todo.length) {
    const { x, y } = todo.pop()!;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 0 || ny < 0 || nx >= mapWidth || ny >= mapHeight || reached[ny * mapWidth + nx]) continue;
      if (layout[ny][nx].type === 'wall') continue;
      reached[ny * mapWidth + nx] = 1;
      todo.push({ x: nx, y: ny });
    }
  }
  if (reached.some(Boolean)) {
    for (let y = 0; y < mapHeight; y++) for (let x = 0; x < mapWidth; x++) {
      if (!reached[y * mapWidth + x]) layout[y][x] = { type: 'wall' };
    }
  }

  const liquidLayers = layers.filter(l => roleOf.get(l.name) === 'liquid');
  const liquid = layout.map((row, y) => row.map((_, x) => liquidLayers.some(l => l.data[y * mapWidth + x] !== 0)));
  // Sand: the recolored light-dirt blobs of TileSet-tide (columns 10-19, rows 0-9), on any layer
  // under the player, with no liquid under it.
  const tide = tilesets.find(ts => ts.name === 'TileSet-tide');
  const isSand = (g: number) => {
    if (!tide || g < tide.firstgid || g >= tide.firstgid + tide.tilecount) return false;
    const id = g - tide.firstgid, col = id % tide.columns, row = Math.floor(id / tide.columns);
    return col >= 10 && col < 20 && row < 10;
  };
  const sand = layout.map((row, y) => row.map((_, x) => !liquid[y][x] && layers.some(l => roleOf.get(l.name) !== 'top' && isSand(l.data[y * mapWidth + x] & 0x1fffffff))));

  // Foliage = anything drawn on Objects Top (canopy that covers the player);
  // used only to keep spawned markers from hiding under it.
  const foliageLayers = layers.filter(l => roleOf.get(l.name) === 'top');
  const foliage: boolean[][] = [];
  for (let y = 0; y < mapHeight; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < mapWidth; x++) {
      row.push(foliageLayers.some(l => l.data[y * mapWidth + x] !== 0));
    }
    foliage.push(row);
  }
  // A grown tree's leaves cover 3 tiles across and 4 up from its trunk.
  for (const t of trees) {
    for (let dy = -3; dy <= 0; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (foliage[t.y + dy]?.[t.x + dx] !== undefined) foliage[t.y + dy][t.x + dx] = true;
    }
  }

  const lights: { x: number; y: number }[] = [];
  if (lightGids.size) {
    for (const l of layers) l.data.forEach((g, i) => {
      if (lightGids.has(g & 0x1fffffff)) lights.push({ x: i % mapWidth, y: Math.floor(i / mapWidth) });
    });
  }

  const tilesetImages: Record<string, string> = {};
  for (const ts of tilesets) tilesetImages[ts.name] = resolve(ts.image, tmxUrl);

  const mapJson = {
    width: mapWidth,
    height: mapHeight,
    tilewidth: tileWidth,
    tileheight: tileHeight,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    layers: layers.map(l => ({ type: 'tilelayer', name: l.name, width: mapWidth, height: mapHeight, data: l.data, opacity: l.opacity, visible: true })),
    tilesets: tilesets.map(ts => ({
      firstgid: ts.firstgid,
      name: ts.name,
      image: `tileset:${ts.name}`, // placeholder; Phaser resolves via addTilesetImage's key, not this string
      imagewidth: ts.imagewidth,
      imageheight: ts.imageheight,
      tilewidth: ts.tilewidth,
      tileheight: ts.tileheight,
      columns: ts.columns,
      tilecount: ts.tilecount,
      margin: ts.margin,
      spacing: ts.spacing,
    })),
  };

  return {
    mapJson,
    tilesetImages,
    mapWidth,
    mapHeight,
    tileSize: tileWidth,
    belowPlayerLayers,
    abovePlayerLayers,
    layerOpacity,
    layout,
    spawn: spawnTile,
    recycler: recyclerTile,
    portals,
    foliage,
    trees,
    animatedTiles,
    liquid,
    sand,
    flowers,
    lights,
  };
}
