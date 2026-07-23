'use client';
import { useState } from 'react';
import { Element, ELEMENT_ICON_SRC } from '@/lib/monsterConfig';
import { REGIONS, ELEMENT_COLOR, REGION_BY_ELEMENT, Region } from '@/lib/regions';

interface WorldMapProps {
  playerLevel: number;
  onSelectRegion: (regionId: string) => void;
}

const RING_ELEMENTS: Element[] = ['fire', 'water', 'leaf', 'storm', 'shadow', 'light'];

// Each region's hotspot angle (degrees clockwise from top) and radius
// (% of container), hand-measured against the actual worldmap.webp art —
// the six regions are NOT evenly spaced wedges, so these can't be derived
// from index/count alone.
const RING_POSITION: Record<Element, { angle: number; radius: number }> = {
  fire: { angle: 338, radius: 38 },
  water: { angle: 48, radius: 38 },
  leaf: { angle: 95, radius: 38 },
  storm: { angle: 178, radius: 38 },
  shadow: { angle: 211, radius: 38 },
  light: { angle: 297, radius: 38 },
};

function ringPosition(element: Element): { left: number; top: number } {
  const { angle, radius } = RING_POSITION[element];
  const rad = (angle / 180) * Math.PI - Math.PI / 2;
  return {
    left: 50 + radius * Math.cos(rad),
    top: 50 + radius * Math.sin(rad),
  };
}

export default function WorldMap({ playerLevel, onSelectRegion }: WorldMapProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const hoveredRegion = hoveredId ? REGIONS[hoveredId] : null;
  const allRegions = [REGIONS.ledgers_heart, ...RING_ELEMENTS.map(el => REGIONS[REGION_BY_ELEMENT[el]])];

  return (
    <div>
      {/* Map (left on desktop, top on mobile) + info column (right on desktop, below on mobile) —
          mirrors the Training Map's layout so the two screens feel like one continuous space. */}
      <div className="flex flex-col lg:flex-row gap-4 mb-4">

        {/* Map column */}
        <div className="flex flex-col items-center gap-3 lg:flex-1">
          <div
            className="relative w-full min-w-0 max-w-[560px] aspect-square rounded-xl border border-neutral-700 overflow-hidden bg-neutral-900"
            style={{
              backgroundImage: 'url(/maps/worldmap.webp)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {/* The Ledger's Heart — always centered, always unlocked */}
            <RegionHotspot
              region={REGIONS.ledgers_heart}
              left={50}
              top={50}
              unlocked
              onHover={setHoveredId}
              onSelect={onSelectRegion}
            />

            {/* 6 elemental regions in a ring */}
            {RING_ELEMENTS.map((el) => {
              const regionId = REGION_BY_ELEMENT[el];
              const region = REGIONS[regionId];
              const pos = ringPosition(el);
              const unlocked = playerLevel >= region.unlockLevel;
              return (
                <RegionHotspot
                  key={regionId}
                  region={region}
                  left={pos.left}
                  top={pos.top}
                  unlocked={unlocked}
                  onHover={setHoveredId}
                  onSelect={onSelectRegion}
                />
              );
            })}
          </div>
          <p className="hidden lg:block text-xs text-gray-600 text-center">
            Hover or tap a region to see its name and element.
          </p>
        </div>

        {/* Info column: Region Info, then foldable Regions legend */}
        <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-4">

          {/* Region Info — reserves space so the column doesn't jump */}
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-4 min-h-[112px]">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Region Info</p>
            {hoveredRegion ? (
              <div>
                <p className="font-bold text-white text-sm flex items-center gap-2">
                  {hoveredRegion.element !== 'all' && (
                    <img src={ELEMENT_ICON_SRC[hoveredRegion.element]} alt={hoveredRegion.element} className="w-4 h-4" />
                  )}
                  {hoveredRegion.name}
                  <span className="text-[10px] uppercase tracking-widest text-gray-500">
                    {hoveredRegion.element === 'all' ? 'All Elements' : hoveredRegion.element}
                  </span>
                </p>
                {playerLevel < hoveredRegion.unlockLevel ? (
                  <p className="text-xs text-amber-500 mt-1">🔒 Unlocks at Player Level {hoveredRegion.unlockLevel}</p>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">{hoveredRegion.lore}</p>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Choose a region to explore. Each elemental region only holds curios of its own kind.</p>
            )}
          </div>

          {/* Regions — foldable, matches the Training Map's Map Legend pattern */}
          <details className="group bg-neutral-900 border border-neutral-700 rounded-xl p-4" open>
            <summary className="text-xs text-gray-500 uppercase tracking-widest cursor-pointer select-none flex items-center justify-between [&::-webkit-details-marker]:hidden">
              Regions
              <span className="text-gray-600 transition-transform group-open:rotate-180">▾</span>
            </summary>
            <div className="space-y-2 text-sm mt-3">
              {allRegions.map(region => {
                const unlocked = playerLevel >= region.unlockLevel;
                return (
                  <button
                    key={region.id}
                    onClick={() => unlocked && onSelectRegion(region.id)}
                    onMouseEnter={() => setHoveredId(region.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    disabled={!unlocked}
                    className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
                      unlocked ? 'hover:bg-black/30 cursor-pointer' : 'opacity-50 cursor-not-allowed'
                    }`}
                  >
                    {region.element !== 'all' ? (
                      <img src={ELEMENT_ICON_SRC[region.element]} alt={region.element} className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <span className="w-4 h-4 flex-shrink-0 text-center">📖</span>
                    )}
                    <span className="text-white font-medium truncate flex-1">{region.name}</span>
                    {!unlocked && <span className="text-xs text-gray-500 flex-shrink-0">🔒 Lv.{region.unlockLevel}</span>}
                  </button>
                );
              })}
            </div>
          </details>

        </div>
      </div>
    </div>
  );
}

function RegionHotspot({
  region, left, top, unlocked, onHover, onSelect,
}: {
  region: Region;
  left: number;
  top: number;
  unlocked: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  const color = region.element !== 'all' ? ELEMENT_COLOR[region.element] : null;
  return (
    <button
      onMouseEnter={() => onHover(region.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(region.id)}
      onBlur={() => onHover(null)}
      onClick={() => unlocked && onSelect(region.id)}
      disabled={!unlocked}
      className={`absolute -translate-x-1/2 -translate-y-1/2 w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 flex items-center justify-center transition-transform ${
        unlocked ? 'hover:scale-110 cursor-pointer' : 'cursor-not-allowed grayscale opacity-50'
      }`}
      style={{
        left: `${left}%`,
        top: `${top}%`,
        borderColor: color ? color.text : '#d4af37',
        background: color
          ? `radial-gradient(circle, ${color.to} 0%, ${color.from} 100%)`
          : 'radial-gradient(circle, #4a3a1c 0%, #241c0e 100%)',
      }}
      title={region.name}
    >
      {!unlocked ? (
        <span className="text-lg">🔒</span>
      ) : region.element !== 'all' ? (
        <img src={ELEMENT_ICON_SRC[region.element]} alt={region.element} className="w-6 h-6 sm:w-7 sm:h-7" />
      ) : (
        <span className="text-lg sm:text-xl">📖</span>
      )}
    </button>
  );
}
