import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabase } from '@/lib/supabase';
import { requireAdminPasscode } from '@/lib/adminAuth';

/**
 * POST /api/admin-content-import-all
 *
 * Reads all JSON files in content/generated-packages/ that are not yet
 * in content/import-status.json, imports each to Supabase, and updates
 * the status file.
 *
 * Body: { passcode, force?: boolean }
 * Response: { success, results: [{key, ok, error?}] }
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { passcode, force = false } = body;

  const authError = requireAdminPasscode(passcode);
  if (authError) return authError;

  const packagesDir = path.join(process.cwd(), 'content', 'generated-packages');
  const statusPath  = path.join(process.cwd(), 'content', 'import-status.json');

  // Load import status
  let status: Record<string, string> = {};
  try {
    const raw = JSON.parse(fs.readFileSync(statusPath, 'utf-8'));
    const { _readme: _, ...rest } = raw;
    status = rest;
  } catch { /* new file */ }

  // List all package files
  let fileNames: string[] = [];
  try {
    fileNames = fs.readdirSync(packagesDir)
      .filter(f => /^week-\d{4}-\d{2}-\d{2}-g\d\.json$/.test(f));
  } catch {
    return NextResponse.json({ success: true, results: [] });
  }

  const results: { key: string; ok: boolean; error?: string }[] = [];

  for (const file of fileNames) {
    const m = file.match(/^week-(\d{4}-\d{2}-\d{2})-g(\d)\.json$/)!;
    const weekDate = m[1];
    const grade    = Number(m[2]);
    const key      = `${weekDate}-${grade}`;

    if (!force && status[key] === 'imported') {
      results.push({ key, ok: true });
      continue;
    }

    let days: object;
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(packagesDir, file), 'utf-8'));
      days = pkg.days;
      if (!days) throw new Error('Missing "days" key');
    } catch (e) {
      results.push({ key, ok: false, error: `File parse: ${(e as Error).message}` });
      continue;
    }

    const { error: dbError } = await supabase.rpc('admin_set_content_week', {
      p_passcode: process.env.ADMIN_PASSCODE,
      p_grade: grade,
      p_week_starting_date: weekDate,
      p_days: days,
      p_created_by: 'content-matrix-batch',
    });

    if (dbError) {
      results.push({ key, ok: false, error: dbError.message });
    } else {
      status[key] = 'imported';
      results.push({ key, ok: true });
    }
  }

  // Persist updated status
  try {
    fs.writeFileSync(statusPath, JSON.stringify({
      _readme: "Tracks which generated-packages files have been imported into Supabase. Keys are 'YYYY-MM-DD-G' (week date + grade). Updated by scripts/import-packages.js and by the admin-content-save API route. Do not edit by hand.",
      ...status,
    }, null, 2));
  } catch { /* non-fatal */ }

  const ok   = results.filter(r => r.ok).length;
  const fail = results.filter(r => !r.ok).length;

  return NextResponse.json({ success: true, ok, fail, results });
}
