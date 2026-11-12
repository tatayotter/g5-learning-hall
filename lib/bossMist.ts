// lib/bossMist.ts
// How thick the Term Boss mist is right now (0 = none, 1 = full), for the map to draw
// (lib/phaserMap/ambience.ts). The Dashboard sets it from the kid's boss progress: full when the
// event starts, thinning with every shadow beaten, gone once they're all beaten or the event is off.
let density = 0;

export function setBossMist(value: number) {
  density = Math.max(0, Math.min(1, value || 0));
}

export function bossMist(): number {
  return density;
}

/** The mist for a kid who has beaten `defeated` of `total` shadows (never quite clear until all are). */
export function mistFor(defeated: number, total: number): number {
  if (total <= 0 || defeated >= total) return 0;
  return Math.max(0.08, 1 - defeated / total);
}
