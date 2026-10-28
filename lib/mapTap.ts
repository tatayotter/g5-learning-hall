// lib/mapTap.ts
// Clicks and taps on the map canvas are read by components/monster/map/FloatingJoystick.tsx (so a
// press that turns into a drag steers instead). A tap that stays put is passed on as this window
// event ({ clientX, clientY }), and lib/phaserMap/TrainingMapScene.ts turns it into a map tile.
export const MAP_TAP_EVENT = 'map:tap';

// Tap-to-walk: hooks/useContinuousMovement.ts sends the tile a route ends on ({ x, y }), or null
// when the walk ends, so the scene can mark the spot.
export const MAP_WALK_TARGET_EVENT = 'map:walk-target';
