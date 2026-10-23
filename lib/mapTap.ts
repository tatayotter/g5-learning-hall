// lib/mapTap.ts
// A quick tap on the map's left half lands on the joystick's touch area
// (components/monster/map/FloatingJoystick.tsx), not the map canvas. The joystick passes it on
// as this window event ({ clientX, clientY }), and lib/phaserMap/TrainingMapScene.ts treats it
// like a tap on the canvas.
export const MAP_TAP_EVENT = 'map:tap';
