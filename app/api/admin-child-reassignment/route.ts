import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdminPasscode } from '@/lib/adminAuth';

// Admin re-link tool for an already-claimed child — see
// docs/parent-child-linking-design.md. Never executes instantly: the RPC
// only opens a 48h objection window, and this route's job after that is
// just to fire the two notification emails via the admin-reassignment-notify
// edge function (invoked with the service role key, not exposed to the
// browser — this one uses full service credentials since it's an
// admin-only, server-to-server call with no end-user session involved).
export async function POST(request: NextRequest) {
  const { passcode, childId, newParentEmail, reason } = await request.json();

  const authError = requireAdminPasscode(passcode);
  if (authError) return authError;

  if (typeof childId !== 'string' || !childId.trim()) {
    return NextResponse.json({ success: false, error: 'childId is required' }, { status: 400 });
  }
  if (typeof newParentEmail !== 'string' || !newParentEmail.trim()) {
    return NextResponse.json({ success: false, error: 'newParentEmail is required' }, { status: 400 });
  }
  if (typeof reason !== 'string' || !reason.trim()) {
    return NextResponse.json({ success: false, error: 'A reason is required' }, { status: 400 });
  }

  const { data, error } = await supabase.rpc('admin_request_child_reassignment', {
    p_passcode: process.env.ADMIN_PASSCODE,
    p_child_id: childId,
    p_new_parent_email: newParentEmail,
    p_reason: reason,
  });

  if (error || !data) {
    return NextResponse.json({ success: false, error: error?.message || 'Request failed' }, { status: 400 });
  }

  // Best-effort: the reassignment itself is already recorded and will
  // execute after the 48h window regardless of whether these emails send
  // successfully, so a Resend hiccup here shouldn't surface as a failure
  // to the admin — just log it.
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-reassignment-notify`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cancelToken: data.cancel_token,
        oldParentEmail: data.old_parent_email,
        newParentEmail: data.new_parent_email,
        childFullName: data.child_full_name,
      }),
    });
    if (!res.ok) console.error('admin-reassignment-notify failed', await res.text());
  } catch (err) {
    console.error('admin-reassignment-notify unreachable', err);
  }

  return NextResponse.json({ success: true });
}
