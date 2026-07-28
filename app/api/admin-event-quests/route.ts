import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdminPasscode } from '@/lib/adminAuth';

export async function POST(request: NextRequest) {
  const { passcode, eventId, rows } = await request.json();

  const authError = requireAdminPasscode(passcode);
  if (authError) return authError;
  if (typeof eventId !== 'string' || !Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ success: false, error: 'eventId and a non-empty rows array are required' }, { status: 400 });
  }

  const { error } = await supabase.rpc('admin_upsert_event_quests', {
    p_passcode: process.env.ADMIN_PASSCODE,
    p_event_id: eventId,
    p_rows: rows,
  });
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 409 });
  return NextResponse.json({ success: true });
}
