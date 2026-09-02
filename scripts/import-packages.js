/**
 * scripts/import-packages.js
 *
 * Bulk-imports all JSON files in content/generated-packages/ into Supabase
 * via the admin-weekly API route. Requires the Next.js dev server to be running.
 *
 * Usage:
 *   node scripts/import-packages.js
 *   node scripts/import-packages.js --dry-run          # print without saving
 *   node scripts/import-packages.js --grade=5          # only grade 5
 *   node scripts/import-packages.js --week=2026-08-24  # only this week
 *   node scripts/import-packages.js --force            # re-import already-imported files
 *
 * Reads ADMIN_PASSCODE from .env.local automatically.
 */

const fs = require('fs');
const path = require('path');

// ─── Load env ────────────────────────────────────────────────────────────────
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  // Split on /\r?\n/, not '\n'. On Windows .env.local is CRLF, and JS `.` never
  // matches \r, so with a plain '\n' split every line kept a trailing \r that
  // (.*)$ could not consume — the regex failed on EVERY line and nothing was
  // loaded, making the script report "ADMIN_PASSCODE not set" for a file that
  // plainly contained it.
  fs.readFileSync(envPath, 'utf-8')
    .split(/\r?\n/)
    .forEach(line => {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '');
    });
}

// ─── Config ──────────────────────────────────────────────────────────────────
const PASSCODE = process.env.ADMIN_PASSCODE;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const DRY_RUN  = process.argv.includes('--dry-run');
const FORCE    = process.argv.includes('--force');
const FILTER_GRADE = (process.argv.find(a => a.startsWith('--grade=')) || '').split('=')[1];
const FILTER_WEEK  = (process.argv.find(a => a.startsWith('--week='))  || '').split('=')[1];

const PACKAGES_DIR     = path.join(__dirname, '..', 'content', 'generated-packages');
const IMPORT_STATUS_PATH = path.join(__dirname, '..', 'content', 'import-status.json');

if (!PASSCODE) {
  console.error('❌  ADMIN_PASSCODE not set in .env.local');
  process.exit(1);
}

// ─── Load / save import status ────────────────────────────────────────────────
function loadStatus() {
  try { return JSON.parse(fs.readFileSync(IMPORT_STATUS_PATH, 'utf-8')); }
  catch { return {}; }
}
function saveStatus(status) {
  fs.writeFileSync(IMPORT_STATUS_PATH, JSON.stringify(status, null, 2));
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const status = loadStatus();

  const allFiles = fs.readdirSync(PACKAGES_DIR)
    .filter(f => f.match(/^week-\d{4}-\d{2}-\d{2}-g\d\.json$/))
    .sort();

  // Apply filters
  const files = allFiles.filter(f => {
    if (FILTER_GRADE && !f.includes(`-g${FILTER_GRADE}.json`)) return false;
    if (FILTER_WEEK  && !f.includes(FILTER_WEEK)) return false;
    return true;
  });

  console.log(`\n📦  import-packages`);
  console.log(`    Base URL : ${BASE_URL}`);
  console.log(`    Files    : ${files.length} of ${allFiles.length} total`);
  if (DRY_RUN) console.log(`    Mode     : DRY RUN (nothing will be saved)\n`);
  else         console.log('');

  let ok = 0, skip = 0, fail = 0;

  for (const file of files) {
    // Parse filename: week-2026-08-24-g5.json
    const m = file.match(/^week-(\d{4}-\d{2}-\d{2})-g(\d)\.json$/);
    if (!m) { console.warn(`  ⚠️  Unrecognised filename: ${file}`); fail++; continue; }
    const [, weekDate, gradeStr] = m;
    const grade = Number(gradeStr);
    const key = `${weekDate}-${grade}`;

    if (!FORCE && status[key] === 'imported') {
      console.log(`  ⏭  G${grade} ${weekDate}  (already imported — use --force to redo)`);
      skip++;
      continue;
    }

    const filePath = path.join(PACKAGES_DIR, file);
    let pkg;
    try {
      pkg = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      console.error(`  ✗  ${file} — could not parse JSON`);
      fail++; continue;
    }

    const { days } = pkg;
    if (!days) {
      console.error(`  ✗  ${file} — missing "days" key`);
      fail++; continue;
    }

    process.stdout.write(`  →  G${grade} ${weekDate}  `);

    if (DRY_RUN) {
      const subjects = Object.values(days).flatMap(d => Object.keys(d));
      console.log(`[dry] ${subjects.length} subject-days`);
      ok++;
      continue;
    }

    try {
      const res = await fetch(`${BASE_URL}/api/admin-weekly`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passcode: PASSCODE,
          action: 'set_content_week',
          grade,
          weekStartingDate: weekDate,
          days,
          createdBy: 'import-script',
        }),
      });
      const data = await res.json();
      if (data.success) {
        console.log('✓');
        status[key] = 'imported';
        ok++;
      } else {
        console.log(`✗  ${data.error}`);
        fail++;
      }
    } catch (e) {
      console.log(`✗  ${e.message}`);
      fail++;
    }
  }

  if (!DRY_RUN) saveStatus(status);

  console.log(`\n  Done: ${ok} imported, ${skip} skipped, ${fail} failed.\n`);
  if (fail > 0) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
