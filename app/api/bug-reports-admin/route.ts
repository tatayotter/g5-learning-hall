import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdminPasscode } from '@/lib/adminAuth';

const VALID_STATUSES = ['new', 'needs_manual_triage', 'in_progress', 'resolved', 'wont_fix'] as const;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { passcode, action } = body;

  const authError = requireAdminPasscode(passcode);
  if (authError) return authError;

  if (action === 'list') {
    const { data, error } = await supabaseAdmin
      .from('bug_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, reports: data });
  }

  if (action === 'update') {
    const { id, status, admin_notes, parent_update, mark_notified } = body;
    if (typeof id !== 'string' || !id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
      }
      updates.status = status;
      updates.status_updated_at = new Date().toISOString();
      if (status === 'resolved') updates.resolved_at = new Date().toISOString();
    }
    if (admin_notes !== undefined) updates.admin_notes = admin_notes;
    if (parent_update !== undefined) updates.parent_update = parent_update;
    if (mark_notified) updates.last_notified_at = new Date().toISOString();

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('bug_reports').update(updates).eq('id', id);
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
}
