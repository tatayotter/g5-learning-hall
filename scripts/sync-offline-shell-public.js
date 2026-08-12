#!/usr/bin/env node
// scripts/sync-offline-shell-public.js
//
// offline-shell/ is its own separate Next.js project (own package.json,
// own node_modules), so Next's static export only ever copies FROM
// offline-shell/public/ — it has no way to see the root public/ directory.
// offline-shell/public/ used to be a hand-curated subset (icons/, main ui/,
// userpics/, etc.) back when the offline shell only rendered a handful of
// trimmed components. Now that it renders the exact same
// components/Dashboard.tsx as the online app, ANY file under root public/
// that some component references (VaultKeeperNpc's
// /tap_npc_sprites/rewardvault_keeper.webp, sound effects, boss art, event
// banners, ...) has to physically exist under offline-shell/public/ too, or
// it 404s with no network to fall back to — unlike the online WebView,
// there's no CachingWebViewClient background-fetch-and-cache option when
// truly offline; the asset has to already be bundled in the APK.
//
// Rather than hand-curate (which is exactly how the tap_npc_sprites/ images
// went missing — the curated list just never got updated), this fully
// mirrors root public/ into offline-shell/public/ so it's structurally
// impossible for the two to drift again. Runs automatically before every
// offline-shell build via the "prebuild" npm lifecycle script.
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SOURCE_DIR = path.join(REPO_ROOT, 'public');
const DEST_DIR = path.join(REPO_ROOT, 'offline-shell', 'public');

function main() {
  fs.rmSync(DEST_DIR, { recursive: true, force: true });
  fs.cpSync(SOURCE_DIR, DEST_DIR, { recursive: true });
  const fileCount = countFiles(DEST_DIR);
  console.log(`[sync-offline-shell-public] mirrored public/ -> offline-shell/public/ (${fileCount} files)`);
}

function countFiles(dir) {
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) count += countFiles(path.join(dir, entry.name));
    else count++;
  }
  return count;
}

main();
