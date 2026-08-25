import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Child self-registration (no parent required yet) — see
// docs/parent-child-linking-design.md. The client establishes its own
// anonymous session and passes the access token here so
// create_unclaimed_child_account's auth.uid() resolves to this exact
// browser, and so the real client IP (unavailable to browser JS) can be
// attached for the RPC's own rate limiting.
export async function POST(request: NextRequest) {
  const { accessToken, username, pin, fullName, grade, gender, schoolName, avatar, source, sessionId, referralCode } = await request.json();

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

  // Mirrors ParentRegisterForm's direct insert: this child has no
  // g5_active_user session yet, so trackEvent()'s getActiveUser() gate
  // would silently drop it. Awaited (not fire-and-forget) since a serverless
  // function can be torn down right after the response is sent.
  const { error: analyticsError } = await authedClient.from('analytics_events').insert({
    user_id: row.id,
    session_id: typeof sessionId === 'string' && sessionId ? sessionId : 'server',
    event_name: 'child_self_registration_submitted',
    properties: { source: 'organic' },
    is_family: false,
    client_ts: new Date().toISOString(),
  });
  if (analyticsError) console.error('Failed to write analytics event:', analyticsError);

  // Apply referral code if supplied — non-fatal if it fails or is invalid.
  if (typeof referralCode === 'string' && referralCode.trim()) {
    const { error: refError } = await authedClient.rpc('apply_referral_code', {
      p_registrant_id: row.id,
      p_code: referralCode.trim(),
    });
    if (refError) console.error('apply_referral_code error (non-fatal):', refError);
  }

  return NextResponse.json({ success: true, id: row.id as string, username: row.username as string });
}
