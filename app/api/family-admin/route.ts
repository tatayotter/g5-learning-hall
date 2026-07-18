import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const { passcode, id, password } = await request.json();

  if (passcode !== process.env.ADMIN_PASSCODE) {
    return NextResponse.json({ success: false, error: 'Invalid passcode' }, { status: 401 });
  }

  if ((id !== 'damien' && id !== 'tala') || typeof password !== 'string' || !password.trim()) {
    return NextResponse.json({ success: false, error: 'A valid id and non-empty password are required' }, { status: 400 });
  }

  const { error } = await supabase.rpc('set_family_password', { p_id: id, p_password: password, p_passcode: process.env.ADMIN_PASSCODE });
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 409 });
  }
  return NextResponse.json({ success: true });
}
