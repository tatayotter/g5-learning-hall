// hooks/useTrashItems.ts
// Client-side trash scavenging: the trash lying on the map. No DB writes.
// On region load, TRASH_SPAWN_COUNT items appear at random walkable tiles.
// Collecting all starts a 5-minute respawn countdown, then they reappear.
// What the player carries lives in the map item slots (lib/itemBar.ts).

import { useState, useEffect, useCallback, useRef } from 'react';
import { TRASH_DEFS, TRASH_SPAWN_COUNT, TRASH_RESPAWN_MS, type TrashType } from '@/lib/trashConfig';

export interface TrashItem {
  id: string;
  type: TrashType;
  x: number;
  y: number;
}

export type TrashInventory = Record<TrashType, number>;

function buildPool(): TrashType[] {
  const pool: TrashType[] = [];
  for (const [t, def] of Object.entries(TRASH_DEFS) as [TrashType, (typeof TRASH_DEFS)[TrashType]][]) {
    for (let i = 0; i < def.spawnWeight; i++) pool.push(t);
  }
  return pool;
}

function spawnTrash(
  walkableTiles: { x: number; y: number }[],
  occupied: { x: number; y: number }[],
): TrashItem[] {
  const blocked = new Set(occupied.map(o => `${o.x},${o.y}`));
  // Filter to eligible tiles (walkable and not occupied by a static entity)
  const eligible = walkableTiles.filter(t => !blocked.has(`${t.x},${t.y}`));
  if (eligible.length === 0) return [];
  // Shuffle a copy so we can slice without replacement
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  const pool = buildPool();
  return shuffled.slice(0, TRASH_SPAWN_COUNT).map((tile, i) => ({
    id: `trash_${Date.now()}_${i}`,
    type: pool[Math.floor(Math.random() * pool.length)],
    x: tile.x,
    y: tile.y,
  }));
}

export function useTrashItems(
  /** Grass/walkable tiles for the current map — trash only spawns here. */
  walkableTiles: { x: number; y: number }[],
  regionId: string,
  occupied: { x: number; y: number }[],
) {
  const [items, setItems]               = useState<TrashItem[]>([]);
  const [respawnSecsLeft, setSecsLeft]  = useState<number | null>(null);

  const timerRef          = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const tickRef           = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimeRef        = useRef<number | null>(null);
  // Latest tiles for the respawn timer, which fires outside any render.
  const occupiedRef       = useRef(occupied);
  const walkableRef       = useRef(walkableTiles);
  useEffect(() => {
    occupiedRef.current = occupied;
    walkableRef.current = walkableTiles;
  });

  const doRespawn = useCallback(() => {
    endTimeRef.current = null;
    setSecsLeft(null);
    setItems(spawnTrash(walkableRef.current, occupiedRef.current));
  }, []);

  const startRespawn = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (tickRef.current)  clearInterval(tickRef.current);
    endTimeRef.current = Date.now() + TRASH_RESPAWN_MS;
    setSecsLeft(Math.round(TRASH_RESPAWN_MS / 1000));
    tickRef.current = setInterval(() => {
      if (!endTimeRef.current) { clearInterval(tickRef.current!); return; }
      const left = Math.ceil((endTimeRef.current - Date.now()) / 1000);
      setSecsLeft(left > 0 ? left : null);
    }, 1000);
    timerRef.current = setTimeout(() => {
      clearInterval(tickRef.current!);
      doRespawn();
    }, TRASH_RESPAWN_MS);
  }, [doRespawn]);

  // Initial spawn + reset when region changes, once the real map has loaded (before that the
  // tiles are a blank placeholder, which put trash in rivers and waterfalls). Spawning is
  // random, so it can't happen during render; the region change is the trigger.
  const ready = walkableTiles.length > 0;
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (tickRef.current)  clearInterval(tickRef.current);
    endTimeRef.current = null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- random respawn keyed to region (see above)
    setSecsLeft(null);
    setItems(spawnTrash(walkableRef.current, occupiedRef.current));
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (tickRef.current)  clearInterval(tickRef.current);
    };
  }, [regionId, ready]);

  /** Remove item from the map (the caller has already put it in a slot). */
  const collectTrash = useCallback((id: string) => {
    setItems(prev => {
      if (!prev.some(i => i.id === id)) return prev;
      const next = prev.filter(i => i.id !== id);
      if (next.length === 0) setTimeout(startRespawn, 0);
      return next;
    });
  }, [startRespawn]);

  return { items, collectTrash, respawnSecsLeft };
}
