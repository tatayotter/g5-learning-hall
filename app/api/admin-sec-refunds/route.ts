import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdminPasscode } from '@/lib/adminAuth';

// Backs the refund policy in app/terms/page.tsx: an admin looks up a child by
// username, sees their SEC purchases (with an attempt count, so "has this
// child actually used the pack yet" is visible before deciding), and can
// revoke one back to 'refunded'. See
// supabase/migrations/20260906100000_add_sec_entitlement_refunds.sql.
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { passcode, action } = body;

  const authError = requireAdminPasscode(passcode);
  if (authError) return authError;

  if (action === 'search_child') {
    const { username } = body;
    if (!username) {
      return NextResponse.json({ success: false, error: 'A child username is required.' }, { status: 400 });
    }
    // Username -> child_id lookup uses the service-role client since this
    // isn't itself a passcode-gated RPC — children.username isn't sensitive
    // on its own and every write below still re-checks the passcode.
    const { data: child, error: childError } = await supabaseAdmin
      .from('children')
      .select('id, full_name, username, grade')
      .ilike('username', username)
      .maybeSingle();
    if (childError || !child) {
      return NextResponse.json({ success: false, error: 'No child found with that username.' }, { status: 404 });
    }
    const { data: entitlements, error: entError } = await supabase.rpc('admin_list_sec_entitlements_for_child', {
      p_passcode: passcode, p_child_id: child.id,
    });
    if (entError) return NextResponse.json({ success: false, error: entError.message }, { status: 409 });
    return NextResponse.json({ success: true, child, entitlements });
  }

  if (action === 'refund') {
    const { entitlementId } = body;
    if (!entitlementId) {
      return NextResponse.json({ success: false, error: 'entitlementId is required.' }, { status: 400 });
    }
    const { error } = await supabase.rpc('admin_refund_sec_entitlement', {
      p_passcode: passcode, p_entitlement_id: entitlementId,
    });
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
}
