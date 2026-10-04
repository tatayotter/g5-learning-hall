// lib/sounds.ts
let audioCtx: AudioContext | null = null;
let ambienceNodes: { source: AudioBufferSourceNode; gain: GainNode } | null = null;

// --- Audio settings: music / voice / effects volume (0..1), persisted per device ---
// Replaced the old on/off toggles (g5_music_enabled / g5_sfx_enabled); an old
// "off" carries over as volume 0. Voice lines used to follow the effects
// toggle, so voice inherits that one.
const VOLUME_KEYS = { music: 'g5_music_volume', voice: 'g5_voice_volume', sfx: 'g5_sfx_volume' } as const;
export type VolumeChannel = keyof typeof VOLUME_KEYS;
const LEGACY_TOGGLE_KEYS: Record<VolumeChannel, string> = { music: 'g5_music_enabled', voice: 'g5_sfx_enabled', sfx: 'g5_sfx_enabled' };

function readVolume(ch: VolumeChannel): number {
  if (typeof window === 'undefined') return 1;
  try {
    const v = localStorage.getItem(VOLUME_KEYS[ch]);
    if (v !== null) {
      const n = Number(v);
      return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 1;
    }
    return localStorage.getItem(LEGACY_TOGGLE_KEYS[ch]) === '0' ? 0 : 1;
  } catch {
    return 1;
  }
}

const volumes: Record<VolumeChannel, number> = { music: readVolume('music'), voice: readVolume('voice'), sfx: readVolume('sfx') };
let sfxEnabled = volumes.sfx > 0;
let musicEnabled = volumes.music > 0;

export function getVolume(ch: VolumeChannel) {
  return volumes[ch];
}

export function setVolume(ch: VolumeChannel, value: number) {
  const v = Math.min(1, Math.max(0, value));
  volumes[ch] = v;
  try { localStorage.setItem(VOLUME_KEYS[ch], String(Math.round(v * 100) / 100)); } catch { /* private mode */ }
  const b = buses[ch];
  if (b) rampParam(b.gain, v, 0.03);
  if (ch === 'sfx') sfxEnabled = v > 0;
  if (ch === 'music') {
    musicEnabled = v > 0;
    for (const a of [mainThemeAudio, battleThemeAudio, termBossThemeAudio, bossFightThemeAudio]) setMusicLevel(a, true);
    applyMusicPlayback();
  }
}

export function isSfxEnabled() {
  return sfxEnabled;
}

export function isMusicEnabled() {
  return musicEnabled;
}

// Gate for spoken lines (createVoiceAudio).
export function isVoiceEnabled() {
  return volumes.voice > 0;
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

// The AudioContext starts suspended until a tap, and iOS suspends it again
// after a call or a trip to the background; music the browser refused to
// autoplay (musicBlocked) also stays paused. Retry both on the next tap or key
// press (pointerup / touchend / keydown are the events browsers count as a gesture).
let musicBlocked = false;
if (typeof window !== 'undefined') {
  const unlock = () => {
    if (audioCtx && audioCtx.state !== 'running') void audioCtx.resume();
    if (musicBlocked) applyMusicPlayback();
  };
  for (const ev of ['pointerup', 'touchend', 'keydown'] as const) {
    window.addEventListener(ev, unlock, { capture: true, passive: true });
  }
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
    gain.connect(sfxOut());
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
    gain.connect(sfxOut());
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
  noiseGain.connect(sfxOut());
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
    gain.connect(sfxOut());
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
    gain.connect(sfxOut());
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
    gain.connect(sfxOut());
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
  gain.connect(sfxOut());
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
  gain.connect(sfxOut());
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
  gain.connect(sfxOut());
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
  gain.connect(sfxOut());
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
  gain.connect(sfxOut());
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
  alertGain.connect(sfxOut());
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
  growlGain.connect(sfxOut());
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
  gain.connect(sfxOut());
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

// Recorded clips, decoded once and cached by URL (battle SFX and the one-off
// fanfares below).
const clipBuffers = new Map<string, Promise<AudioBuffer | null>>();

function loadClip(src: string): Promise<AudioBuffer | null> {
  let p = clipBuffers.get(src);
  if (!p) {
    p = fetch(src)
      .then(r => r.arrayBuffer())
      .then(b => getContext().decodeAudioData(b))
      .catch(() => null);
    clipBuffers.set(src, p);
  }
  return p;
}

function loadBattleSfx(name: BattleSfx): Promise<AudioBuffer | null> {
  return loadClip(BATTLE_SFX[name].src);
}

// A one-off recorded effect through the effects bus (not an <audio> element,
// whose volume iOS ignores).
function playSfxClip(src: string, volume: number) {
  if (!sfxEnabled) return;
  const ctx = getContext();
  void loadClip(src).then(buf => {
    if (!buf || !sfxEnabled) return;
    const node = ctx.createBufferSource();
    node.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    node.connect(gain).connect(sfxOut());
    node.start();
  });
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
    gain.connect(sfxOut());
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
  gain.connect(sfxOut());
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
  gain.connect(sfxOut());
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
  noiseGain.connect(sfxOut());
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
  gain.connect(sfxOut());
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
    gain.connect(sfxOut());
    osc.start(t);
    osc.stop(t + durations[i] + 0.05);
    t += durations[i];
  });
}

// --- New curio obtained: recorded fanfare clip (original AI-generated, replaces a Pokémon-derived clip) ---
export function playCurioCaught() {
  playSfxClip('/sounds/curio_caught.mp3', 0.6);
}

// --- Curio leveled up: recorded fanfare clip (original AI-generated, replaces a Pokémon-derived clip) ---
export function playCurioLevelUp() {
  playSfxClip('/sounds/curio_level_up.mp3', 0.6);
}

// --- Curio graduated into its next form: recorded fanfare clip ---
export function playCurioGraduation() {
  playSfxClip('/sounds/curio_graduation.mp3', 0.6);
}

// --- Achievement unlocked: recorded fanfare clip ---
export function playAchievementUnlock() {
  playSfxClip('/sounds/achievement.mp3', 0.6);
}

// --- Cheer reaction sent on the leaderboard: recorded clip ---
export function playCheer() {
  playSfxClip('/sounds/cheer.mp3', 0.6);
}

// --- Battle item consumed: recorded clip ---
export function playItemUse() {
  playSfxClip('/sounds/item_use.mp3', 0.6);
}

// --- Incoming live-battle challenge: recorded clip ---
export function playPvpChallenge() {
  playSfxClip('/sounds/pvp_challenge.mp3', 0.6);
}

// --- Gold spent on a shop/vault purchase: recorded clip ---
export function playShopPurchase() {
  playSfxClip('/sounds/shop_purchase.mp3', 0.6);
}

// --- Daily journal entry sealed: recorded clip ---
export function playTeachingScroll() {
  playSfxClip('/sounds/teaching_scroll.mp3', 0.6);
}

// --- Trade accepted/completed: recorded clip ---
export function playTradeAccept() {
  playSfxClip('/sounds/trade_accept.mp3', 0.6);
}

// --- Trade declined: recorded clip ---
export function playTradeDecline() {
  playSfxClip('/sounds/trade_decline.mp3', 0.6);
}

// --- Egg cracking open: recorded clip ---
export function playEggCrack() {
  playSfxClip('/sounds/egg_crack.mp3', 0.6);
}

// --- Growth Pill consumed: recorded clip ---
export function playGrowthPillGulp() {
  playSfxClip('/sounds/growth_pill_gulp.mp3', 0.6);
}

// --- New skill inscribed onto a curio: recorded clip ---
export function playSkillInscribe() {
  playSfxClip('/sounds/skill_inscribe.mp3', 0.6);
}

// --- Skill unlearned/forgotten: recorded clip ---
export function playSkillForget() {
  playSfxClip('/sounds/skill_forget.mp3', 0.6);
}

// --- Tutor reroll spin: recorded clip ---
export function playRerollSpin() {
  playSfxClip('/sounds/reroll_spin.mp3', 0.6);
}

// --- Live-battle challenge accepted: recorded clip ---
export function playPvpAccept() {
  playSfxClip('/sounds/pvp_accept.mp3', 0.6);
}

// --- Live-battle challenge declined: recorded clip ---
export function playPvpDecline() {
  playSfxClip('/sounds/pvp_decline.mp3', 0.6);
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
  if (!isVoiceEnabled()) return;
  const count = GUARDIAN_DEFEAT_VOICE_COUNT[guild];
  if (!count) return;
  const prefix = GUARDIAN_DEFEAT_VOICE_PREFIX[guild] ?? guild;
  const variant = Math.floor(Math.random() * count) + 1;
  createVoiceAudio(`/sounds/voice/${prefix}_defeat_${variant}.mp3`).play().catch(() => {});
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
  musicBlocked = false;
  if (bossMusicLayer === 'boss_fight') {
    mainThemeAudio?.pause();
    battleThemeAudio?.pause();
    termBossThemeAudio?.pause();
    playMusic(bossFightThemeAudio);
    return;
  }
  if (bossMusicLayer === 'term_boss') {
    mainThemeAudio?.pause();
    battleThemeAudio?.pause();
    bossFightThemeAudio?.pause();
    playMusic(termBossThemeAudio);
    return;
  }
  termBossThemeAudio?.pause();
  bossFightThemeAudio?.pause();
  if (activeMusicTrack === 'battle') {
    mainThemeAudio?.pause();
    playMusic(battleThemeAudio);
  } else if (activeMusicTrack === 'main') {
    battleThemeAudio?.pause();
    playMusic(mainThemeAudio);
  }
}

function playMusic(audio: HTMLAudioElement | null) {
  audio?.play().catch(e => { if (e?.name === 'NotAllowedError') musicBlocked = true; });
}

// --- Mix: music, voice and effects, tuned for phone and tablet speakers ---
// Everything plays through Web Audio, not <audio>.volume, which iOS Safari
// ignores (every track used to play at full level there, music louder than
// the voices, and ducking did nothing). Three channels, each with its own
// player volume (setVolume):
//   music   track gain -> music bus -> duck EQ -> bass cut (phones) -> out
//   voice   leveler (createVoiceAudio) -> voice bus -> out
//   effects every SFX / recorded clip -> effects bus -> out
// While anyone speaks, music dips (DUCK_TO) and the duck EQ also carves out
// the band where speech lives, so the voice cuts through without the music
// disappearing. Phone/tablet speakers have no bass and little range: there
// music sits a little lower, loses the bass those speakers only distort on,
// dips further, and voice gets a little extra presence.
const SMALL_SPEAKERS = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;
const MUSIC_TRIM = SMALL_SPEAKERS ? 0.8 : 1;
// Share of a track's level it keeps while someone is speaking.
const DUCK_TO = SMALL_SPEAKERS ? 0.25 : 0.35;
// How deep the duck EQ cuts the speech band (dB) while someone is speaking.
const DUCK_EQ_DB = -7;
// Music waits this long after a line before coming back up, so it doesn't
// swell in the gap between two lines.
const DUCK_RELEASE_MS = 600;

const buses: Partial<Record<VolumeChannel, GainNode>> = {};
let duckEq: BiquadFilterNode | null = null;

// The channel's bus, built on first use. The music bus feeds the duck EQ
// (and the phone bass cut); the others go straight out.
function busFor(ch: VolumeChannel): GainNode {
  const ctx = getContext();
  let b = buses[ch];
  if (!b) {
    b = ctx.createGain();
    b.gain.value = volumes[ch];
    if (ch === 'music') {
      duckEq = ctx.createBiquadFilter();
      duckEq.type = 'peaking';
      duckEq.frequency.value = 2500;
      duckEq.Q.value = 0.8;
      duckEq.gain.value = ducked ? DUCK_EQ_DB : 0;
      let tail: AudioNode = duckEq;
      if (SMALL_SPEAKERS) {
        const bass = ctx.createBiquadFilter();
        bass.type = 'lowshelf';
        bass.frequency.value = 160;
        bass.gain.value = -6;
        duckEq.connect(bass);
        tail = bass;
      }
      b.connect(duckEq);
      tail.connect(ctx.destination);
    } else {
      b.connect(ctx.destination);
    }
    buses[ch] = b;
  }
  return b;
}

// Where every sound effect connects (instead of ctx.destination).
function sfxOut(): AudioNode {
  return busFor('sfx');
}

function rampParam(p: AudioParam, value: number, timeConstant: number) {
  const t = audioCtx?.currentTime ?? 0;
  if (typeof p.cancelAndHoldAtTime === 'function') p.cancelAndHoldAtTime(t);
  else { p.cancelScheduledValues(t); p.setValueAtTime(p.value, t); }
  p.setTargetAtTime(value, t, timeConstant);
}

const musicNodes = new WeakMap<HTMLAudioElement, { base: number; source: MediaElementAudioSourceNode | null; gain: GainNode | null }>();
let manualDuck = false;
let activeVoices = 0;
let ducked = false;
let unduckTimer: ReturnType<typeof setTimeout> | undefined;

function createMusic(src: string, base: number): HTMLAudioElement {
  const audio = new Audio(src);
  audio.loop = true;
  let source: MediaElementAudioSourceNode | null = null;
  let gain: GainNode | null = null;
  try {
    const ctx = getContext();
    source = ctx.createMediaElementSource(audio);
    gain = ctx.createGain();
    source.connect(gain).connect(busFor('music'));
  } catch {
    source = gain = null; // no Web Audio: fall back to .volume
  }
  musicNodes.set(audio, { base, source, gain });
  setMusicLevel(audio, true);
  return audio;
}

function releaseMusic(audio: HTMLAudioElement) {
  const m = musicNodes.get(audio);
  m?.source?.disconnect();
  m?.gain?.disconnect();
  musicNodes.delete(audio);
}

function setMusicLevel(audio: HTMLAudioElement | null, instant = false) {
  const m = audio && musicNodes.get(audio);
  if (!audio || !m) return;
  const level = m.base * MUSIC_TRIM * (ducked ? DUCK_TO : 1);
  if (!m.gain) {
    // Fallback path has no bus, so the player's music volume applies here.
    audio.volume = Math.min(1, level * volumes.music);
    return;
  }
  if (instant) {
    const t = m.gain.context.currentTime;
    m.gain.gain.cancelScheduledValues(t);
    m.gain.gain.setValueAtTime(level, t);
    return;
  }
  // Dip fast (~0.2s), come back slowly (~0.75s).
  rampParam(m.gain.gain, level, ducked ? 0.07 : 0.25);
}

function refreshDuck() {
  const want = manualDuck || activeVoices > 0;
  clearTimeout(unduckTimer);
  if (want === ducked) return;
  const apply = (d: boolean) => {
    ducked = d;
    for (const a of [mainThemeAudio, battleThemeAudio, termBossThemeAudio, bossFightThemeAudio]) setMusicLevel(a);
    if (duckEq) rampParam(duckEq.gain, d ? DUCK_EQ_DB : 0, d ? 0.07 : 0.25);
  };
  if (want) apply(true);
  else unduckTimer = setTimeout(() => apply(false), DUCK_RELEASE_MS);
}

// Voice lines: the files are already mastered to one loudness
// (scripts/optimize-assets.mjs); this evens out what's left (measured within
// ~1 dB across the intro clips), cuts low rumble, adds a little presence on
// phones and catches peaks. Tuned offline with OfflineAudioContext.
let voiceInput: AudioNode | null = null;
function getVoiceInput(ctx: AudioContext): AudioNode {
  if (!voiceInput) {
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = SMALL_SPEAKERS ? 120 : 80;
    const presence = ctx.createBiquadFilter();
    presence.type = 'peaking';
    presence.frequency.value = 3000;
    presence.Q.value = 0.9;
    presence.gain.value = SMALL_SPEAKERS ? 3 : 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -24;
    comp.knee.value = 10;
    comp.ratio.value = 3;
    comp.attack.value = 0.003;
    comp.release.value = 0.25;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -3;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.1;
    hp.connect(presence).connect(comp).connect(limiter).connect(busFor('voice'));
    voiceInput = hp;
  }
  return voiceInput;
}

// Use for every spoken line instead of `new Audio()` (and gate it on
// isVoiceEnabled()). One play per element: it's unhooked from the mix once it
// ends, errors or is paused. Music dips while it plays.
export function createVoiceAudio(src: string): HTMLAudioElement {
  const audio = new Audio(src);
  let source: MediaElementAudioSourceNode | null = null;
  // Only through Web Audio while it's running — a suspended context would
  // play the clip silently while its captions moved on.
  if (audioCtx?.state === 'running') {
    try {
      source = audioCtx.createMediaElementSource(audio);
      source.connect(getVoiceInput(audioCtx));
    } catch {
      source = null;
    }
  }
  if (!source) audio.volume = Math.min(1, 0.95 * volumes.voice);
  let speaking = false;
  audio.addEventListener('play', () => {
    if (speaking) return;
    speaking = true;
    activeVoices += 1;
    refreshDuck();
  });
  const done = () => {
    if (speaking) {
      speaking = false;
      activeVoices -= 1;
      refreshDuck();
    }
    source?.disconnect();
  };
  audio.addEventListener('pause', done);
  audio.addEventListener('ended', done);
  audio.addEventListener('error', done);
  return audio;
}

// --- Term boss ambient: plays game-wide (replacing the main theme) for as
// long as the boss event is active. Idempotent — calling it again while
// already playing is a no-op rather than restarting the track.
export function startTermBossTheme() {
  if (!termBossThemeAudio) {
    termBossThemeAudio = createMusic('/sounds/term_boss_bgm.mp3', 0.35);
  }
  if (bossMusicLayer !== 'boss_fight') bossMusicLayer = 'term_boss';
  applyMusicPlayback();
}

export function stopTermBossTheme() {
  if (!termBossThemeAudio) return;
  termBossThemeAudio.pause();
  termBossThemeAudio.currentTime = 0;
  releaseMusic(termBossThemeAudio);
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
  bossFightThemeAudio = createMusic('/sounds/term_boss_fight.mp3', 0.4);
  bossMusicLayer = 'boss_fight';
  applyMusicPlayback();
}

export function stopBossFightTheme() {
  if (!bossFightThemeAudio) return;
  bossFightThemeAudio.pause();
  bossFightThemeAudio.currentTime = 0;
  releaseMusic(bossFightThemeAudio);
  bossFightThemeAudio = null;
  bossMusicLayer = termBossThemeAudio ? 'term_boss' : null;
  applyMusicPlayback();
}

// --- Main theme: looping background track, plays for the whole session except during battle ---
export function startMainTheme() {
  if (mainThemeAudio) return;
  mainThemeAudio = createMusic('/sounds/learninghall_maintheme.mp3', 0.35);
  activeMusicTrack = 'main';
  applyMusicPlayback();
}

// Holds the music down (see DUCK_TO) for a run of voice lines and lets it
// back up after, so it doesn't swell between lines. Every track, not just the
// main theme. Lines from createVoiceAudio also duck on their own while they
// play. Only touches levels, so it's safe whether or not music is playing.
export function duckMainTheme(ducked: boolean) {
  manualDuck = ducked;
  refreshDuck();
}

// Whether each track is currently set to play — lets the intro start music
// for itself and stop only what it started (the Dashboard may already own it).
export function isMainThemeActive() {
  return mainThemeAudio !== null;
}

export function isTermBossThemeActive() {
  return termBossThemeAudio !== null;
}

export function stopMainTheme() {
  if (!mainThemeAudio) return;
  mainThemeAudio.pause();
  mainThemeAudio.currentTime = 0;
  releaseMusic(mainThemeAudio);
  mainThemeAudio = null;
  if (activeMusicTrack === 'main') activeMusicTrack = null;
}

// --- Battle theme: looping track that takes over from the main theme for the duration of a fight ---
export function startBattleTheme() {
  if (battleThemeAudio) return;
  battleThemeAudio = createMusic('/sounds/learninghall_battle.mp3', 0.4);
  activeMusicTrack = 'battle';
  applyMusicPlayback();
}

export function stopBattleTheme() {
  if (!battleThemeAudio) return;
  battleThemeAudio.pause();
  battleThemeAudio.currentTime = 0;
  releaseMusic(battleThemeAudio);
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
    gain.connect(sfxOut());
    osc.start(t);
    osc.stop(t + durations[i] + 0.05);
    t += durations[i];
  });
}
