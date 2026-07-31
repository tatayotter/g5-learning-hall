import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const { accessToken } = await request.json();

  if (typeof accessToken !== 'string' || !accessToken) {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

  // Scoped to the caller's own session/JWT (not the shared anon-key server
  // client) so create_demo_account's auth.uid() resolves to whichever
  // browser actually holds this token. Without this, a client could pass
  // someone else's auth_uid and hijack their identity mapping — the RPC used
  // to accept it as a plain (client-supplied) parameter instead.
  const authedClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  );

  const { data, error } = await authedClient.rpc('create_demo_account', { p_ip: ip });

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
