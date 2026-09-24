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
  'WaterTiles-6frames': '/tilesets/forgotten-memories/WaterTiles-6frames.png',
};

export interface TiledArtLayer {
  name: string;
  data: number[];
  opacity: number;
}

// The fixed layer contract every tile-art map follows (see
// public/maps-tiled-art/README.md). Role order is also draw order.
type LayerRole = 'ground' | 'detail' | 'shadows' | 'base' | 'top';
const ROLE_BY_NAME: Record<string, LayerRole> = {
  'ground': 'ground',
  'ground detail': 'detail',
  'shadows': 'shadows',
  'objects base': 'base',
  'objects top': 'top',
};
const ROLE_ORDER: LayerRole[] = ['ground', 'detail', 'shadows', 'base', 'top'];

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

const cache = new Map<string, Promise<TiledArtMap>>();

export function loadTiledArtMap(tmxUrl: string): Promise<TiledArtMap> {
  let promise = cache.get(tmxUrl);
  if (!promise) {
    promise = parseTiledArtMap(tmxUrl);
    cache.set(tmxUrl, promise);
  }
  return promise;
}

async function parseTiledArtMap(tmxUrl: string): Promise<TiledArtMap> {
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
  // player). Hidden layers are skipped; unknown names are warned about and
  // skipped rather than guessed at.
  const layerEls = Array.from(mapEl.querySelectorAll(':scope > layer'));
  const roleOf = new Map<string, LayerRole>();
  const layers: TiledArtLayer[] = [];
  for (const layerEl of layerEls) {
    const name = attr(layerEl, 'name');
    if (attr(layerEl, 'visible') === '0') continue;
    const role = ROLE_BY_NAME[name.trim().toLowerCase()];
    if (!role) {
      console.warn(`[tiledArtMap] Unknown tile layer "${name}" in ${tmxUrl} — skipped. Valid: Ground, Ground Detail, Shadows, Objects Base, Objects Top.`);
      continue;
    }
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
  const belowPlayerLayers = layers.filter(l => roleOf.get(l.name) !== 'top').map(l => l.name);
  const abovePlayerLayers = layers.filter(l => roleOf.get(l.name) === 'top').map(l => l.name);
  const layerOpacity: Record<string, number> = {};
  for (const l of layers) layerOpacity[l.name] = l.opacity;

  // Collision: any objectgroup whose name contains "collision" contributes
  // blocking rects. Everything else stays walkable (and, per this map's
  // design, doubles as a wild-encounter tile — there's no separate "town"
  // tile type here).
  const objectGroupEls = Array.from(mapEl.querySelectorAll(':scope > objectgroup'));
  const noEncounterRects: Rect[] = [];
  const portals: TiledArtPortal[] = [];
  let spawnTile = { x: 1, y: 1 };
  let recyclerTile: { x: number; y: number } | null = null;
  for (const groupEl of objectGroupEls) {
    const groupName = attr(groupEl, 'name');
    const objectEls = Array.from(groupEl.querySelectorAll('object'));
    if (/encounter/i.test(groupName)) {
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
        const regionId = (parseObjectProperty(objectEl, 'region') ?? attr(objectEl, 'name')).trim();
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

  const baseLayers = layers.filter(l => roleOf.get(l.name) === 'base');
  const layout: MapTile[][] = [];
  for (let y = 0; y < mapHeight; y++) {
    const row: MapTile[] = [];
    for (let x = 0; x < mapWidth; x++) {
      const cx = (x + 0.5) * tileWidth;
      const cy = (y + 0.5) * tileHeight;
      const inRect = (r: Rect) => cx >= r.x && cx <= r.x + r.width && cy >= r.y && cy <= r.y + r.height;
      // Painted means blocked: any tile on an Objects Base layer is solid.
      const blocked = baseLayers.some(l => l.data[y * mapWidth + x] !== 0);
      const noEncounter = !blocked && noEncounterRects.some(inRect);
      row.push({ type: blocked ? 'wall' : noEncounter ? 'path' : 'grass' });
    }
    layout.push(row);
  }

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
  };
}
