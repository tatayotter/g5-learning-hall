// lib/sounds.ts
let audioCtx: AudioContext | null = null;
let ambienceNodes: { source: AudioBufferSourceNode; gain: GainNode } | null = null;

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

// --- Parchment seal thump for journal submission ---
export function playSeal() {
  const ctx = getContext();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.2);
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.3);

  const bufferSize = ctx.sampleRate * 0.15;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize) * 0.3;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 400;
  noise.connect(lowpass);
  lowpass.connect(ctx.destination);
  noise.start(now);
}

// --- Coin jingle for vault purchases ---
export function playCoins() {
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

// --- Soft page-flip for tab switching ---
export function playPageFlip() {
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
  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = 3000;
  bandpass.Q.value = 0.7;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  noise.connect(bandpass);
  bandpass.connect(gain);
  gain.connect(ctx.destination);
  noise.start(now);
}

// --- Footstep on grass: soft, dull rustle ---
export function playFootstepGrass() {
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

// --- Battle: attack whoosh ---
export function playAttackWhoosh() {
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

// --- New curio obtained: recorded fanfare clip ---
export function playCurioCaught() {
  const audio = new Audio('/sounds/curio_caught.mp3');
  audio.volume = 0.6;
  audio.play().catch(() => {});
}

// --- Curio leveled up: recorded fanfare clip ---
export function playCurioLevelUp() {
  const audio = new Audio('/sounds/curio_level_up.mp3');
  audio.volume = 0.6;
  audio.play().catch(() => {});
}

// --- Curio graduated into its next form: recorded fanfare clip ---
export function playCurioGraduation() {
  const audio = new Audio('/sounds/curio_graduation.mp3');
  audio.volume = 0.6;
  audio.play().catch(() => {});
}

// --- Battle: defeat sting ---
export function playDefeat() {
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