// lib/sounds.ts
let audioCtx: AudioContext | null = null;
let ambienceNodes: { source: AudioBufferSourceNode; gain: GainNode } | null = null;

// --- Audio settings: sound-effects / music toggles, persisted per device ---
const SFX_KEY = 'g5_sfx_enabled';
const MUSIC_KEY = 'g5_music_enabled';

function readSetting(key: string): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(key) !== '0';
}

let sfxEnabled = readSetting(SFX_KEY);
let musicEnabled = readSetting(MUSIC_KEY);

export function isSfxEnabled() {
  return sfxEnabled;
}

export function isMusicEnabled() {
  return musicEnabled;
}

export function setSfxEnabled(on: boolean) {
  sfxEnabled = on;
  if (typeof window !== 'undefined') localStorage.setItem(SFX_KEY, on ? '1' : '0');
}

export function setMusicEnabled(on: boolean) {
  musicEnabled = on;
  if (typeof window !== 'undefined') localStorage.setItem(MUSIC_KEY, on ? '1' : '0');
  applyMusicPlayback();
}

function getContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// --- Triumphant chime for quest completion ---
export function playChime() {
  if (!sfxEnabled) return;
  const ctx = getContext();
  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const start = now + i * 0.09;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.25, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.65);
  });
}

// --- Sword clash for wrong answer ---
export function playClash() {
  if (!sfxEnabled) return;
  const ctx = getContext();
  const now = ctx.currentTime;

  [220, 233].forEach((freq) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + 0.15);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  });

  const bufferSize = ctx.sampleRate * 0.2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = 2500;
  bandpass.Q.value = 1.5;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.2, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  noise.connect(bandpass);
  bandpass.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(now);
}

// --- Coin jingle for vault purchases ---
export function playCoins() {
  if (!sfxEnabled) return;
  const ctx = getContext();
  const now = ctx.currentTime;
  const freqs = [1800, 2200, 2600, 2000, 2400];
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const start = now + i * 0.045;
    gain.gain.setValueAtTime(0.12, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.22);
  });
}

// --- Warm bell for admin-awarded good deeds ---
export function playBlessing() {
  if (!sfxEnabled) return;
  const ctx = getContext();
  const now = ctx.currentTime;
  const notes = [659.25, 987.77]; // E5, B5
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const start = now + i * 0.05;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.2, start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.9);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 1);
  });
}

// --- Big fanfare for leveling up ---
export function playLevelUp() {
  if (!sfxEnabled) return;
  const ctx = getContext();
  const now = ctx.currentTime;
  const notes = [392, 523.25, 659.25, 783.99, 1046.5]; // G4 C5 E5 G5 C6
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    const start = now + i * 0.1;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.15, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.7);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2500;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.75);
  });
}

// --- Haptic buzz to pair with the tap sound below on touch devices. Gated on
// the same sfxEnabled toggle as everything else here (no dedicated haptics
// setting exists) and silently no-ops on desktop / unsupported browsers. ---
function vibrateTap(ms: number) {
  if (!sfxEnabled) return;
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try { navigator.vibrate(ms); } catch {}
}

// --- Soft page-flip: the app's generic UI tap, used everywhere from tab
// switches to every button/card press. Playback rate, filter frequency and
// peak gain are each jittered a little per call — with this one sound firing
// on nearly every tap in the game, an identical waveform every time reads as
// robotic; small per-tap variance is what makes repeated presses feel alive
// instead of looping the same clip. ---
export function playPageFlip() {
  vibrateTap(10);
  if (!sfxEnabled) return;
  const ctx = getContext();
  const now = ctx.currentTime;
  const bufferSize = ctx.sampleRate * 0.12;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.playbackRate.value = 0.85 + Math.random() * 0.3; // 0.85x-1.15x speed/pitch
  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = 2700 + Math.random() * 700; // 2700-3400 Hz
  bandpass.Q.value = 0.7;
  const gain = ctx.createGain();
  const peak = 0.07 + Math.random() * 0.025; // 0.07-0.095
  gain.gain.setValueAtTime(peak, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  noise.connect(bandpass);
  bandpass.connect(gain);
  gain.connect(ctx.destination);
  noise.start(now);
}

// --- Footstep on grass: soft, dull rustle ---
export function playFootstepGrass() {
  if (!sfxEnabled) return;
  const ctx = getContext();
  const now = ctx.currentTime;
  const bufferSize = ctx.sampleRate * 0.12;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 900;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  noise.connect(lowpass);
  lowpass.connect(gain);
  gain.connect(ctx.destination);
  noise.start(now);
}

// --- Footstep on town tiles: brief stone-like tap ---
export function playFootstepTown() {
  if (!sfxEnabled) return;
  const ctx = getContext();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(500, now);
  osc.frequency.exponentialRampToValueAtTime(280, now + 0.08);
  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.12);
}

// --- Wall/edge bump: short blocked-movement thud ---
export function playWallBump() {
  if (!sfxEnabled) return;
  const ctx = getContext();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(90, now);
  osc.frequency.exponentialRampToValueAtTime(45, now + 0.1);
  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.14);
}

// --- Nearby social whoosh: another player's wave/sticker arriving ---
export function playNearbyWhoosh() {
  if (!sfxEnabled) return;
  const ctx = getContext();
  const now = ctx.currentTime;
  const bufferSize = ctx.sampleRate * 0.18;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.setValueAtTime(1400, now);
  bandpass.frequency.exponentialRampToValueAtTime(3200, now + 0.18);
  bandpass.Q.value = 1.2;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  noise.connect(bandpass);
  bandpass.connect(gain);
  gain.connect(ctx.destination);
  noise.start(now);
}

// --- Wild monster encounter: sudden alert + low growl as it appears ---
export function playMonsterAppear() {
  if (!sfxEnabled) return;
  const ctx = getContext();
  const now = ctx.currentTime;

  // Rising alert stab
  const alert = ctx.createOscillator();
  const alertGain = ctx.createGain();
  alert.type = 'sawtooth';
  alert.frequency.setValueAtTime(180, now);
  alert.frequency.exponentialRampToValueAtTime(420, now + 0.15);
  alertGain.gain.setValueAtTime(0.001, now);
  alertGain.gain.linearRampToValueAtTime(0.18, now + 0.05);
  alertGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  alert.connect(alertGain);
  alertGain.connect(ctx.destination);
  alert.start(now);
  alert.stop(now + 0.22);

  // Low growl underneath
  const growl = ctx.createOscillator();
  const growlGain = ctx.createGain();
  growl.type = 'sawtooth';
  growl.frequency.setValueAtTime(90, now + 0.1);
  growl.frequency.exponentialRampToValueAtTime(50, now + 0.5);
  growlGain.gain.setValueAtTime(0.001, now + 0.1);
  growlGain.gain.linearRampToValueAtTime(0.22, now + 0.16);
  growlGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
  const growlFilter = ctx.createBiquadFilter();
  growlFilter.type = 'lowpass';
  growlFilter.frequency.value = 500;
  growl.connect(growlFilter);
  growlFilter.connect(growlGain);
  growlGain.connect(ctx.destination);
  growl.start(now + 0.1);
  growl.stop(now + 0.55);
}

// --- Torch crackle ambience (looping, toggled by the player) ---
export function startAmbience() {
  if (ambienceNodes) return;
  const ctx = getContext();

  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;

  const gain = ctx.createGain();
  gain.gain.value = 0.04;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start();

  ambienceNodes = { source, gain };
}

export function stopAmbience() {
  if (!ambienceNodes) return;
  ambienceNodes.source.stop();
  ambienceNodes = null;
}

export function isAmbiencePlaying() {
  return ambienceNodes !== null;
}

// --- Battle stage sample SFX ---
// Decoded once into AudioBuffers and played through the shared AudioContext
// (not <audio> elements), so the Phaser battle stage can start them on its
// impact frames with ms precision, overlapping freely.
//
// Every move plays a CAST sound when it starts (per attack class) and an
// OUTCOME sound when it resolves: a light or heavy hit (by share of max HP)
// with an element layer on top, a dodge, or a knockout. Status changes,
// entrances/faints/switches, the intro, the coin toss and the result
// jingles have their own. ElevenLabs Sound Effects (Free plan) clips.
//
// volume: levelled from measured loudness so the mix sits together
// (impacts on top, casts a little under, element layers underneath).
// maxMs: where the clip's audible tail ends; playback fades out there so a
// near-silent tail never lingers.
const BATTLE_SFX = {
  // Casts — one per attack class (lib/attackClasses.ts), plus follow-ups.
  cast_strike: { src: '/sounds/battle_cast_strike.mp3', volume: 0.52, maxMs: 480 },
  cast_pounce: { src: '/sounds/battle_cast_pounce.mp3', volume: 0.58, maxMs: 410 },
  cast_projectile: { src: '/sounds/battle_cast_projectile.mp3', volume: 0.26, maxMs: 350 },
  cast_barrage: { src: '/sounds/battle_cast_barrage.mp3', volume: 0.38, maxMs: 590 },
  cast_beam: { src: '/sounds/battle_cast_beam.mp3', volume: 0.44, maxMs: 840 },
  cast_wave: { src: '/sounds/battle_cast_wave.mp3', volume: 2.92, maxMs: 800 },
  cast_zone: { src: '/sounds/battle_cast_zone.mp3', volume: 0.51, maxMs: 480 },
  cast_drain: { src: '/sounds/battle_cast_drain.mp3', volume: 0.4, maxMs: 370 },
  drain_return: { src: '/sounds/battle_drain_return.mp3', volume: 0.68, maxMs: 510 },
  cast_power_up: { src: '/sounds/battle_cast_power_up.mp3', volume: 0.38, maxMs: 1000 },
  cast_guard: { src: '/sounds/battle_cast_guard.mp3', volume: 0.49, maxMs: 540 },
  cast_hex: { src: '/sounds/battle_cast_hex.mp3', volume: 0.85, maxMs: 430 },
  hex_land: { src: '/sounds/battle_hex_land.mp3', volume: 0.84, maxMs: 400 },
  cast_restore: { src: '/sounds/battle_cast_restore.mp3', volume: 1.05, maxMs: 760 },
  // Outcomes.
  hit_light: { src: '/sounds/battle_hit_light.mp3', volume: 0.43, maxMs: 180 },
  hit_heavy: { src: '/sounds/battle_hit_heavy.mp3', volume: 0.6, maxMs: 440 },
  finishing_blow: { src: '/sounds/battle_finishing_blow.mp3', volume: 0.7, maxMs: 1160 },
  miss_dodge: { src: '/sounds/battle_miss_dodge.mp3', volume: 0.36, maxMs: 360 },
  // Element layers, played on top of a hit.
  el_fire: { src: '/sounds/battle_el_fire.mp3', volume: 0.34, maxMs: 450 },
  el_water: { src: '/sounds/battle_el_water.mp3', volume: 0.34, maxMs: 350 },
  el_leaf: { src: '/sounds/battle_el_leaf.mp3', volume: 0.99, maxMs: 420 },
  el_storm: { src: '/sounds/battle_el_storm.mp3', volume: 0.31, maxMs: 510 },
  el_shadow: { src: '/sounds/battle_el_shadow.mp3', volume: 0.5, maxMs: 290 },
  el_light: { src: '/sounds/battle_el_light.mp3', volume: 0.44, maxMs: 550 },
  // Status.
  burn_tick: { src: '/sounds/battle_burn_tick.mp3', volume: 0.66, maxMs: 500 },
  paralyze: { src: '/sounds/battle_paralyze.mp3', volume: 0.47, maxMs: 480 },
  blessed: { src: '/sounds/battle_blessed.mp3', volume: 0.35, maxMs: 500 },
  revive: { src: '/sounds/battle_revive.mp3', volume: 0.36, maxMs: 880 },
  // Flow.
  entrance: { src: '/sounds/battle_entrance.mp3', volume: 0.5, maxMs: 470 },
  faint: { src: '/sounds/battle_faint.mp3', volume: 0.51, maxMs: 540 },
  recall: { src: '/sounds/battle_recall.mp3', volume: 0.43, maxMs: 500 },
  intro_vs: { src: '/sounds/battle_intro_vs.mp3', volume: 0.99, maxMs: 620 },
  battle_start: { src: '/sounds/battle_battle_start.mp3', volume: 0.46, maxMs: 800 },
  coin_flip: { src: '/sounds/battle_coin_flip.mp3', volume: 1.62, maxMs: 840 },
  coin_land: { src: '/sounds/battle_coin_land.mp3', volume: 0.91, maxMs: 210 },
  victory: { src: '/sounds/battle_victory.mp3', volume: 0.68, maxMs: 1550 },
  defeat: { src: '/sounds/battle_defeat.mp3', volume: 0.5, maxMs: 2030 },
  // Earlier all-in-one strike (dash + claw hit); superseded by
  // cast_strike + hit_*, kept for the /dev/ui-gallery preview.
  strike: { src: '/sounds/battle_strike.mp3', volume: 0.6, maxMs: 440 },
} satisfies Record<string, { src: string; volume: number; maxMs: number }>;

export type BattleSfx = keyof typeof BATTLE_SFX;
export const BATTLE_SFX_NAMES = Object.keys(BATTLE_SFX) as BattleSfx[];

const battleSfxBuffers = new Map<BattleSfx, Promise<AudioBuffer | null>>();

function loadBattleSfx(name: BattleSfx): Promise<AudioBuffer | null> {
  let p = battleSfxBuffers.get(name);
  if (!p) {
    p = fetch(BATTLE_SFX[name].src)
      .then(r => r.arrayBuffer())
      .then(b => getContext().decodeAudioData(b))
      .catch(() => null);
    battleSfxBuffers.set(name, p);
  }
  return p;
}

// Call when a battle opens, so the first sounds aren't late while they
// decode (about 0.9 MB for the whole set, fetched once and cached).
export function preloadBattleSfx() {
  for (const name of BATTLE_SFX_NAMES) void loadBattleSfx(name);
}

// delayMs: start this long from now. offsetMs: skip this far into the clip
// (to line its peak up with an impact that's already happening).
export function playBattleSfx(name: BattleSfx, { delayMs = 0, offsetMs = 0 }: { delayMs?: number; offsetMs?: number } = {}) {
  if (!sfxEnabled) return;
  const ctx = getContext();
  const startAt = ctx.currentTime + Math.max(0, delayMs) / 1000;
  const { volume, maxMs } = BATTLE_SFX[name];
  void loadBattleSfx(name).then(buf => {
    if (!buf || !sfxEnabled) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    const t0 = Math.max(startAt, ctx.currentTime);
    const offset = Math.max(0, offsetMs) / 1000;
    const playFor = Math.max(0.05, maxMs / 1000 - offset);
    const fade = Math.min(0.06, playFor / 3);
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.setValueAtTime(volume, t0 + playFor - fade);
    gain.gain.linearRampToValueAtTime(0, t0 + playFor);
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start(t0, offset);
    src.stop(t0 + playFor + 0.01);
  });
}

// --- Battle: attack whoosh ---
export function playAttackWhoosh() {
  if (!sfxEnabled) return;
  const ctx = getContext();
  const now = ctx.currentTime;
  const bufferSize = ctx.sampleRate * 0.3;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.setValueAtTime(800, now);
  bandpass.frequency.exponentialRampToValueAtTime(200, now + 0.3);
  bandpass.Q.value = 2;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  noise.connect(bandpass);
  bandpass.connect(gain);
  gain.connect(ctx.destination);
  noise.start(now);
}

// --- Battle: hit impact thud ---
export function playHitThud() {
  if (!sfxEnabled) return;
  const ctx = getContext();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, now);
  osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
  gain.gain.setValueAtTime(0.4, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.25);
  const bufferSize = ctx.sampleRate * 0.1;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize) * 0.4;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.2, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  noise.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(now);
}

// --- Battle: miss swoosh ---
export function playMiss() {
  if (!sfxEnabled) return;
  const ctx = getContext();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, now);
  osc.frequency.exponentialRampToValueAtTime(150, now + 0.3);
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.35);
}

// --- Battle: victory fanfare ---
export function playVictory() {
  if (!sfxEnabled) return;
  const ctx = getContext();
  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 659.25, 1046.5];
  const durations = [0.12, 0.12, 0.12, 0.08, 0.4];
  let t = now;
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + durations[i]);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + durations[i] + 0.05);
    t += durations[i];
  });
}

// --- New curio obtained: recorded fanfare clip (original AI-generated, replaces a Pokémon-derived clip) ---
export function playCurioCaught() {
  if (!sfxEnabled) return;
  const audio = new Audio('/sounds/curio_caught.mp3');
  audio.volume = 0.6;
  audio.play().catch(() => {});
}

// --- Curio leveled up: recorded fanfare clip (original AI-generated, replaces a Pokémon-derived clip) ---
export function playCurioLevelUp() {
  if (!sfxEnabled) return;
  const audio = new Audio('/sounds/curio_level_up.mp3');
  audio.volume = 0.6;
  audio.play().catch(() => {});
}

// --- Curio graduated into its next form: recorded fanfare clip ---
export function playCurioGraduation() {
  if (!sfxEnabled) return;
  const audio = new Audio('/sounds/curio_graduation.mp3');
  audio.volume = 0.6;
  audio.play().catch(() => {});
}

// --- Achievement unlocked: recorded fanfare clip ---
export function playAchievementUnlock() {
  if (!sfxEnabled) return;
  const audio = new Audio('/sounds/achievement.mp3');
  audio.volume = 0.6;
  audio.play().catch(() => {});
}

// --- Cheer reaction sent on the leaderboard: recorded clip ---
export function playCheer() {
  if (!sfxEnabled) return;
  const audio = new Audio('/sounds/cheer.mp3');
  audio.volume = 0.6;
  audio.play().catch(() => {});
}

// --- Battle item consumed: recorded clip ---
export function playItemUse() {
  if (!sfxEnabled) return;
  const audio = new Audio('/sounds/item_use.mp3');
  audio.volume = 0.6;
  audio.play().catch(() => {});
}

// --- Incoming live-battle challenge: recorded clip ---
export function playPvpChallenge() {
  if (!sfxEnabled) return;
  const audio = new Audio('/sounds/pvp_challenge.mp3');
  audio.volume = 0.6;
  audio.play().catch(() => {});
}

// --- Gold spent on a shop/vault purchase: recorded clip ---
export function playShopPurchase() {
  if (!sfxEnabled) return;
  const audio = new Audio('/sounds/shop_purchase.mp3');
  audio.volume = 0.6;
  audio.play().catch(() => {});
}

// --- Daily journal entry sealed: recorded clip ---
export function playTeachingScroll() {
  if (!sfxEnabled) return;
  const audio = new Audio('/sounds/teaching_scroll.mp3');
  audio.volume = 0.6;
  audio.play().catch(() => {});
}

// --- Trade accepted/completed: recorded clip ---
export function playTradeAccept() {
  if (!sfxEnabled) return;
  const audio = new Audio('/sounds/trade_accept.mp3');
  audio.volume = 0.6;
  audio.play().catch(() => {});
}

// --- Trade declined: recorded clip ---
export function playTradeDecline() {
  if (!sfxEnabled) return;
  const audio = new Audio('/sounds/trade_decline.mp3');
  audio.volume = 0.6;
  audio.play().catch(() => {});
}

// --- Egg cracking open: recorded clip ---
export function playEggCrack() {
  if (!sfxEnabled) return;
  const audio = new Audio('/sounds/egg_crack.mp3');
  audio.volume = 0.6;
  audio.play().catch(() => {});
}

// --- Growth Pill consumed: recorded clip ---
export function playGrowthPillGulp() {
  if (!sfxEnabled) return;
  const audio = new Audio('/sounds/growth_pill_gulp.mp3');
  audio.volume = 0.6;
  audio.play().catch(() => {});
}

// --- New skill inscribed onto a curio: recorded clip ---
export function playSkillInscribe() {
  if (!sfxEnabled) return;
  const audio = new Audio('/sounds/skill_inscribe.mp3');
  audio.volume = 0.6;
  audio.play().catch(() => {});
}

// --- Skill unlearned/forgotten: recorded clip ---
export function playSkillForget() {
  if (!sfxEnabled) return;
  const audio = new Audio('/sounds/skill_forget.mp3');
  audio.volume = 0.6;
  audio.play().catch(() => {});
}

// --- Tutor reroll spin: recorded clip ---
export function playRerollSpin() {
  if (!sfxEnabled) return;
  const audio = new Audio('/sounds/reroll_spin.mp3');
  audio.volume = 0.6;
  audio.play().catch(() => {});
}

// --- Live-battle challenge accepted: recorded clip ---
export function playPvpAccept() {
  if (!sfxEnabled) return;
  const audio = new Audio('/sounds/pvp_accept.mp3');
  audio.volume = 0.6;
  audio.play().catch(() => {});
}

// --- Live-battle challenge declined: recorded clip ---
export function playPvpDecline() {
  if (!sfxEnabled) return;
  const audio = new Audio('/sounds/pvp_decline.mp3');
  audio.volume = 0.6;
  audio.play().catch(() => {});
}

// --- Sidequest guardian defeat voice line: recorded clip, randomly picked among numbered variants ---
const GUARDIAN_DEFEAT_VOICE_COUNT: Record<string, number> = {
  lexiconarena: 4,
  logiclabyrinth: 4,
  lorekeeper: 3,
  numberrealm: 4,
  spellcaster: 4,
};

const GUARDIAN_DEFEAT_VOICE_PREFIX: Record<string, string> = {
  lexiconarena: 'lexicon',
};

export function playGuardianDefeatVoice(guild: string) {
  if (!sfxEnabled) return;
  const count = GUARDIAN_DEFEAT_VOICE_COUNT[guild];
  if (!count) return;
  const prefix = GUARDIAN_DEFEAT_VOICE_PREFIX[guild] ?? guild;
  const variant = Math.floor(Math.random() * count) + 1;
  const audio = new Audio(`/sounds/voice/${prefix}_defeat_${variant}.mp3`);
  audio.volume = 0.7;
  audio.play().catch(() => {});
}

// --- Music: main theme + battle theme, mutually exclusive looping tracks ---
let mainThemeAudio: HTMLAudioElement | null = null;
let battleThemeAudio: HTMLAudioElement | null = null;
let activeMusicTrack: 'main' | 'battle' | null = null;

// --- Term Exam Boss Fight music: an ambient track that overrides the main
// theme game-wide while the boss event is active, and a further-overriding
// track for the persona fight screen itself. Sits as a layer above the
// main/battle system above rather than folded into activeMusicTrack, so
// entering/exiting a persona fight doesn't have to know or care whether a
// regular Curio battle theme would otherwise be playing.
let termBossThemeAudio: HTMLAudioElement | null = null;
let bossFightThemeAudio: HTMLAudioElement | null = null;
let bossMusicLayer: 'boss_fight' | 'term_boss' | null = null;

function applyMusicPlayback() {
  if (!musicEnabled) {
    mainThemeAudio?.pause();
    battleThemeAudio?.pause();
    termBossThemeAudio?.pause();
    bossFightThemeAudio?.pause();
    return;
  }
  if (bossMusicLayer === 'boss_fight') {
    mainThemeAudio?.pause();
    battleThemeAudio?.pause();
    termBossThemeAudio?.pause();
    bossFightThemeAudio?.play().catch(() => {});
    return;
  }
  if (bossMusicLayer === 'term_boss') {
    mainThemeAudio?.pause();
    battleThemeAudio?.pause();
    bossFightThemeAudio?.pause();
    termBossThemeAudio?.play().catch(() => {});
    return;
  }
  termBossThemeAudio?.pause();
  bossFightThemeAudio?.pause();
  if (activeMusicTrack === 'battle') {
    mainThemeAudio?.pause();
    battleThemeAudio?.play().catch(() => {});
  } else if (activeMusicTrack === 'main') {
    battleThemeAudio?.pause();
    mainThemeAudio?.play().catch(() => {});
  }
}

// --- Term boss ambient: plays game-wide (replacing the main theme) for as
// long as the boss event is active. Idempotent — calling it again while
// already playing is a no-op rather than restarting the track.
export function startTermBossTheme() {
  if (!termBossThemeAudio) {
    const audio = new Audio('/sounds/term_boss_bgm.mp3');
    audio.loop = true;
    audio.volume = 0.35;
    termBossThemeAudio = audio;
  }
  if (bossMusicLayer !== 'boss_fight') bossMusicLayer = 'term_boss';
  applyMusicPlayback();
}

export function stopTermBossTheme() {
  if (!termBossThemeAudio) return;
  termBossThemeAudio.pause();
  termBossThemeAudio.currentTime = 0;
  termBossThemeAudio = null;
  if (bossMusicLayer === 'term_boss') bossMusicLayer = null;
  applyMusicPlayback();
}

// --- Persona fight theme: takes over from the term boss ambient (if any)
// for the duration of a single persona challenge. Stopping it falls back to
// the term boss ambient rather than silence/main theme, since the event is
// still active.
export function startBossFightTheme() {
  if (bossFightThemeAudio) return;
  const audio = new Audio('/sounds/term_boss_fight.mp3');
  audio.loop = true;
  audio.volume = 0.4;
  bossFightThemeAudio = audio;
  bossMusicLayer = 'boss_fight';
  applyMusicPlayback();
}

export function stopBossFightTheme() {
  if (!bossFightThemeAudio) return;
  bossFightThemeAudio.pause();
  bossFightThemeAudio.currentTime = 0;
  bossFightThemeAudio = null;
  bossMusicLayer = termBossThemeAudio ? 'term_boss' : null;
  applyMusicPlayback();
}

// --- Main theme: looping background track, plays for the whole session except during battle ---
export function startMainTheme() {
  if (mainThemeAudio) return;
  const audio = new Audio('/sounds/learninghall_maintheme.mp3');
  audio.loop = true;
  audio.volume = 0.35;
  mainThemeAudio = audio;
  activeMusicTrack = 'main';
  applyMusicPlayback();
}

export function stopMainTheme() {
  if (!mainThemeAudio) return;
  mainThemeAudio.pause();
  mainThemeAudio.currentTime = 0;
  mainThemeAudio = null;
  if (activeMusicTrack === 'main') activeMusicTrack = null;
}

// --- Battle theme: looping track that takes over from the main theme for the duration of a fight ---
export function startBattleTheme() {
  if (battleThemeAudio) return;
  const audio = new Audio('/sounds/learninghall_battle.mp3');
  audio.loop = true;
  audio.volume = 0.4;
  battleThemeAudio = audio;
  activeMusicTrack = 'battle';
  applyMusicPlayback();
}

export function stopBattleTheme() {
  if (!battleThemeAudio) return;
  battleThemeAudio.pause();
  battleThemeAudio.currentTime = 0;
  battleThemeAudio = null;
  activeMusicTrack = mainThemeAudio ? 'main' : null;
  applyMusicPlayback();
}

// --- Battle theme: pause without tearing it down, e.g. right before a victory/defeat fanfare ---
export function pauseBattleTheme() {
  battleThemeAudio?.pause();
}

// --- Battle: defeat sting ---
export function playDefeat() {
  if (!sfxEnabled) return;
  const ctx = getContext();
  const now = ctx.currentTime;
  const notes = [392, 349.23, 329.63, 261.63];
  const durations = [0.15, 0.15, 0.15, 0.5];
  let t = now;
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + durations[i]);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + durations[i] + 0.05);
    t += durations[i];
  });
}
