import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdminPasscode } from '@/lib/adminAuth';

// Backs components/admin/AnalyticsSection.tsx. analytics_events is no longer
// readable by anon/authenticated (see
// supabase/migrations/20261004130000_drop_analytics_events_public_select.sql),
// so the admin dashboard reads it here with the service-role client instead.
const ALLOWED_RANGES = new Set([7, 30, 90]);
const PAGE_SIZE = 1000; // PostgREST caps a single select at 1000 rows
const MAX_ROWS = 100_000;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { passcode } = body;

  const authError = requireAdminPasscode(passcode);
  if (authError) return authError;

  const rangeDays = Number(body.rangeDays);
  if (!ALLOWED_RANGES.has(rangeDays)) {
    return NextResponse.json({ success: false, error: 'rangeDays must be 7, 30 or 90.' }, { status: 400 });
  }
  const since = new Date(Date.now() - rangeDays * 86400 * 1000).toISOString();

  // Paged so a busy range isn't silently truncated at the 1000-row cap.
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
    const { data, error } = await supabaseAdmin
      .from('analytics_events')
      .select('user_id, event_name, properties, is_family, session_id, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
  }

  return NextResponse.json({ success: true, rows, truncated: rows.length >= MAX_ROWS });
}
