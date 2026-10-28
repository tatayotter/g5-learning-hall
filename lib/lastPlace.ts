// Where each kid last was on the map, so the next login starts them there.
// The very first login (nothing saved yet) starts in Inkwell Town.
// Ledger's Heart keeps its own spot in the database (battle_state.map_x/y);
// every other map saves its spot here, on this device.

export const FIRST_REGION = 'town';

export interface LastPlace { region: string; x?: number; y?: number }

const key = (userId: string) => `g5_last_place:${userId}`;

export function readLastPlace(userId: string): LastPlace | null {
  try {
    const raw = localStorage.getItem(key(userId));
    const p = raw ? JSON.parse(raw) : null;
    return p && typeof p.region === 'string' ? p : null;
  } catch { return null; }
}

function write(userId: string, place: LastPlace) {
  try { localStorage.setItem(key(userId), JSON.stringify(place)); } catch { /* storage blocked */ }
}

/** The kid is now on this map; keeps the saved spot if it's the same map. */
export function rememberRegion(userId: string, region: string) {
  const last = readLastPlace(userId);
  if (last?.region === region) return;
  write(userId, { region });
}

/** The kid stepped onto this tile. */
export function rememberSpot(userId: string, region: string, x: number, y: number) {
  write(userId, { region, x, y });
}
