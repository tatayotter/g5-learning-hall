import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { requireAdminPasscode } from '@/lib/adminAuth';

/**
 * GET /api/admin-content-status
 *
 * Returns which grade×week cells have JSON files in content/generated-packages/
 * and which have been imported to Supabase (tracked in content/import-status.json).
 *
 * Response: { files: string[], imported: Record<string, string> }
 * Key format: "YYYY-MM-DD-G"  (e.g. "2026-08-24-5")
 */
export async function GET(request: NextRequest) {
  const passcode = request.nextUrl.searchParams.get('passcode') ?? '';
  const authError = requireAdminPasscode(passcode);
  if (authError) return authError;

  const packagesDir = path.join(process.cwd(), 'content', 'generated-packages');
  const statusPath  = path.join(process.cwd(), 'content', 'import-status.json');

  // Scan generated-packages for week-YYYY-MM-DD-gN.json files
  let files: string[] = [];
  try {
    files = fs.readdirSync(packagesDir)
      .filter(f => /^week-\d{4}-\d{2}-\d{2}-g\d\.json$/.test(f))
      .map(f => {
        const m = f.match(/^week-(\d{4}-\d{2}-\d{2})-g(\d)\.json$/)!;
        return `${m[1]}-${m[2]}`;
      });
  } catch {
    // Directory may not exist yet — return empty list
  }

  // Load import status
  let imported: Record<string, string> = {};
  try {
    const raw = JSON.parse(fs.readFileSync(statusPath, 'utf-8'));
    // Strip the _readme key
    const { _readme: _, ...rest } = raw;
    imported = rest;
  } catch {
    // No status file yet
  }

  return NextResponse.json({ files, imported });
}
