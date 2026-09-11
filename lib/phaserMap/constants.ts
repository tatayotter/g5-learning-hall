// lib/phaserMap/constants.ts
// Canvas/camera constants shared between TrainingMapScene.ts (the Phaser
// scene) and MapCanvas.tsx (the DOM overlay, which independently recomputes
// the tilemap camera's clamped scroll — see MapCanvas.tsx's overlayPositioning
// header comment). Deliberately has NO dependency on the `phaser` package
// itself: MapCanvas.tsx needs these as real (non-type-only) values at module
// scope, and importing them from TrainingMapScene.ts directly would pull
// `import Phaser from 'phaser'` into whatever imports MapCanvas.tsx — which,
// unlike TrainingMapScene.ts (always dynamically imported inside a
// client-only useEffect), sits in a statically-imported chain reachable from
// SSR. Phaser touches `window` at module scope, crashing that render.
export const CANVAS_WIDTH = 896;
export const CANVAS_HEIGHT = 504;

// How zoomed-in the camera is for real-tile-art maps — 2x means each 32px
// tile renders at 64px, showing a 14x7.875-tile window around the player.
export const TILE_ART_ZOOM = 2;

// Other-player sprites move via a purely client-local "wander" step
// (hooks/useMapPresence.ts for real players, hooks/useBotPresence.ts for
// bots) that ticks only every few seconds, not continuously — a short
// glide (this used to be 200ms, tuned for when real players synced their
// live position every ~200ms) reads as a teleport/blink given how long the
// pause before and after it now is. Stretched out, the tile-hop itself
// reads as a little stroll instead. Shared here (not just inside
// TrainingMapScene.ts) so MapCanvas.tsx's DOM overlay (name tags, GM
// badges, wave bubbles) can interpolate in lockstep with the Phaser
// sprite's own tween rather than snapping straight to the new tile the
// instant `onlinePlayers` updates.
export const OTHER_PLAYER_MOVE_TWEEN_MS = 900;

/** Matches Phaser's 'Sine.easeInOut' tween ease, so MapCanvas.tsx's own
 *  interpolation of the DOM overlay tracks the Phaser sprite exactly. */
export function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}
