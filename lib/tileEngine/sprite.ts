// lib/tileEngine/sprite.ts
// Character sprite sheet contract for the map editor's Playtest preview
// (components/admin/MapPlaytest.tsx). Self-defined placeholder format, same
// spirit as the autotile contract in autotile.ts — not tied to any external
// sprite standard, documented here so real art can be authored to spec.
//
// Sheet layout: 4 rows (down, left, right, up, in that order) x
// framesPerDirection columns of frameSize-square frames. Frame 0 in each row
// is the standing/idle pose.
import type { CSSProperties } from 'react';

export interface SpriteSheetDef {
  id: string;
  image: string;
  frameSize: number;
  framesPerDirection: number;
}

export type SpriteDirection = 'down' | 'left' | 'right' | 'up';

export const SPRITE_DIRECTION_ROWS: Record<SpriteDirection, number> = {
  down: 0, left: 1, right: 2, up: 3,
};

export function spriteFrameStyle(sheet: SpriteSheetDef, direction: SpriteDirection, frame: number): CSSProperties {
  const row = SPRITE_DIRECTION_ROWS[direction];
  const col = ((frame % sheet.framesPerDirection) + sheet.framesPerDirection) % sheet.framesPerDirection;
  return {
    backgroundImage: `url(${sheet.image})`,
    backgroundPosition: `-${col * sheet.frameSize}px -${row * sheet.frameSize}px`,
    backgroundSize: `${sheet.framesPerDirection * sheet.frameSize}px ${4 * sheet.frameSize}px`,
  };
}

export const PLAYER_SPRITE: SpriteSheetDef = {
  id: 'player_placeholder',
  image: '/tiles/sprite_placeholder.svg',
  frameSize: 32,
  framesPerDirection: 4,
};
