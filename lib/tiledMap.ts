// lib/tiledMap.ts
// Parses a Tiled-editor JSON map (authored in the real Tiled app, or
// script-generated to match — see public/maps-tiled/) into the MapTile[][]
// grid TrainingMap.tsx already knows how to walk (grass/town/wall + spawn +
// town center). This is the authoring-format replacement for the hand-coded
// layout arrays in lib/regions.ts and the old in-app tile painter
// (components/admin/MapEditorSection.tsx, now retired).
//
// Deliberately does NOT render anything — the live map still draws its
// existing painted background image (see MapCanvas.tsx); this file only
// supplies the invisible walkability grid.
import { MAP_SIZE, type MapTile, type TileType } from './regions';

interface TiledTileProperty {
  name: string;
  type: string;
  value: unknown;
}

interface TiledTilesetTile {
  id: number;
  properties?: TiledTileProperty[];
}

interface TiledTileset {
  firstgid: number;
  tiles?: TiledTilesetTile[];
}

interface TiledTileLayer {
  name: string;
  type: string;
  width: number;
  height: number;
  data: number[];
}

interface TiledMapProperty {
  name: string;
  type: string;
  value: unknown;
}

interface TiledMapJson {
  width: number;
  height: number;
  tilesets: TiledTileset[];
  layers: (TiledTileLayer | { name: string; type: string })[];
  properties?: TiledMapProperty[];
}

export interface ParsedTiledMap {
  layout: MapTile[][];
  spawn: { x: number; y: number };
  townCenter: { x: number; y: number };
}

const cache = new Map<string, Promise<ParsedTiledMap>>();

function propValue(props: TiledMapProperty[] | undefined, name: string, fallback: number): number {
  const found = props?.find(p => p.name === name);
  return typeof found?.value === 'number' ? found.value : fallback;
}

function parseTiledMap(json: TiledMapJson): ParsedTiledMap {
  const layer = json.layers.find(
    (l): l is TiledTileLayer => l.type === 'tilelayer' && l.name === 'Logic'
  );
  if (!layer) throw new Error('Tiled map has no "Logic" tile layer');
  const tileset = json.tilesets[0];
  if (!tileset) throw new Error('Tiled map has no tileset');

  // Build a localId -> TileType lookup from the tileset's custom properties.
  const typeByLocalId = new Map<number, TileType>();
  for (const tile of tileset.tiles ?? []) {
    const typeProp = tile.properties?.find(p => p.name === 'type');
    if (typeof typeProp?.value === 'string') {
      typeByLocalId.set(tile.id, typeProp.value as TileType);
    }
  }

  const layout: MapTile[][] = Array.from({ length: layer.height }, (_, y) =>
    Array.from({ length: layer.width }, (_, x) => {
      const gid = layer.data[y * layer.width + x];
      const localId = gid - tileset.firstgid;
      const type = typeByLocalId.get(localId) ?? 'grass';
      return { type };
    })
  );

  return {
    layout,
    spawn: {
      x: propValue(json.properties, 'spawnX', 1),
      y: propValue(json.properties, 'spawnY', 1),
    },
    townCenter: {
      x: propValue(json.properties, 'townCenterX', 1),
      y: propValue(json.properties, 'townCenterY', 1),
    },
  };
}

// Fetched client-side (these live under public/, same as the map background
// images) and cached in-memory per path — every player loading the same
// region shares one parse + fetch.
export function loadTiledMap(path: string): Promise<ParsedTiledMap> {
  let pending = cache.get(path);
  if (!pending) {
    pending = fetch(path)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load Tiled map ${path}: ${res.status}`);
        return res.json();
      })
      .then((json: TiledMapJson) => parseTiledMap(json));
    cache.set(path, pending);
  }
  return pending;
}

// A blank MAP_SIZE x MAP_SIZE grass grid to render for one frame while the
// real Tiled map is still loading (fetch is async; the old buildMap()/regions
// arrays were synchronous). Avoids a null-map special case in TrainingMap.tsx.
export function blankLoadingMap(): MapTile[][] {
  return Array.from({ length: MAP_SIZE }, () =>
    Array.from({ length: MAP_SIZE }, () => ({ type: 'grass' as TileType }))
  );
}
