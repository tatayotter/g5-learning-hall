'use client';
// components/admin/MapPlaytest.tsx
// Live preview: walk the map currently open in the editor with a scrolling
// camera and an animated placeholder sprite, to test layout/passability
// before exporting. Reads the editor's in-memory state directly (no
// export/import round trip) and never writes anything back — purely a
// preview overlay. Movement is tile-stepped, same collision/encounter model
// as the live game (components/monster/TrainingMap.tsx), which this does
// NOT touch — wiring the real game screen to this format is a separate,
// later pass.
import { useState, useEffect, useCallback, useRef } from 'react';
import type { LayerId, TileGrid, TilePropertyMap } from '@/lib/tileEngine/types';
import { LAYER_IDS } from '@/lib/tileEngine/types';
import { getTileProperties, clamp } from '@/lib/tileEngine/mapUtils';
import { LayerStack } from '@/components/admin/tileRendering';
import { PLAYER_SPRITE, spriteFrameStyle, type SpriteDirection } from '@/lib/tileEngine/sprite';

const TILE_SIZE = 32;
const VIEWPORT_TILES_X = 12;
const VIEWPORT_TILES_Y = 9;
const VIEWPORT_WIDTH = VIEWPORT_TILES_X * TILE_SIZE;
const VIEWPORT_HEIGHT = VIEWPORT_TILES_Y * TILE_SIZE;

interface MapPlaytestProps {
  width: number;
  height: number;
  backgroundImage: string;
  layers: Record<LayerId, TileGrid>;
  tileProperties: Record<string, TilePropertyMap>;
  spawn: { x: number; y: number };
  onClose: () => void;
}

export default function MapPlaytest({ width, height, backgroundImage, layers, tileProperties, spawn, onClose }: MapPlaytestProps) {
  const [pos, setPos] = useState(spawn);
  const [direction, setDirection] = useState<SpriteDirection>('down');
  const [frame, setFrame] = useState(0);
  const [bumping, setBumping] = useState(false);
  const [encounterFlash, setEncounterFlash] = useState(false);
  const movementLocked = useRef(false);

  const isWalkable = useCallback((x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    const decoProps = getTileProperties(tileProperties, layers.decoration[y][x]);
    if (decoProps && !decoProps.walkable) return false;
    return true;
  }, [width, height, layers, tileProperties]);

  const encounterChanceAt = useCallback((x: number, y: number): number => {
    const decoProps = getTileProperties(tileProperties, layers.decoration[y][x]);
    return decoProps?.encounterChance ?? 0;
  }, [layers, tileProperties]);

  const move = useCallback((dx: number, dy: number, dir: SpriteDirection) => {
    setDirection(dir);
    if (movementLocked.current) return;
    const newX = pos.x + dx;
    const newY = pos.y + dy;
    if (!isWalkable(newX, newY)) {
      setBumping(false);
      requestAnimationFrame(() => setBumping(true));
      return;
    }
    movementLocked.current = true;
    setPos({ x: newX, y: newY });
    setFrame(f => (f + 1) % PLAYER_SPRITE.framesPerDirection);
    const chance = encounterChanceAt(newX, newY);
    if (chance > 0 && Math.random() < chance) {
      setEncounterFlash(true);
      setTimeout(() => setEncounterFlash(false), 700);
    }
    setTimeout(() => { movementLocked.current = false; }, 200);
  }, [pos, isWalkable, encounterChanceAt]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') move(0, -1, 'up');
      else if (e.key === 'ArrowDown') move(0, 1, 'down');
      else if (e.key === 'ArrowLeft') move(-1, 0, 'left');
      else if (e.key === 'ArrowRight') move(1, 0, 'right');
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [move, onClose]);

  const mapPxWidth = width * TILE_SIZE;
  const mapPxHeight = height * TILE_SIZE;
  const playerCenterX = (pos.x + 0.5) * TILE_SIZE;
  const playerCenterY = (pos.y + 0.5) * TILE_SIZE;
  const camX = clamp(playerCenterX - VIEWPORT_WIDTH / 2, 0, Math.max(0, mapPxWidth - VIEWPORT_WIDTH));
  const camY = clamp(playerCenterY - VIEWPORT_HEIGHT / 2, 0, Math.max(0, mapPxHeight - VIEWPORT_HEIGHT));

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center gap-4 p-4">
      <div className="flex items-center justify-between w-full max-w-[600px]">
        <p className="text-white font-bold">Playtest {encounterFlash && <span className="text-amber-400 ml-2">⚡ Encounter!</span>}</p>
        <button onClick={onClose} className="bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-bold px-4 py-1.5 rounded-lg">✕ Close</button>
      </div>

      <div
        className={`relative overflow-hidden border-2 border-neutral-700 rounded-lg ${bumping ? 'map-bump-shake' : ''}`}
        style={{ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT, background: '#111' }}
      >
        <div
          className="absolute transition-transform duration-200 ease-out"
          style={{ width: mapPxWidth, height: mapPxHeight, transform: `translate(${-camX}px, ${-camY}px)` }}
        >
          <div
            className="absolute inset-0"
            style={{ backgroundImage: `url(${backgroundImage})`, backgroundSize: '100% 100%' }}
          />
          <LayerStack
            width={width} height={height} layers={layers} tileSize={TILE_SIZE} layerIds={LAYER_IDS}
            aboveGroundAndDecoration={
              <div
                className="absolute transition-[left,top] duration-200 ease-out"
                style={{ left: pos.x * TILE_SIZE, top: pos.y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE }}
              >
                <div className="w-full h-full" style={spriteFrameStyle(PLAYER_SPRITE, direction, frame)} />
              </div>
            }
          />
        </div>
      </div>

      <div className="text-center text-xs text-gray-400">
        <p>Tile {pos.x},{pos.y} · Arrow keys to move · Esc to close</p>
      </div>
    </div>
  );
}
