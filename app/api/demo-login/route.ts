import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const { authUid } = await request.json();

  if (typeof authUid !== 'string') {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

  const { data, error } = await supabase.rpc('create_demo_account', {
    p_auth_uid: authUid,
    p_ip: ip,
  });

  if (error) {
    if (error.message.includes('rate limit')) {
      // create_demo_account() only persists demo_rate_limit rows on success
      // (they drive its own sliding-window check), so a block leaves no
      // trace anywhere else. Log it here — no demo user_id exists yet since
      // the RPC failed before creating one.
      await supabase.from('analytics_events').insert({
        user_id: 'anon_demo_rate_limited',
        session_id: crypto.randomUUID(),
        event_name: 'demo_rate_limited',
        properties: {},
        is_family: false,
      });
      return NextResponse.json(
        { success: false, error: 'rate_limited' },
        { status: 429 }
      );
    }
    return NextResponse.json({ success: false }, { status: 500 });
  }

  return NextResponse.json({ success: true, userId: data as string });
}
