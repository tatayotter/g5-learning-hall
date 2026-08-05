import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Child self-registration (no parent required yet) — see
// docs/parent-child-linking-design.md. Mirrors app/api/demo-login/route.ts:
// the client establishes its own anonymous session and passes the access
// token here so create_unclaimed_child_account's auth.uid() resolves to
// this exact browser, and so the real client IP (unavailable to browser JS)
// can be attached for the RPC's own rate limiting.
export async function POST(request: NextRequest) {
  const { accessToken, username, pin, fullName, grade, gender, schoolName, avatar } = await request.json();

  if (typeof accessToken !== 'string' || !accessToken) {
    return NextResponse.json({ success: false, error: 'missing session' }, { status: 400 });
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

  const authedClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  );

  const { data, error } = await authedClient.rpc('create_unclaimed_child_account', {
    p_ip: ip,
    p_username: username,
    p_pin: pin,
    p_full_name: fullName,
    p_grade: grade,
    p_gender: gender,
    p_school_name: schoolName,
    p_avatar: avatar,
  });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  const row = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ success: true, id: row.id as string, username: row.username as string });
}
