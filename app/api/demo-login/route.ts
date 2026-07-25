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
      return NextResponse.json(
        { success: false, error: 'rate_limited' },
        { status: 429 }
      );
    }
    return NextResponse.json({ success: false }, { status: 500 });
  }

  return NextResponse.json({ success: true, userId: data as string });
}
