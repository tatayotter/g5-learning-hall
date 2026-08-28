'use client';
// components/dev/RoomSandboxPrototype.tsx
// Unwired playroom sandbox — no Supabase, no gold, no ownership. Every
// decoration in CATALOG is available for free so ideas can be tinkered with
// directly. Canvas is a fixed 720x450 logical box (wall zone top 64%, floor
// zone bottom 36%) scaled responsively via aspect-ratio. Placement rule:
// floor items anchor at their visual bottom-center and must stay in the
// floor zone; wall items anchor at their visual top-center and must stay in
// the wall zone. Sprites themselves are free to extend past that boundary —
// only the anchor point is constrained.

import { useCallback, useRef, useState } from 'react';

type Zone = 'wall' | 'floor';

type CatalogItem = {
  id: string;
  zone: Zone;
  label: string;
  icon: string; // tabler icon class suffix
  color: string;
  w: number; // px at 1x scale, base (unrotated/unscaled) footprint
  h: number;
};

type PlacedItem = {
  instanceId: string;
  catalogId: string;
  xPct: number; // anchor x, 0-100, relative to canvas width
  yPct: number; // anchor y, 0-100, relative to canvas height
  rotation: number;
  scale: number;
  z: number;
};

const CANVAS_W = 720;
const CANVAS_H = 450;
const WALL_H_PCT = 64; // wall zone occupies top 64% of canvas height
const FLOOR_H_PCT = 100 - WALL_H_PCT;

const CATALOG: CatalogItem[] = [
  { id: 'chair', zone: 'floor', label: 'Chair', icon: '\u{1FA91}', color: '#8b5cf6', w: 60, h: 54 },
  { id: 'bookshelf', zone: 'floor', label: 'Bookshelf', icon: '\u{1F4DA}', color: '#7a4a0f', w: 78, h: 90 },
  { id: 'plant', zone: 'floor', label: 'Plant', icon: '\u{1FAB4}', color: '#40916c', w: 46, h: 58 },
  { id: 'piano', zone: 'floor', label: 'Piano', icon: '\u{1F3B9}', color: '#db2777', w: 90, h: 70 },
  { id: 'curio', zone: 'floor', label: 'Curio', icon: '\u{1F43E}', color: '#ff6b35', w: 50, h: 50 },
  { id: 'avatar', zone: 'floor', label: 'Avatar', icon: '\u{1F9CD}', color: '#ec4899', w: 44, h: 96 },
  { id: 'frame', zone: 'wall', label: 'Frame', icon: '\u{1F5BC}\u{FE0F}', color: '#7a4a0f', w: 56, h: 40 },
  { id: 'clock', zone: 'wall', label: 'Clock', icon: '\u{1F55B}', color: '#a78bfa', w: 42, h: 42 },
  { id: 'shelf', zone: 'wall', label: 'Shelf', icon: '\u{1F4DA}', color: '#c9781a', w: 70, h: 24 },
  { id: 'bubble', zone: 'wall', label: 'Word bubble', icon: '\u{1F4AC}', color: '#ec4899', w: 60, h: 44 },
];

function catalogById(id: string): CatalogItem {
  const found = CATALOG.find((c) => c.id === id);
  if (!found) throw new Error(`unknown catalog item ${id}`);
  return found;
}

let nextZ = 1;
let nextInstance = 1;

export default function RoomSandboxPrototype() {
  const [placed, setPlaced] = useState<PlacedItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{ instanceId: string; pointerId: number } | null>(null);

  const addItem = useCallback((catalogId: string) => {
    const cat = catalogById(catalogId);
    const yPct = cat.zone === 'wall' ? WALL_H_PCT * 0.4 : WALL_H_PCT + FLOOR_H_PCT * 0.6;
    const instanceId = `i${nextInstance++}`;
    setPlaced((prev) => [
      ...prev,
      { instanceId, catalogId, xPct: 50, yPct, rotation: 0, scale: 1, z: nextZ++ },
    ]);
    setSelectedId(instanceId);
  }, []);

  const clampToZone = useCallback((zone: Zone, yPct: number) => {
    if (zone === 'wall') return Math.min(Math.max(yPct, 2), WALL_H_PCT - 2);
    return Math.min(Math.max(yPct, WALL_H_PCT + 2), 100 - 2);
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent, instanceId: string) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragState.current = { instanceId, pointerId: e.pointerId };
    setSelectedId(instanceId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragState.current;
    if (!drag || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPctRaw = ((e.clientY - rect.top) / rect.height) * 100;
    setPlaced((prev) =>
      prev.map((p) => {
        if (p.instanceId !== drag.instanceId) return p;
        const cat = catalogById(p.catalogId);
        return {
          ...p,
          xPct: Math.min(Math.max(xPct, 2), 98),
          yPct: clampToZone(cat.zone, yPctRaw),
        };
      }),
    );
  }, [clampToZone]);

  const onPointerUp = useCallback(() => {
    dragState.current = null;
  }, []);

  const mutateSelected = useCallback((fn: (p: PlacedItem) => PlacedItem) => {
    setPlaced((prev) => prev.map((p) => (p.instanceId === selectedId ? fn(p) : p)));
  }, [selectedId]);

  const removeSelected = useCallback(() => {
    setPlaced((prev) => prev.filter((p) => p.instanceId !== selectedId));
    setSelectedId(null);
  }, [selectedId]);

  const selected = placed.find((p) => p.instanceId === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-4 w-full max-w-3xl">
      <div className="flex flex-wrap gap-2">
        {CATALOG.map((c) => (
          <button
            key={c.id}
            onClick={() => addItem(c.id)}
            className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white hover:bg-white/10"
          >
            <span style={{ fontSize: 16 }} aria-hidden="true">{c.icon}</span>
            {c.label}
            <span className="text-white/40">{c.zone}</span>
          </button>
        ))}
      </div>

      <div
        ref={canvasRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerDown={() => setSelectedId(null)}
        style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}`, touchAction: 'none' }}
        className="relative w-full max-w-[720px] mx-auto rounded-xl overflow-hidden border border-white/15 select-none"
      >
        <div
          style={{ height: `${WALL_H_PCT}%`, background: '#f9ddf0' }}
          className="absolute top-0 left-0 right-0"
        />
        <div
          style={{ height: `${FLOOR_H_PCT}%`, background: '#c9781a' }}
          className="absolute bottom-0 left-0 right-0"
        />
        <div
          style={{ top: `${WALL_H_PCT}%` }}
          className="absolute left-0 right-0 h-px bg-black/20 pointer-events-none"
        />

        {[...placed].sort((a, b) => a.z - b.z).map((p) => {
          const cat = catalogById(p.catalogId);
          const isWall = cat.zone === 'wall';
          const isSelected = p.instanceId === selectedId;
          return (
            <div
              key={p.instanceId}
              onPointerDown={(e) => onPointerDown(e, p.instanceId)}
              style={{
                position: 'absolute',
                left: `${p.xPct}%`,
                top: `${p.yPct}%`,
                width: cat.w,
                height: cat.h,
                transform: `translate(-50%, ${isWall ? '0%' : '-100%'}) rotate(${p.rotation}deg) scale(${p.scale})`,
                transformOrigin: isWall ? 'top center' : 'bottom center',
                zIndex: p.z,
                cursor: 'grab',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: cat.color,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  outline: isSelected ? '2px solid #fff' : 'none',
                  outlineOffset: 2,
                }}
              >
                <span style={{ fontSize: Math.min(cat.w, cat.h) * 0.45 }} aria-hidden="true">{cat.icon}</span>
              </div>
              <div
                style={{
                  position: 'absolute',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#22d3ee',
                  left: '50%',
                  top: isWall ? 0 : '100%',
                  transform: 'translate(-50%, -50%)',
                }}
                title="anchor point"
              />
            </div>
          );
        })}
      </div>

      {selected && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white">
          <span className="text-white/60">{catalogById(selected.catalogId).label} selected</span>
          <button className="rounded border border-white/20 px-2 py-1" onClick={() => mutateSelected((p) => ({ ...p, rotation: p.rotation - 15 }))}>
            ↺ rotate -
          </button>
          <button className="rounded border border-white/20 px-2 py-1" onClick={() => mutateSelected((p) => ({ ...p, rotation: p.rotation + 15 }))}>
            ↻ rotate +
          </button>
          <button className="rounded border border-white/20 px-2 py-1" onClick={() => mutateSelected((p) => ({ ...p, scale: Math.max(0.4, p.scale - 0.1) }))}>
            scale -
          </button>
          <button className="rounded border border-white/20 px-2 py-1" onClick={() => mutateSelected((p) => ({ ...p, scale: Math.min(2.2, p.scale + 0.1) }))}>
            scale +
          </button>
          <button className="rounded border border-white/20 px-2 py-1" onClick={() => mutateSelected((p) => ({ ...p, z: nextZ++ }))}>
            front
          </button>
          <button className="rounded border border-white/20 px-2 py-1" onClick={() => mutateSelected((p) => ({ ...p, z: -(nextZ++) }))}>
            back
          </button>
          <button className="rounded border border-red-400/40 text-red-300 px-2 py-1" onClick={removeSelected}>
            delete
          </button>
        </div>
      )}

      <p className="text-[11px] text-white/40">
        Cyan dot = anchor point. Floor items anchor bottom-center and stay in the floor zone; wall items anchor top-center and stay in the wall zone. Drag to move, use the toolbar to rotate/scale/layer. Nothing here is saved or wired to gold/inventory.
      </p>
    </div>
  );
}
