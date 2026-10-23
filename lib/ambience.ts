// lib/ambience.ts
// The sky over a map, per biome: cloud shadows that drift across everything, bits drifting in
// the air (leaves, embers, petals...), and the color of the sunset. Drawn by
// lib/phaserMap/ambience.ts. Cloud positions come from the clock and the day, so every kid on a
// map sees the same clouds at the same moment, online or off.
import type { Element } from '@/lib/monsterConfig';

export interface Ambience {
  clouds: {
    // Share of the map in shade at any moment (roughly).
    cover: number;
    // How dark the middle of a cloud shadow is (0..1), and its tint.
    darkness: number;
    color: number;
    // Art pixels a second (a tile is 32).
    speed: number;
  };
  drift: {
    // What floats by: falling leaves, rising embers or spores, floating petals.
    kind: 'fall' | 'rise' | 'float';
    colors: number[];
    // On screen at once, on a phone-sized view.
    count: number;
    // Bits that glow (embers, spores) add light instead of covering.
    glow: boolean;
    // How hard the wind pushes them sideways, art pixels a second.
    wind: number;
  };
  // Multiplied over the map near sunset (about 5 to 7 pm in the Philippines).
  sunset: number;
  // Some hours it drizzles: the share of 2-hour stretches with rain (0 = never).
  rain?: number;
  // Fireflies out at night, on a phone-sized view.
  fireflies?: number;
  // While it rains, lightning flashes now and then.
  lightning?: boolean;
  // Never brighter than this much night (0..1): a half-lit place, dim even at noon, where the
  // fireflies and lights stay out all day.
  gloom?: number;
}

const BASE_CLOUDS: Ambience['clouds'] = { cover: 0.25, darkness: 0.26, color: 0x1b2440, speed: 6 };

export const AMBIENCE: Record<Element | 'all', Ambience> = {
  // Ledger's Heart: autumn maples and oaks.
  all: {
    clouds: BASE_CLOUDS,
    drift: { kind: 'fall', colors: [0xc0782a, 0xd09a30, 0x9a3f1c, 0xe0b040], count: 10, glow: false, wind: 10 },
    sunset: 0xffa860,
    fireflies: 14,
  },
  fire: {
    clouds: { ...BASE_CLOUDS, color: 0x2a1410, darkness: 0.22 },
    drift: { kind: 'rise', colors: [0xffb347, 0xff6a2a, 0xffe08a], count: 14, glow: true, wind: 4 },
    sunset: 0xff7a4a,
  },
  water: {
    clouds: { ...BASE_CLOUDS, color: 0x14304a },
    drift: { kind: 'fall', colors: [0x6fae4a, 0x9ccc6a, 0x4f8a3a], count: 7, glow: false, wind: 14 },
    sunset: 0xff9a8a,
    rain: 0.3,
    fireflies: 10,
  },
  leaf: {
    clouds: BASE_CLOUDS,
    drift: { kind: 'fall', colors: [0x5d8a2e, 0x7fae3e, 0xa8c84a, 0x46702a], count: 12, glow: false, wind: 8 },
    sunset: 0xffc070,
    rain: 0.2,
    fireflies: 16,
  },
  storm: {
    clouds: { ...BASE_CLOUDS, cover: 0.38, darkness: 0.28, color: 0x1a1f33, speed: 14 },
    drift: { kind: 'fall', colors: [0x8a9a7a, 0x6f7f66, 0xb0b8a0], count: 12, glow: false, wind: 30 },
    sunset: 0xb8a0ff,
    rain: 0.6,
    lightning: true,
  },
  shadow: {
    clouds: { ...BASE_CLOUDS, cover: 0.32, darkness: 0.24, color: 0x1a1030 },
    drift: { kind: 'rise', colors: [0xb28cff, 0x8a6ad8, 0xd8c0ff], count: 10, glow: true, wind: 3 },
    sunset: 0xd080ff,
    fireflies: 18,
    gloom: 0.5,
  },
  light: {
    clouds: { ...BASE_CLOUDS, cover: 0.18, darkness: 0.16, color: 0x2a2a40 },
    drift: { kind: 'float', colors: [0xfff0a0, 0xffffff, 0xffd0e0], count: 10, glow: true, wind: 6 },
    sunset: 0xffb0a0,
  },
};

/** How much sunset there is now (0..1): it warms from 4:30 pm, peaks 5:45 to 6:15, gone by 7 pm (Manila). */
export function sunsetStrength(now = Date.now()): number {
  const h = (((now / 3600_000) + 8) % 24 + 24) % 24;
  if (h < 16.5 || h >= 19) return 0;
  if (h < 17.75) return (h - 16.5) / 1.25;
  if (h < 18.25) return 1;
  return 1 - (h - 18.25) / 0.75;
}

/** How dark it is now (0..1): dusk from 6:15 to 7:15 pm, night until 5 am, dawn to 6 am (Manila). */
export function nightStrength(now = Date.now()): number {
  const h = (((now / 3600_000) + 8) % 24 + 24) % 24;
  if (h >= 19.25 || h < 5) return 1;
  if (h >= 18.25) return h - 18.25;
  if (h < 6) return 1 - (h - 5);
  return 0;
}

/** Whether it's drizzling on a map right now: the same for every kid, changing every 2 hours. */
export function isRaining(sky: Ambience, key: string, now = Date.now()): boolean {
  if (!sky.rain) return false;
  const block = Math.floor((now / 3600_000 + 8) / 2);
  let h = 2166136261;
  const s = `rain:${key}:${block}`;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000 < sky.rain;
}
