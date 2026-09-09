import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdminPasscode } from '@/lib/adminAuth';

// Exports the opted-in donor email list for sending dev-update campaigns
// (via Resend broadcast, Mailchimp import, etc. — actually sending a
// campaign is a manual/future step, this route just gives you the list).
// GET with ?passcode= since this has no body to carry it in.
export async function GET(request: NextRequest) {
  const passcode = request.nextUrl.searchParams.get('passcode');
  const authError = requireAdminPasscode(passcode);
  if (authError) return authError;

  const { data, error } = await supabaseAdmin
    .from('support_contributions')
    .select('email, display_name, amount_php, paid_at')
    .eq('status', 'paid')
    .eq('subscribe_updates', true)
    .order('paid_at', { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, subscribers: data });
}
