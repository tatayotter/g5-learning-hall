'use client';
// components/WorldMap.tsx
// Region-select hub — rebuilt on MapStage (components/MapStage.tsx) so it
// reads as the same visual system as the battle screen: fixed canvas,
// full-screen on mobile, region legend/info tucked into a collapsible
// drawer instead of a permanent side column.
import { useState } from 'react';
import { Element, ELEMENT_ICON_SRC } from '@/lib/monsterConfig';
import { REGIONS, ELEMENT_COLOR, REGION_BY_ELEMENT, Region } from '@/lib/regions';
import MapStage from '@/components/MapStage';

interface WorldMapProps {
  playerLevel: number;
  onSelectRegion: (regionId: string) => void;
  onExit?: () => void;
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

export default function WorldMap({ playerLevel, onSelectRegion, onExit }: WorldMapProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const hoveredRegion = hoveredId ? REGIONS[hoveredId] : null;
  const allRegions = [REGIONS.ledgers_heart, ...RING_ELEMENTS.map(el => REGIONS[REGION_BY_ELEMENT[el]])];

  const frame = (
    <div
      className="relative w-full h-full"
      style={{ backgroundImage: 'url(/maps/worldmap.webp)', backgroundSize: 'cover', backgroundPosition: 'center' }}
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
  );

  const drawer = (
    <div className="space-y-3">
      {/* Region Info — shows whichever region was last hovered/tapped */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 min-h-[54px]">
        {hoveredRegion ? (
          <div>
            <p className="font-bold text-white text-xs flex items-center gap-1.5">
              {hoveredRegion.element !== 'all' && (
                <img src={ELEMENT_ICON_SRC[hoveredRegion.element]} alt={hoveredRegion.element} className="w-3.5 h-3.5" />
              )}
              {hoveredRegion.name}
              <span className="text-[9px] uppercase tracking-widest text-gray-500">
                {hoveredRegion.element === 'all' ? 'All Elements' : hoveredRegion.element}
              </span>
            </p>
            {playerLevel < hoveredRegion.unlockLevel ? (
              <p className="text-[11px] text-amber-500 mt-1">🔒 Unlocks at Player Level {hoveredRegion.unlockLevel}</p>
            ) : (
              <p className="text-[11px] text-gray-400 mt-1">{hoveredRegion.lore}</p>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-xs">Tap a region below (or on the map) to see its name and element.</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {allRegions.map(region => {
          const unlocked = playerLevel >= region.unlockLevel;
          return (
            <button
              key={region.id}
              onClick={() => unlocked && onSelectRegion(region.id)}
              onMouseEnter={() => setHoveredId(region.id)}
              onMouseLeave={() => setHoveredId(null)}
              disabled={!unlocked}
              className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left transition-colors bg-neutral-900 border border-neutral-800 ${
                unlocked ? 'hover:border-amber-500 cursor-pointer' : 'opacity-50 cursor-not-allowed'
              }`}
            >
              {region.element !== 'all' ? (
                <img src={ELEMENT_ICON_SRC[region.element]} alt={region.element} className="w-3.5 h-3.5 flex-shrink-0" />
              ) : (
                <span className="w-3.5 h-3.5 flex-shrink-0 text-center text-[11px]">📖</span>
              )}
              <span className="text-white text-[11px] font-medium truncate flex-1">{region.name}</span>
              {!unlocked && <span className="text-[10px] text-gray-500 flex-shrink-0">🔒{region.unlockLevel}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <MapStage
      leftTag="World Map"
      rightTag={`Lv.${playerLevel}`}
      frame={frame}
      drawerLabel="Regions"
      drawer={drawer}
      onExit={onExit}
    />
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
      className={`absolute -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full border-2 flex items-center justify-center transition-transform ${
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
        <span className="text-base">🔒</span>
      ) : region.element !== 'all' ? (
        <img src={ELEMENT_ICON_SRC[region.element]} alt={region.element} className="w-6 h-6" />
      ) : (
        <span className="text-base">📖</span>
      )}
    </button>
  );
}
