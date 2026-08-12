#!/usr/bin/env node
// scripts/prepare-webcache-seed.js
//
// Copies a curated subset of public/ into
// android/app/src/main/assets/webcache_seed/, renamed to match exactly the
// cache filenames CachingWebViewClient.java computes at runtime (sha256 of
// the full request URL + original extension) — so MainActivity's first-launch
// copy step (see MainActivity.java) can just copy files into the cache dir
// with zero re-hashing logic needed on the Android side.
//
// Run manually (or wire into a "prebuild" step) before `npx cap sync android`
// whenever the curated set below changes: node scripts/prepare-webcache-seed.js
//
// Deliberately NOT the whole public/ (49MB/320 files) — just what's likely
// needed on the very first screen after a fresh install, before the
// CachingWebViewClient has had a chance to lazily cache anything else itself.
// Everything else (term boss music, full maps/, monsters/) caches on first
// use instead (see CachingWebViewClient's own background-fetch-and-cache path).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REPO_ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(REPO_ROOT, 'public');
const SEED_OUT_DIR = path.join(REPO_ROOT, 'android', 'app', 'src', 'main', 'assets', 'webcache_seed');

// Must match capacitor.config.ts's server.url exactly (no trailing slash) —
// this is the origin every request CachingWebViewClient sees is made
// against, so the seed filenames have to be hashed from the same full URL.
const BASE_URL = 'https://learninghall.vercel.app';

// Curated seed set — reused UI chrome, the welcome screen, and the two most
// common music tracks. Roughly 10-12MB; deliberately excludes heavier
// rarely-first-screen assets (term boss music, full maps/, monsters/).
const SEED_ENTRIES = [
  { dir: 'icons' },
  { dir: 'battleui' },
  { dir: 'main ui' },
  { file: 'welcome-hero.webp' },
  { file: 'learning_hall_full_logo.webp' },
  { file: 'learning_hall_full_logo_optimize.png' },
  { file: 'sounds/learninghall_maintheme.mp3' },
  { file: 'sounds/learninghall_battle.mp3' },
];

function sha256Hex(input) {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

function extensionOf(filename) {
  const dot = filename.lastIndexOf('.');
  if (dot < 0 || dot === filename.length - 1) return null;
  return filename.slice(dot + 1).toLowerCase();
}

function listFilesRecursive(dirAbsPath) {
  const out = [];
  for (const entry of fs.readdirSync(dirAbsPath, { withFileTypes: true })) {
    const abs = path.join(dirAbsPath, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFilesRecursive(abs));
    } else if (entry.isFile()) {
      out.push(abs);
    }
  }
  return out;
}

function seedOneFile(absPath) {
  const relPath = path.relative(PUBLIC_DIR, absPath).split(path.sep).join('/');
  const url = `${BASE_URL}/${relPath}`;
  const extension = extensionOf(path.basename(absPath));
  const hash = sha256Hex(url);
  const outName = extension ? `${hash}.${extension}` : hash;
  const outPath = path.join(SEED_OUT_DIR, outName);
  fs.copyFileSync(absPath, outPath);
  return { relPath, outName };
}

function main() {
  fs.rmSync(SEED_OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(SEED_OUT_DIR, { recursive: true });

  let totalBytes = 0;
  let count = 0;

  for (const entry of SEED_ENTRIES) {
    if (entry.dir) {
      const dirAbs = path.join(PUBLIC_DIR, entry.dir);
      if (!fs.existsSync(dirAbs)) {
        console.warn(`[prepare-webcache-seed] skipping missing dir: public/${entry.dir}`);
        continue;
      }
      for (const abs of listFilesRecursive(dirAbs)) {
        const { relPath } = seedOneFile(abs);
        totalBytes += fs.statSync(abs).size;
        count++;
        console.log(`  seeded public/${relPath}`);
      }
    } else if (entry.file) {
      const abs = path.join(PUBLIC_DIR, entry.file);
      if (!fs.existsSync(abs)) {
        console.warn(`[prepare-webcache-seed] skipping missing file: public/${entry.file}`);
        continue;
      }
      seedOneFile(abs);
      totalBytes += fs.statSync(abs).size;
      count++;
      console.log(`  seeded public/${entry.file}`);
    }
  }

  console.log(`[prepare-webcache-seed] wrote ${count} files (${(totalBytes / (1024 * 1024)).toFixed(1)}MB) to ${path.relative(REPO_ROOT, SEED_OUT_DIR)}`);
}

main();
