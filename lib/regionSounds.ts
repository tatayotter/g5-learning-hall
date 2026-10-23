// lib/regionSounds.ts
// Each map's background sounds, made in code (no sound files to download):
// - Ledger's Heart: a soft breeze and birds chirping now and then,
// - the Cinderreach: a low rumble under crackling fire,
// - Tidewrit: waves rolling in and out, a trickling river, a bird now and then.
// They play on the effects volume, quieter than the game's own sounds, and the map's sound
// button turns them off (remembered on this device).
import { effectsOutput } from './sounds';

const MUTE_KEY = 'g5_map_sounds_off';

export function mapSoundsOn(): boolean {
  try { return localStorage.getItem(MUTE_KEY) !== '1'; } catch { return true; }
}
export function setMapSoundsOn(on: boolean) {
  try { localStorage.setItem(MUTE_KEY, on ? '0' : '1'); } catch { /* private mode */ }
}

type Recipe = 'breeze' | 'fire' | 'shore';
export const REGION_SOUNDS: Record<string, Recipe> = {
  ledgers_heart: 'breeze',
  town: 'breeze',
  cinderreach: 'fire',
  tidewrit_shallows: 'shore',
  rootbound_wilds: 'breeze',
};

let playing: { stop: () => void } | null = null;
let noiseBuf: AudioBuffer | null = null;

function noise(ctx: AudioContext): AudioBuffer {
  if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
  const len = ctx.sampleRate * 3;
  noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  // Pink-ish: smoother than plain hiss, closer to wind and water.
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.997 * b0 + w * 0.029; b1 = 0.985 * b1 + w * 0.032; b2 = 0.95 * b2 + w * 0.048;
    d[i] = (b0 + b1 + b2 + w * 0.05) * 1.6;
  }
  return noiseBuf;
}

// A looping noise bed through a filter, its loudness slowly swelling (waves, wind).
function bed(ctx: AudioContext, out: AudioNode, type: BiquadFilterType, freq: number, level: number, swellHz: number, swellDepth: number) {
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx); src.loop = true;
  src.loopStart = Math.random();
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
  const g = ctx.createGain(); g.gain.value = level;
  const lfo = ctx.createOscillator(); lfo.frequency.value = swellHz;
  const depth = ctx.createGain(); depth.gain.value = level * swellDepth;
  lfo.connect(depth); depth.connect(g.gain);
  src.connect(f); f.connect(g); g.connect(out);
  src.start(); lfo.start();
  return () => { try { src.stop(); lfo.stop(); } catch { /* already stopped */ } g.disconnect(); };
}

function chirp(ctx: AudioContext, out: AudioNode, at: number) {
  const notes = 2 + Math.floor(Math.random() * 3);
  const base = 2600 + Math.random() * 1400;
  for (let i = 0; i < notes; i++) {
    const t = at + i * (0.09 + Math.random() * 0.05);
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(base, t);
    o.frequency.exponentialRampToValueAtTime(base * (1.2 + Math.random() * 0.4), t + 0.06);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.02, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.08);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.1);
  }
}

function crackle(ctx: AudioContext, out: AudioNode, at: number) {
  const src = ctx.createBufferSource(); src.buffer = noise(ctx);
  const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1500 + Math.random() * 2500;
  const g = ctx.createGain();
  const len = 0.006 + Math.random() * 0.02;
  g.gain.setValueAtTime(0.05 + Math.random() * 0.08, at); g.gain.exponentialRampToValueAtTime(0.0005, at + len);
  src.connect(f); f.connect(g); g.connect(out);
  src.start(at, Math.random() * 2, len + 0.01);
}

/** Starts the sounds for a map (or nothing, if it has none or they're off); stops any others. */
export function startRegionSounds(regionId: string) {
  stopRegionSounds();
  const recipe = REGION_SOUNDS[regionId];
  if (!recipe || !mapSoundsOn() || typeof window === 'undefined') return;
  const { ctx, out: bus } = effectsOutput();
  const out = ctx.createGain();
  out.gain.value = 0;
  out.gain.setTargetAtTime(0.55, ctx.currentTime, 1.2); // fade in
  out.connect(bus);
  const stops: (() => void)[] = [];
  let timer: ReturnType<typeof setInterval> | null = null;
  // Little sounds (chirps, crackles) are scheduled a moment ahead, a few times a second.
  let next = ctx.currentTime + 1;
  const every = (fn: (at: number) => number) => {
    timer = setInterval(() => {
      if (ctx.state !== 'running') return;
      while (next < ctx.currentTime + 0.4) next = fn(Math.max(next, ctx.currentTime + 0.05));
    }, 150);
  };
  if (recipe === 'breeze') {
    stops.push(bed(ctx, out, 'lowpass', 420, 0.05, 0.07, 0.6));
    every(at => { chirp(ctx, out, at); return at + 2 + Math.random() * 6; });
  } else if (recipe === 'fire') {
    stops.push(bed(ctx, out, 'lowpass', 110, 0.16, 0.05, 0.3));
    every(at => { crackle(ctx, out, at); return at + (Math.random() < 0.2 ? 0.02 : 0.08 + Math.random() * 0.35); });
  } else {
    stops.push(bed(ctx, out, 'lowpass', 600, 0.1, 0.11, 0.85)); // waves
    stops.push(bed(ctx, out, 'bandpass', 2400, 0.018, 0.9, 0.5)); // the river
    every(at => { chirp(ctx, out, at); return at + 6 + Math.random() * 10; });
  }
  playing = {
    stop: () => {
      if (timer) clearInterval(timer);
      out.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
      setTimeout(() => { stops.forEach(s => s()); out.disconnect(); }, 1200);
    },
  };
}

export function stopRegionSounds() {
  playing?.stop();
  playing = null;
}
