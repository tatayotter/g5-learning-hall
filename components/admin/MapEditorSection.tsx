'use client';
// components/admin/MapEditorSection.tsx
// Dev-only RPG-Maker-XP-style tile map editor: ground/terrain/roads are a
// single pre-painted background image (set below in the "Ground Background"
// panel); pick a tile from a tileset sheet (including full corner-based
// autotiling, see lib/tileEngine/autotile.ts) and paint it onto one of 2
// stacked layers (decoration/overhang) on top of that image, then export
// JSON. Purely an authoring tool — wiring the live game screen to render
// this format is a separate, later pass; nothing here writes to the
// database. The only persistence is a localStorage draft so an accidental
// refresh doesn't lose in-progress work.
import { useState, useEffect, useRef, useCallback } from 'react';
import type { Element } from '@/lib/monsterConfig';
import { REGIONS } from '@/lib/regions';
import {
  LAYER_IDS, LAYER_LABELS, type LayerId, type TileGrid, type TileRef,
  type TileMapData, type TilePropertyMap,
} from '@/lib/tileEngine/types';
import { TILESETS, TILESET_LIST, DEFAULT_TILE_PROPERTIES } from '@/lib/tileEngine/tilesets';
import { blankLayers, resizeLayers, clamp, isValidTileMap, tilePropKey } from '@/lib/tileEngine/mapUtils';
import { LayerStack, AutotileSwatch } from '@/components/admin/tileRendering';
import MapPlaytest from './MapPlaytest';

type Tool = 'paint' | 'eraser' | 'spawn' | 'town';

interface MetaState {
  id: string;
  name: string;
  lore: string;
  element: Element | 'all';
  unlockLevel: number;
}

const TILE_SIZE = 32;
// 32x18 tiles @ 32px = 1024x576, an exact 16:9 canvas — matches the
// 1920x1080 ground background aspect ratio 1:1 so it stretches to fill
// without distortion. Keep width:height at 16:9 if you resize.
const DEFAULT_WIDTH = 32;
const DEFAULT_HEIGHT = 18;
const DRAFT_KEY = 'g5-tile-map-editor-draft-v2';
const ZOOM_LEVELS = [0.5, 1, 2];

const ELEMENT_OPTIONS: (Element | 'all')[] = ['all', 'fire', 'water', 'leaf', 'storm', 'shadow', 'light'];

function defaultMeta(): MetaState {
  return { id: '', name: '', lore: '', element: 'all', unlockLevel: 1 };
}

function buildExport(
  width: number, height: number, backgroundImage: string, layers: Record<LayerId, TileGrid>, meta: MetaState,
  spawn: { x: number; y: number }, townCenter: { x: number; y: number },
  tileProperties: Record<string, TilePropertyMap>,
): TileMapData {
  return { schemaVersion: 1, tileSize: TILE_SIZE, width, height, backgroundImage, layers, spawn, townCenter, tileProperties, ...meta };
}

export default function MapEditorSection() {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [widthInput, setWidthInput] = useState(String(DEFAULT_WIDTH));
  const [heightInput, setHeightInput] = useState(String(DEFAULT_HEIGHT));
  const [layers, setLayers] = useState<Record<LayerId, TileGrid>>(() => blankLayers(DEFAULT_WIDTH, DEFAULT_HEIGHT));
  const [layerVisible, setLayerVisible] = useState<Record<LayerId, boolean>>({ decoration: true, overhang: true });
  const [activeLayer, setActiveLayer] = useState<LayerId>('decoration');
  const [backgroundImage, setBackgroundImage] = useState('');
  const [meta, setMeta] = useState<MetaState>(defaultMeta);
  const [spawn, setSpawn] = useState({ x: 1, y: 1 });
  const [townCenter, setTownCenter] = useState({ x: 1, y: 1 });
  const [tileProperties, setTileProperties] = useState<Record<string, TilePropertyMap>>(DEFAULT_TILE_PROPERTIES);

  const [tool, setTool] = useState<Tool>('paint');
  const [selectedTilesetId, setSelectedTilesetId] = useState(TILESET_LIST[0].id);
  const [selectedTile, setSelectedTile] = useState<TileRef>({ tilesetId: TILESET_LIST[0].id });
  const [zoom, setZoom] = useState(1);

  const [referenceRegionId, setReferenceRegionId] = useState('');
  const [showReference, setShowReference] = useState(true);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [copyLabel, setCopyLabel] = useState('Copy to clipboard');
  const [draftBanner, setDraftBanner] = useState<TileMapData | null>(null);
  const [playtestOpen, setPlaytestOpen] = useState(false);

  const isPaintingRef = useRef(false);
  const hydratedRef = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isValidTileMap(parsed)) setDraftBanner(parsed);
      }
    } catch { /* ignore malformed draft */ }
    hydratedRef.current = true;
  }, []);

  const hydrateFrom = useCallback((data: TileMapData) => {
    setWidth(data.width);
    setHeight(data.height);
    setWidthInput(String(data.width));
    setHeightInput(String(data.height));
    setBackgroundImage(data.backgroundImage ?? '');
    setLayers(data.layers);
    setMeta({ id: data.id, name: data.name, lore: data.lore, element: data.element, unlockLevel: data.unlockLevel });
    setSpawn(data.spawn);
    setTownCenter(data.townCenter);
    setTileProperties({ ...DEFAULT_TILE_PROPERTIES, ...data.tileProperties });
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(buildExport(width, height, backgroundImage, layers, meta, spawn, townCenter, tileProperties)));
      } catch { /* storage full/unavailable — non-critical */ }
    }, 500);
    return () => clearTimeout(t);
  }, [width, height, backgroundImage, layers, meta, spawn, townCenter, tileProperties]);

  const paintCell = useCallback((x: number, y: number) => {
    if (tool === 'spawn') { setSpawn({ x, y }); return; }
    if (tool === 'town') { setTownCenter({ x, y }); return; }
    setLayers(prev => ({
      ...prev,
      [activeLayer]: prev[activeLayer].map((row, ry) => ry !== y ? row : row.map((cell, rx) => {
        if (rx !== x) return cell;
        return tool === 'eraser' ? null : { ...selectedTile };
      })),
    }));
  }, [tool, activeLayer, selectedTile]);

  useEffect(() => {
    const stop = () => { isPaintingRef.current = false; };
    window.addEventListener('mouseup', stop);
    return () => window.removeEventListener('mouseup', stop);
  }, []);

  const newBlankMap = () => {
    setWidth(DEFAULT_WIDTH);
    setHeight(DEFAULT_HEIGHT);
    setWidthInput(String(DEFAULT_WIDTH));
    setHeightInput(String(DEFAULT_HEIGHT));
    setLayers(blankLayers(DEFAULT_WIDTH, DEFAULT_HEIGHT));
    setBackgroundImage('');
    setMeta(defaultMeta());
    setSpawn({ x: 1, y: 1 });
    setTownCenter({ x: 1, y: 1 });
    setTileProperties(DEFAULT_TILE_PROPERTIES);
  };

  const applyResize = () => {
    const w = clamp(Number(widthInput) || DEFAULT_WIDTH, 4, 64);
    const h = clamp(Number(heightInput) || DEFAULT_HEIGHT, 4, 64);
    if (w === width && h === height) return;
    setLayers(prev => resizeLayers(prev, w, h));
    setWidth(w);
    setHeight(h);
    setWidthInput(String(w));
    setHeightInput(String(h));
    setSpawn(s => ({ x: clamp(s.x, 0, w - 1), y: clamp(s.y, 0, h - 1) }));
    setTownCenter(t => ({ x: clamp(t.x, 0, w - 1), y: clamp(t.y, 0, h - 1) }));
  };

  const importJson = (text: string) => {
    try {
      const parsed = JSON.parse(text);
      if (!isValidTileMap(parsed)) { setImportError('That JSON doesn\'t match the tile map export shape.'); return; }
      hydrateFrom(parsed);
      setImportError('');
      setImportText('');
    } catch {
      setImportError('Invalid JSON.');
    }
  };

  const onFileChosen = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => importJson(String(reader.result ?? ''));
    reader.readAsText(file);
  };

  const downloadJson = () => {
    const json = JSON.stringify(buildExport(width, height, backgroundImage, layers, meta, spawn, townCenter, tileProperties), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${meta.id || 'map'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyJson = async () => {
    await navigator.clipboard.writeText(JSON.stringify(buildExport(width, height, backgroundImage, layers, meta, spawn, townCenter, tileProperties), null, 2));
    setCopyLabel('Copied!');
    setTimeout(() => setCopyLabel('Copy to clipboard'), 1500);
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setDraftBanner(null);
  };

  const selectedTileset = TILESETS[selectedTilesetId];
  const propKey = tilePropKey(selectedTile);
  const selectedProps = tileProperties[selectedTilesetId]?.[propKey] ?? { walkable: true };

  const setSelectedProps = (props: TilePropertyMap[string]) => {
    setTileProperties(prev => ({
      ...prev,
      [selectedTilesetId]: { ...prev[selectedTilesetId], [propKey]: props },
    }));
  };

  const referenceRegion = referenceRegionId ? REGIONS[referenceRegionId] : null;
  const displayTileSize = TILE_SIZE * zoom;

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-1">Map Editor</h2>
      <p className="text-gray-500 text-sm mb-6">
        RPG-Maker-style tile painter — pick a tile, paint a layer, export JSON. Editor only for now; nothing here writes to the database or the live game.
      </p>

      {draftBanner && (
        <div className="bg-blue-950/50 border border-blue-800 rounded-xl p-4 mb-6 flex items-center justify-between gap-4">
          <p className="text-sm text-blue-200">You have an unsaved draft from a previous session. Restore it?</p>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => { hydrateFrom(draftBanner); setDraftBanner(null); }} className="bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg">Restore</button>
            <button onClick={clearDraft} className="bg-neutral-800 hover:bg-neutral-700 text-gray-300 text-xs font-bold px-3 py-1.5 rounded-lg">Discard</button>
          </div>
        </div>
      )}

      {/* Load / New */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 mb-6">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Start</p>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <button onClick={newBlankMap} className="bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-bold px-4 py-2 rounded-lg">New blank map</button>
          <button onClick={clearDraft} className="text-xs text-gray-500 hover:text-gray-300 ml-auto">Clear saved draft</button>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <textarea
            value={importText}
            onChange={e => setImportText(e.target.value)}
            placeholder="Paste exported map JSON here…"
            rows={2}
            className="flex-1 min-w-[240px] bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-gray-300 font-mono focus:outline-none"
          />
          <button onClick={() => importJson(importText)} className="bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-bold px-4 py-2 rounded-lg">Load pasted JSON</button>
          <label className="bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-bold px-4 py-2 rounded-lg cursor-pointer">
            Upload file…
            <input type="file" accept=".json,application/json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFileChosen(f); e.target.value = ''; }} />
          </label>
        </div>
        {importError && <p className="text-red-400 text-xs mt-2">{importError}</p>}
      </div>

      {/* Metadata */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 mb-6">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">Map Metadata</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Region ID</label>
            <input value={meta.id} onChange={e => setMeta(m => ({ ...m, id: e.target.value }))} placeholder="e.g. sunlit_grove"
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Name</label>
            <input value={meta.name} onChange={e => setMeta(m => ({ ...m, name: e.target.value }))} placeholder="The Sunlit Grove"
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Element</label>
            <select value={meta.element} onChange={e => setMeta(m => ({ ...m, element: e.target.value as Element | 'all' }))}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none">
              {ELEMENT_OPTIONS.map(el => <option key={el} value={el}>{el}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Unlock Level</label>
            <input type="number" value={meta.unlockLevel} onChange={e => setMeta(m => ({ ...m, unlockLevel: Number(e.target.value) }))}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Width (tiles)</label>
            <input type="number" value={widthInput} onChange={e => setWidthInput(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Height (tiles)</label>
            <input type="number" value={heightInput} onChange={e => setHeightInput(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none" />
          </div>
          <div className="flex items-end">
            <button onClick={applyResize} className="bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-bold px-4 py-2 rounded-lg w-full">Resize</button>
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Lore</label>
          <textarea value={meta.lore} onChange={e => setMeta(m => ({ ...m, lore: e.target.value }))} rows={2}
            className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none" />
        </div>
      </div>

      {/* Ground background */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 mb-6">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Ground Background</p>
        <p className="text-xs text-gray-500 mb-3">
          Ground/terrain/roads are a single pre-painted image now, not painted tiles. Drop a 1920x1080 PNG/WEBP into <code className="text-gray-400">public/maps/</code> and enter its path below. It stretches to fill the grid canvas, so keep the grid&apos;s pixel aspect ratio (width×{TILE_SIZE} : height×{TILE_SIZE}) close to 16:9 to avoid visible distortion.
        </p>
        <input
          value={backgroundImage}
          onChange={e => setBackgroundImage(e.target.value)}
          placeholder="/maps/sunlit_grove.png"
          className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none"
        />
      </div>

      {/* Reference art */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 mb-6">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Reference Art (existing maps, for tracing)</p>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={referenceRegionId}
            onChange={e => setReferenceRegionId(e.target.value)}
            className="bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="">None</option>
            {Object.values(REGIONS).map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          {referenceRegion && (
            <label className="flex items-center gap-2 text-xs text-gray-400">
              <input type="checkbox" checked={showReference} onChange={e => setShowReference(e.target.checked)} />
              Show underlay
            </label>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 mb-6">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">Grid</p>
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Palette */}
          <div className="lg:w-64 flex-shrink-0 space-y-4">
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Tileset</p>
              <select
                value={selectedTilesetId}
                onChange={e => {
                  const next = TILESETS[e.target.value];
                  setSelectedTilesetId(e.target.value);
                  setSelectedTile(next?.kind === 'normal' ? { tilesetId: e.target.value, col: 0, row: 0 } : { tilesetId: e.target.value });
                  setTool('paint');
                }}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white mb-2"
              >
                {TILESET_LIST.map(ts => <option key={ts.id} value={ts.id}>{ts.label}</option>)}
              </select>
              <div className="flex flex-wrap gap-1.5 bg-neutral-950 border border-neutral-800 rounded-lg p-2">
                {selectedTileset?.kind === 'normal' && Array.from({ length: selectedTileset.rows }).map((_, row) =>
                  Array.from({ length: selectedTileset.columns }).map((_, col) => {
                    const isActive = tool === 'paint' && selectedTile.col === col && selectedTile.row === row;
                    return (
                      <button
                        key={`${col}-${row}`}
                        onClick={() => { setSelectedTile({ tilesetId: selectedTileset.id, col, row }); setTool('paint'); }}
                        className={`relative border ${isActive ? 'border-amber-500' : 'border-neutral-800 hover:border-neutral-600'}`}
                        style={{ width: 32, height: 32 }}
                      >
                        <div className="absolute inset-0" style={selectedTileset.nativeSize ? {
                          backgroundImage: `url(${selectedTileset.image})`,
                          backgroundPosition: 'center bottom',
                          backgroundSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                        } : {
                          backgroundImage: `url(${selectedTileset.image})`,
                          backgroundPosition: `-${col * TILE_SIZE}px -${row * TILE_SIZE}px`,
                          backgroundSize: `${selectedTileset.columns * TILE_SIZE}px ${selectedTileset.rows * TILE_SIZE}px`,
                        }} />
                      </button>
                    );
                  })
                )}
                {selectedTileset?.kind === 'autotile' && (
                  <button
                    onClick={() => { setSelectedTile({ tilesetId: selectedTileset.id }); setTool('paint'); }}
                    className={`relative border ${tool === 'paint' && selectedTile.col === undefined ? 'border-amber-500' : 'border-neutral-800 hover:border-neutral-600'}`}
                  >
                    <AutotileSwatch image={selectedTileset.image} tileSize={TILE_SIZE} />
                  </button>
                )}
              </div>
            </div>

            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Tools</p>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setTool('eraser')} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${tool === 'eraser' ? 'bg-amber-900/40 border-amber-600 text-amber-300' : 'bg-neutral-950 border-neutral-700 text-gray-400 hover:text-white'}`}>Eraser</button>
                <button onClick={() => setTool('spawn')} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${tool === 'spawn' ? 'bg-amber-900/40 border-amber-600 text-amber-300' : 'bg-neutral-950 border-neutral-700 text-gray-400 hover:text-white'}`}>🚩 Set Spawn</button>
                <button onClick={() => setTool('town')} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${tool === 'town' ? 'bg-amber-900/40 border-amber-600 text-amber-300' : 'bg-neutral-950 border-neutral-700 text-gray-400 hover:text-white'}`}>🏠 Set Town Center</button>
              </div>
              <p className="text-[10px] text-gray-500 mt-2">Spawn: {spawn.x},{spawn.y} · Town: {townCenter.x},{townCenter.y}</p>
            </div>

            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Tile Properties</p>
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 space-y-2">
                <label className="flex items-center gap-2 text-xs text-gray-300">
                  <input type="checkbox" checked={selectedProps.walkable} onChange={e => setSelectedProps({ ...selectedProps, walkable: e.target.checked })} />
                  Walkable
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-300">
                  Encounter %
                  <input
                    type="number" min={0} max={100}
                    value={Math.round((selectedProps.encounterChance ?? 0) * 100)}
                    onChange={e => setSelectedProps({ ...selectedProps, encounterChance: clamp(Number(e.target.value), 0, 100) / 100 })}
                    className="w-16 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white font-mono"
                  />
                </label>
              </div>
            </div>

            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Layers</p>
              <div className="space-y-1">
                {LAYER_IDS.map(layerId => (
                  <div key={layerId} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border ${activeLayer === layerId ? 'bg-amber-900/40 border-amber-600' : 'bg-neutral-950 border-neutral-800'}`}>
                    <button onClick={() => setLayerVisible(v => ({ ...v, [layerId]: !v[layerId] }))} className="text-sm" title="Toggle visibility">
                      {layerVisible[layerId] ? '👁️' : '🚫'}
                    </button>
                    <button onClick={() => setActiveLayer(layerId)} className={`flex-1 text-left text-xs font-bold ${activeLayer === layerId ? 'text-amber-300' : 'text-gray-400 hover:text-white'}`}>
                      {LAYER_LABELS[layerId]}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Zoom</p>
              <div className="flex gap-1.5">
                {ZOOM_LEVELS.map(z => (
                  <button key={z} onClick={() => setZoom(z)} className={`px-3 py-1 rounded-lg text-xs font-bold border ${zoom === z ? 'bg-amber-900/40 border-amber-600 text-amber-300' : 'bg-neutral-950 border-neutral-700 text-gray-400 hover:text-white'}`}>
                    {z * 100}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 overflow-auto max-h-[640px] bg-neutral-950 border border-neutral-800 rounded-lg p-2">
            <div
              className="relative select-none"
              style={{ width: width * displayTileSize, height: height * displayTileSize }}
            >
              {backgroundImage && (
                <div
                  className="absolute inset-0"
                  style={{ backgroundImage: `url(${backgroundImage})`, backgroundSize: '100% 100%' }}
                />
              )}
              {showReference && referenceRegion && (
                <div
                  className="absolute inset-0 opacity-60"
                  style={{ backgroundImage: `url(${referenceRegion.mapImage})`, backgroundSize: '100% 100%' }}
                />
              )}
              <LayerStack
                width={width} height={height} layers={layers} tileSize={displayTileSize}
                layerIds={LAYER_IDS} layerVisible={layerVisible}
              />

              {/* Interactive hit-grid for the active layer only */}
              <div
                className="absolute inset-0 grid"
                style={{ gridTemplateColumns: `repeat(${width}, ${displayTileSize}px)`, gridTemplateRows: `repeat(${height}, ${displayTileSize}px)` }}
              >
                {Array.from({ length: height }).map((_, y) => Array.from({ length: width }).map((_, x) => {
                  const isSpawn = spawn.x === x && spawn.y === y;
                  const isTown = townCenter.x === x && townCenter.y === y;
                  return (
                    <div
                      key={`${x}-${y}`}
                      onMouseDown={() => { isPaintingRef.current = true; paintCell(x, y); }}
                      onMouseEnter={() => { if (isPaintingRef.current) paintCell(x, y); }}
                      title={`${x},${y}`}
                      className="relative border border-white/5 cursor-pointer hover:bg-white/10"
                    >
                      {isSpawn && <span className="absolute top-0 left-0 text-[10px] pointer-events-none">🚩</span>}
                      {isTown && <span className="absolute bottom-0 right-0 text-[10px] pointer-events-none">🏠</span>}
                    </div>
                  );
                }))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">Export</p>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setPlaytestOpen(true)} className="bg-purple-700 hover:bg-purple-600 text-white font-bold px-5 py-2 rounded-lg text-sm">▶ Playtest</button>
          <button onClick={downloadJson} className="bg-green-700 hover:bg-green-600 text-white font-bold px-5 py-2 rounded-lg text-sm">Download JSON</button>
          <button onClick={copyJson} className="bg-blue-700 hover:bg-blue-600 text-white font-bold px-5 py-2 rounded-lg text-sm">{copyLabel}</button>
        </div>
        {!meta.id.trim() && <p className="text-amber-400 text-xs mt-3">⚠️ Region ID is empty — set one before exporting.</p>}
      </div>

      {playtestOpen && (
        <MapPlaytest
          width={width} height={height} backgroundImage={backgroundImage} layers={layers} tileProperties={tileProperties} spawn={spawn}
          onClose={() => setPlaytestOpen(false)}
        />
      )}
    </div>
  );
}
