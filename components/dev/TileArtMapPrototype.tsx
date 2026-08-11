'use client';
// components/dev/TileArtMapPrototype.tsx
// Test harness for lib/phaserMap/TileArtMapScene.ts — the real-tile-art
// rendering trial (see app/dev/tile-art-map/page.tsx).
//
// Phaser's Tiled JSON parser only understands fully-embedded tilesets (name,
// image, columns, tilecount, ... all inline in the map JSON) — it can't
// resolve an external .tsx reference like Tiled writes by default when you
// "Add External Tileset" instead of embedding one. So before handing
// anything to Phaser, this fetches the map JSON, finds any `{firstgid,
// source}`-style external tileset entries, fetches + parses that .tsx XML
// file too, and merges the two into one fully-embedded tileset object —
// the same shape our own script-generated maps (e.g. ledgers_heart.json)
// already use natively.
import { useEffect, useRef, useState } from 'react';

const MAP_URL = '/maps-tiled-art/trial.json';

interface TiledEmbeddedTileset {
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
interface TiledExternalTileset {
  firstgid: number;
  source: string;
}
type TiledTilesetEntry = TiledEmbeddedTileset | TiledExternalTileset;

function isExternal(t: TiledTilesetEntry): t is TiledExternalTileset {
  return 'source' in t;
}

function attr(tag: string, name: string): string | undefined {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`));
  return m?.[1];
}

// Minimal .tsx (Tiled tileset XML) parser — good enough for the plain,
// single-image tilesets Tiled writes by default (no tile animations/terrain
// data needed for this rendering trial).
function parseTsx(xml: string): Omit<TiledEmbeddedTileset, 'firstgid'> {
  const tilesetTag = xml.match(/<tileset\b[^>]*>/)?.[0] ?? '';
  const imageTag = xml.match(/<image\b[^>]*\/?>/)?.[0] ?? '';
  return {
    name: attr(tilesetTag, 'name') ?? 'tileset',
    image: attr(imageTag, 'source') ?? '',
    imagewidth: Number(attr(imageTag, 'width') ?? 0),
    imageheight: Number(attr(imageTag, 'height') ?? 0),
    tilewidth: Number(attr(tilesetTag, 'tilewidth') ?? 32),
    tileheight: Number(attr(tilesetTag, 'tileheight') ?? 32),
    columns: Number(attr(tilesetTag, 'columns') ?? 1),
    tilecount: Number(attr(tilesetTag, 'tilecount') ?? 1),
    margin: Number(attr(tilesetTag, 'margin') ?? 0),
    spacing: Number(attr(tilesetTag, 'spacing') ?? 0),
  };
}

function resolve(relativePath: string, fromUrl: string): string {
  return new URL(relativePath, `${window.location.origin}${fromUrl}`).pathname;
}


export default function TileArtMapPrototype() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<import('phaser').Game | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let destroyed = false;

    (async () => {
      const res = await fetch(MAP_URL);
      if (!res.ok) {
        setError(`Couldn't find ${MAP_URL} yet — save your trial Tiled map there first.`);
        return;
      }
      const mapJson = await res.json();
      if (!mapJson.tilesets?.length) {
        setError('Map has no tilesets.');
        return;
      }

      const tilesetImages: Record<string, string> = {};
      const mergedTilesets: TiledEmbeddedTileset[] = await Promise.all(
        (mapJson.tilesets as TiledTilesetEntry[]).map(async (ts) => {
          if (!isExternal(ts)) return ts;
          const tsxUrl = resolve(ts.source, MAP_URL);
          const tsxRes = await fetch(tsxUrl);
          if (!tsxRes.ok) throw new Error(`Couldn't load external tileset ${ts.source} (${tsxUrl})`);
          const parsed = parseTsx(await tsxRes.text());
          return { firstgid: ts.firstgid, ...parsed };
        })
      );
      mapJson.tilesets = mergedTilesets;

      for (const ts of mergedTilesets) {
        // Embedded tilesets' `image` path is relative to wherever the
        // tileset was defined — the .tsx file's own location for external
        // ones, the map file's location for natively-embedded ones. Since
        // we already resolved external ones above via the .tsx's path, both
        // cases just need resolving against the map URL as a base (matches
        // Tiled's own convention of writing image paths relative to the
        // file that declares them, and both files live in the same folder
        // here in practice).
        tilesetImages[ts.name] = resolve(ts.image, MAP_URL);
      }

      const [{ default: Phaser }, { default: TileArtMapScene }] = await Promise.all([
        import('phaser'),
        import('@/lib/phaserMap/TileArtMapScene'),
      ]);
      if (destroyed || !containerRef.current) return;

      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: 896,
        height: 504,
        pixelArt: true,
        backgroundColor: '#1a1a1a',
        scene: [new TileArtMapScene({ mapJson, tilesetImages })],
      });
    })().catch(err => setError(String(err?.message ?? err)));

    return () => {
      destroyed = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <div ref={containerRef} className="border-2 border-neutral-700 rounded-lg overflow-hidden shadow-lg" style={{ width: 896, height: 504 }} />
      {error && <p className="text-sm text-red-400 max-w-md text-center">{error}</p>}
      <p className="text-xs text-gray-400">
        Save your Tiled trial map to <code className="text-gray-300">public/maps-tiled-art/trial.json</code> and refresh.
      </p>
    </div>
  );
}
