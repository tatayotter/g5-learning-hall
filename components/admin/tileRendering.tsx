// components/admin/tileRendering.tsx
// Shared tile-compositing components — used by both the map editor grid
// (MapEditorSection.tsx) and the playtest camera view (MapPlaytest.tsx) so
// autotile corner compositing isn't duplicated between them.
import { TILESETS } from '@/lib/tileEngine/tilesets';
import { resolveAutotileCorners } from '@/lib/tileEngine/autotile';
import { BASE_TILE_SIZE, type TileGrid } from '@/lib/tileEngine/types';

// Renders one cell's content for a non-interactive visual layer grid —
// either a plain background-position crop (normal tileset) or 4 composited
// autotile quadrants (see lib/tileEngine/autotile.ts for the algorithm).
export function TileCellVisual({ grid, x, y, tileSize }: { grid: TileGrid; x: number; y: number; tileSize: number }) {
  const ref = grid[y][x];
  if (!ref) return null;
  const tileset = TILESETS[ref.tilesetId];
  if (!tileset) return null;

  if (tileset.kind === 'normal') {
    if (tileset.nativeSize) {
      // Oversized single-image tile (e.g. a tree canopy) — rendered at its
      // real pixel dimensions (1 image px = 1 rendered px at 100% zoom, the
      // same reference the art is size-matched against in Photoshop),
      // scaled proportionally with the zoom control, centered horizontally
      // over the cell, and anchored to the bottom edge so it overflows
      // upward/outward instead of being squashed into a tileSize square.
      const scale = tileSize / BASE_TILE_SIZE;
      const width = tileset.nativeSize.width * scale;
      const height = tileset.nativeSize.height * scale;
      return (
        <div
          className="absolute bottom-0"
          style={{
            left: (tileSize - width) / 2, width, height,
            backgroundImage: `url(${tileset.image})`,
            backgroundSize: '100% 100%',
          }}
        />
      );
    }
    return (
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${tileset.image})`,
          backgroundPosition: `-${(ref.col ?? 0) * tileSize}px -${(ref.row ?? 0) * tileSize}px`,
          backgroundSize: `${tileset.columns * tileSize}px ${tileset.rows * tileSize}px`,
        }}
      />
    );
  }

  const half = tileSize / 2;
  const corners = resolveAutotileCorners(grid, x, y, tileset.id);
  const positions = [
    { top: 0, left: 0 }, { top: 0, left: half },
    { top: half, left: 0 }, { top: half, left: half },
  ];
  return (
    <>
      {corners.map((c, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            top: positions[i].top, left: positions[i].left, width: half, height: half,
            backgroundImage: `url(${tileset.image})`,
            backgroundPosition: `-${c.col * half}px -${c.row * half}px`,
            backgroundSize: `${5 * half}px ${4 * half}px`,
          }}
        />
      ))}
    </>
  );
}

// Renders a full 3-layer stack (ground/decoration/overhang) as stacked
// non-interactive grids — the visual half of the editor's two-part
// rendering (visual layers + a separate interactive hit-grid on top).
export function LayerStack({ width, height, layers, tileSize, layerIds, layerVisible, aboveGroundAndDecoration }: {
  width: number; height: number; layers: Record<string, TileGrid>; tileSize: number;
  layerIds: string[]; layerVisible?: Record<string, boolean>;
  // Optional content (e.g. the player sprite) rendered between the
  // decoration and overhang layers, so overhang correctly draws above it.
  aboveGroundAndDecoration?: React.ReactNode;
}) {
  const belowOverhang = layerIds.filter(id => id !== 'overhang');
  const overhangOnly = layerIds.filter(id => id === 'overhang');

  const renderLayer = (layerId: string) => (
    <div
      key={layerId}
      className="absolute inset-0 grid"
      style={{ gridTemplateColumns: `repeat(${width}, ${tileSize}px)`, gridTemplateRows: `repeat(${height}, ${tileSize}px)` }}
    >
      {layers[layerId].map((row, y) => row.map((_, x) => (
        <div key={`${layerId}-${x}-${y}`} className="relative">
          <TileCellVisual grid={layers[layerId]} x={x} y={y} tileSize={tileSize} />
        </div>
      )))}
    </div>
  );

  return (
    <>
      {belowOverhang.map(id => (!layerVisible || layerVisible[id]) && renderLayer(id))}
      {aboveGroundAndDecoration}
      {overhangOnly.map(id => (!layerVisible || layerVisible[id]) && renderLayer(id))}
    </>
  );
}

// Representative palette swatch for an autotile — the fully-filled (state 3)
// corner combo on all 4 corners, i.e. what a solid interior tile looks like.
export function AutotileSwatch({ image, tileSize }: { image: string; tileSize: number }) {
  const half = tileSize / 2;
  return (
    <div className="relative" style={{ width: tileSize, height: tileSize }}>
      {[0, 1, 2, 3].map(row => (
        <div
          key={row}
          className="absolute"
          style={{
            top: row < 2 ? 0 : half, left: row % 2 === 0 ? 0 : half, width: half, height: half,
            backgroundImage: `url(${image})`,
            backgroundPosition: `-${3 * half}px -${row * half}px`,
            backgroundSize: `${5 * half}px ${4 * half}px`,
          }}
        />
      ))}
    </div>
  );
}
