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
