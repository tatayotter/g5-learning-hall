import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// One-click unsubscribe from dev-update emails, reached from a link in the
// receipt/update email itself -- no login, the token IS the credential. See
// unsubscribe_support_updates in 20260909120000_add_support_contributions.sql.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ success: false, error: 'Missing token' }, { status: 400 });
  }

  const { data: matched, error } = await supabaseAdmin.rpc('unsubscribe_support_updates', { p_token: token });
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, matched: Boolean(matched) });
}
