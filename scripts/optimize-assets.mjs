// scripts/optimize-assets.mjs
//
// Shrinks game art and masters voice clips for phone speakers, in place.
// Run after adding or replacing art/voice files:
//
//   node scripts/optimize-assets.mjs            (images + voice)
//   node scripts/optimize-assets.mjs images
//   node scripts/optimize-assets.mjs audio      (needs ffmpeg; set FFMPEG=<path> if it isn't on PATH)
//
// Every processed file's hash goes into scripts/optimized-assets.json, so a
// file is only ever processed once (re-encoding lossy files again and again
// would slowly degrade them). Replacing a file changes its hash, so the new
// version gets processed on the next run.
//
// Images: WebP re-encoded at quality 72 (alpha kept lossless, so curio
// cropping in lib/phaserBattle/BattleStageScene.ts sees identical edges);
// sprite-style PNGs palette-quantized. Dimensions never change: portrait
// phones already show the intro art larger than its native size. A result
// is only kept if it's at least 10% smaller.
//
// Voice: rumble cut, a little presence (where speech is clearest on small
// speakers), gentle compression, then two-pass loudness normalization to
// -16 LUFS so every line plays at the same level. Mono 64 kbps.
// Music and sound effects aren't touched: their in-game levels are tuned in
// lib/sounds.ts against the files as they are.
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = path.join(ROOT, 'scripts', 'optimized-assets.json');

const WEBP_DIRS = ['public/intro', 'public/battleui', 'public/monsters', 'public/bosses'];
const WEBP_FILES = ['public/loading_screen_landscape.webp', 'public/loading_screen_vertical.webp', 'public/welcome-hero.webp', 'public/splash1.webp'];
const PNG_DIRS = ['public/npcs', 'public/eggs', 'public/intro'];
const VOICE_DIRS = ['public/sounds/voice'];

const MIN_SAVING = 0.1;

const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};
const rel = p => path.relative(ROOT, p).split(path.sep).join('/');
const hash = p => createHash('sha1').update(fs.readFileSync(p)).digest('hex');
const done = p => manifest[rel(p)] === hash(p);
const record = p => { manifest[rel(p)] = hash(p); };

function listFiles(dir, ext, recursive = false) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap(e => {
    const p = path.join(abs, e.name);
    if (e.isDirectory()) return recursive ? listFiles(rel(p), ext, true) : [];
    return e.name.toLowerCase().endsWith(ext) ? [p] : [];
  });
}

const kb = n => `${Math.round(n / 1024)} KB`;
const totals = { before: 0, after: 0, files: 0 };

async function optimizeImage(file, encode) {
  if (done(file)) return;
  const input = fs.readFileSync(file);
  const output = await encode(sharp(input)).toBuffer();
  totals.before += input.length;
  if (output.length <= input.length * (1 - MIN_SAVING)) {
    fs.writeFileSync(file, output);
    totals.after += output.length;
    totals.files += 1;
    console.log(`  ${rel(file)}  ${kb(input.length)} -> ${kb(output.length)}`);
  } else {
    totals.after += input.length;
  }
  record(file);
}

async function images() {
  console.log('Images');
  const webps = [...WEBP_DIRS.flatMap(d => listFiles(d, '.webp')), ...WEBP_FILES.map(f => path.join(ROOT, f)).filter(f => fs.existsSync(f))];
  for (const f of webps) {
    await optimizeImage(f, s => s.webp({ quality: 72, alphaQuality: 100, effort: 6, smartSubsample: true }));
  }
  for (const f of PNG_DIRS.flatMap(d => listFiles(d, '.png'))) {
    await optimizeImage(f, s => s.png({ palette: true, quality: 85, effort: 10, compressionLevel: 9 }));
  }
}

const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const VOICE_PRE = 'highpass=f=90,equalizer=f=3000:t=q:w=1.0:g=2,acompressor=threshold=-21dB:ratio=2.5:attack=5:release=120';
const VOICE_TARGET = 'I=-16:TP=-1.5:LRA=7';

// Returns ffmpeg's stderr (where it prints its log and loudnorm's JSON);
// throws if ffmpeg fails.
function ffmpeg(args) {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-nostdin', ...args], { encoding: 'utf8' });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr.slice(-500)}`);
  return r.stderr;
}

function masterVoice(file) {
  if (done(file)) return;
  // Pass 1: measure loudness after the pre-filters.
  const log = ffmpeg(['-i', file, '-af', `${VOICE_PRE},loudnorm=${VOICE_TARGET}:print_format=json`, '-f', 'null', '-']);
  const m = JSON.parse(log.slice(log.lastIndexOf('{'), log.lastIndexOf('}') + 1));
  // Pass 2: apply with the measured values (linear mode keeps it natural).
  const tmp = `${file}.tmp.mp3`;
  const ln = `loudnorm=${VOICE_TARGET}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  const before = fs.statSync(file).size;
  ffmpeg(['-y', '-i', file, '-af', `${VOICE_PRE},${ln}`, '-ar', '44100', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k', '-map_metadata', '-1', tmp]);
  fs.renameSync(tmp, file);
  const after = fs.statSync(file).size;
  totals.before += before;
  totals.after += after;
  totals.files += 1;
  console.log(`  ${rel(file)}  ${kb(before)} -> ${kb(after)}  (was ${(+m.input_i).toFixed(1)} LUFS)`);
  record(file);
}

function audio() {
  try { ffmpeg(['-version']); } catch {
    console.error('ffmpeg not found — install it or set FFMPEG=<path to ffmpeg>');
    process.exit(1);
  }
  console.log('Voice');
  for (const f of VOICE_DIRS.flatMap(d => listFiles(d, '.mp3', true))) masterVoice(f);
}

const which = process.argv[2] ?? 'all';
if (which === 'all' || which === 'images') await images();
if (which === 'all' || which === 'audio') audio();
fs.writeFileSync(MANIFEST, `${JSON.stringify(Object.fromEntries(Object.entries(manifest).sort()), null, 2)}\n`);
console.log(`\n${totals.files} files changed, ${kb(totals.before)} -> ${kb(totals.after)}`);
