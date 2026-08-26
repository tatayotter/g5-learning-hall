import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabase } from '@/lib/supabase';
import { requireAdminPasscode } from '@/lib/adminAuth';

/**
 * POST /api/admin-content-save
 *
 * Accepts a weekly package JSON (for one grade + week), then:
 *   1. Writes it to content/generated-packages/week-YYYY-MM-DD-gN.json
 *   2. Imports it to Supabase via admin_set_content_week RPC
 *   3. Updates content/import-status.json
 *
 * Body: { passcode, grade: number, weekStartingDate: string, days: object }
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { passcode, grade, weekStartingDate, days } = body;

  const authError = requireAdminPasscode(passcode);
  if (authError) return authError;

  if (typeof grade !== 'number' || ![2, 3, 4, 5, 6].includes(grade)) {
    return NextResponse.json({ success: false, error: 'Invalid grade' }, { status: 400 });
  }
  if (!weekStartingDate || !/^\d{4}-\d{2}-\d{2}$/.test(weekStartingDate)) {
    return NextResponse.json({ success: false, error: 'Invalid weekStartingDate (expected YYYY-MM-DD)' }, { status: 400 });
  }
  if (!days || typeof days !== 'object') {
    return NextResponse.json({ success: false, error: 'Missing days object' }, { status: 400 });
  }

  const filename     = `week-${weekStartingDate}-g${grade}.json`;
  const packagesDir  = path.join(process.cwd(), 'content', 'generated-packages');
  const filePath     = path.join(packagesDir, filename);
  const statusPath   = path.join(process.cwd(), 'content', 'import-status.json');
  const key          = `${weekStartingDate}-${grade}`;

  // 1. Write JSON file
  try {
    fs.mkdirSync(packagesDir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify({ grade, week_starting_date: weekStartingDate, days }, null, 2));
  } catch (e) {
    return NextResponse.json({ success: false, error: `File write failed: ${(e as Error).message}` }, { status: 500 });
  }

  // 2. Save to Supabase
  const { error: dbError } = await supabase.rpc('admin_set_content_week', {
    p_passcode: process.env.ADMIN_PASSCODE,
    p_grade: grade,
    p_week_starting_date: weekStartingDate,
    p_days: days,
    p_created_by: 'content-matrix',
  });
  if (dbError) {
    return NextResponse.json({ success: false, error: dbError.message }, { status: 409 });
  }

  // 3. Update import-status.json
  try {
    let status: Record<string, string> = {};
    try { status = JSON.parse(fs.readFileSync(statusPath, 'utf-8')); } catch { /* new file */ }
    const { _readme: _, ...rest } = status as Record<string, string>;
    rest[key] = 'imported';
    fs.writeFileSync(statusPath, JSON.stringify({
      _readme: 'Tracks which generated-packages files have been imported into Supabase. Keys are \'YYYY-MM-DD-G\' (week date + grade). Updated by scripts/import-packages.js and by the admin-content-save API route. Do not edit by hand.',
      ...rest,
    }, null, 2));
  } catch {
    // Non-fatal — import still succeeded
  }

  return NextResponse.json({ success: true, key });
}
