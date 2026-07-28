import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { supabase } from '@/lib/supabase';

function isValidSecret(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // Different lengths would make timingSafeEqual throw — falling straight to
  // false here leaks only the fact that lengths differ, not a timing signal
  // over which byte first mismatched.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';

  if (!isValidSecret(authHeader, `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const { error } = await supabase.rpc('cleanup_expired_demo_accounts');

  if (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
