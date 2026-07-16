import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const { id, password } = await request.json();

  if (typeof id !== 'string' || typeof password !== 'string') {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  // password_hash has no SELECT grant at all — verification happens inside a
  // SECURITY DEFINER Postgres function so the hash never leaves the database.
  const { data, error } = await supabase.rpc('verify_family_login', { p_id: id, p_password: password });

  if (error || !data) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}
