import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyTurnstileToken } from '@/lib/turnstile';
import { friendlyNameError } from '@/lib/nameFilter';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Maps create_unclaimed_child_account's raw exception text to something a
// kid can act on. Unknown errors pass through unchanged.
function friendlySignupError(message: string): string {
  const nameError = friendlyNameError(message);
  if (nameError) return nameError;
  if (message.includes('signup rate limit exceeded')) {
    return 'Lots of accounts are being made on this network right now. Please wait a few minutes and try again.';
  }
  if (message.includes('username already taken')) {
    return 'That username is already taken. Try adding a number or your initials.';
  }
  if (message.includes('invalid username')) {
    return 'Usernames can only use letters, numbers, and underscores.';
  }
  if (message.includes('pin must be 4 digits')) {
    return 'Your PIN must be exactly 4 numbers.';
  }
  return message;
}

// Same child typed the same way, give or take case, spacing and punctuation
// ("Ana B. Cruz" vs "ana b cruz").
const normalizeName = (s: string) => s.toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();

// Whether an active account already has this full name at this school (a
// parent-made one, or one the child made before). On 2026-10-11 about a fifth
// of all accounts were repeats like this, mostly kids who had lost their way
// back in. Only answers yes/no: the form never learns whose account it is.
async function looksLikeExistingAccount(fullName: unknown, schoolName: unknown): Promise<boolean> {
  if (typeof fullName !== 'string' || typeof schoolName !== 'string') return false;
  const name = normalizeName(fullName);
  const school = normalizeName(schoolName);
  const first = name.split(' ')[0];
  if (!name.includes(' ') || first.length < 2 || !school) return false;
  const { data, error } = await supabaseAdmin
    .from('children')
    .select('full_name, school_name')
    .eq('is_active', true)
    .ilike('full_name', `%${first}%`)
    .limit(500);
  if (error || !data) return false;
  return data.some(c => normalizeName(c.full_name ?? '') === name && normalizeName(c.school_name ?? '') === school);
}

// Child self-registration (no parent required yet) — see
// docs/parent-child-linking-design.md. The client establishes its own
// anonymous session and passes the access token here so
// create_unclaimed_child_account's auth.uid() resolves to this exact
// browser, and so the real client IP (unavailable to browser JS) can be
// attached for the RPC's own rate limiting.
export async function POST(request: NextRequest) {
  const { accessToken, username, pin, fullName, grade, gender, schoolName, avatar, source, sessionId, referralCode, attribution, turnstileToken, confirmNewAccount } = await request.json();

  if (typeof accessToken !== 'string' || !accessToken) {
    return NextResponse.json({ success: false, error: 'missing session' }, { status: 400 });
  }

  // Before the Turnstile check, so the token isn't spent: the form resends the
  // same one with confirmNewAccount once the child says this account is new.
  if (confirmNewAccount !== true && await looksLikeExistingAccount(fullName, schoolName)) {
    return NextResponse.json({ success: false, possibleDuplicate: true }, { status: 409 });
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

  const turnstile = await verifyTurnstileToken(turnstileToken, ip);
  if (turnstile !== 'ok') {
    const message = turnstile === 'missing'
      ? 'Still checking that you are human. Wait a moment, then tap the button again.'
      : 'The security check didn\'t pass. Please try again.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }

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
    return NextResponse.json({ success: false, error: friendlySignupError(error.message) }, { status: 400 });
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
    properties: {
      source: typeof source === 'string' && source ? source : 'organic',
      ...(attribution && typeof attribution === 'object' && !Array.isArray(attribution) ? attribution : {}),
    },
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
