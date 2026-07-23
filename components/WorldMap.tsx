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

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center">
        <h3 className="text-2xl font-display font-bold text-white">The World Map</h3>
        <p className="text-xs text-gray-500 mt-1">Choose a region to explore. Each elemental region only holds curios of its own kind.</p>
      </div>

      <div
        className="relative w-full max-w-[560px] aspect-square rounded-2xl border border-neutral-700 overflow-hidden"
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

      {/* Hover/tap info panel — reserves space so the map doesn't jump */}
      <div className="w-full max-w-[560px] min-h-[64px] bg-[#111] border border-neutral-800 rounded-xl p-3">
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
          <p className="text-xs text-gray-600">Hover or tap a region to see its name and element.</p>
        )}
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
