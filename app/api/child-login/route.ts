import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const { id, password } = await request.json();

  if (typeof id !== 'string' || typeof password !== 'string') {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  // pin_hash is locked down at the column-grant level — verification
  // happens inside a SECURITY DEFINER Postgres function so the hash never
  // leaves the database. Mirrors app/api/classmate-login/route.ts.
  //
  // Returns the full safe profile (not just full_name/grade) because this
  // route is also the login path for unclaimed (parent_id IS NULL) children,
  // who never appear in children_public and so can't be resolved from the
  // SplashScreen roster (lib/userSession.ts's loadChildren()) at all — the
  // client needs enough here to build a complete USERS entry from scratch.
  // See lib/userSession.ts:loginReturningChild.
  const { data, error } = await supabase
    .rpc('verify_child_login', { p_id: id, p_pin: password })
    .single<{ full_name: string; grade: string; avatar: string; gender: string; school_name: string | null }>();

  if (error || !data) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    fullName: data.full_name,
    grade: data.grade,
    avatar: data.avatar,
    gender: data.gender,
    schoolName: data.school_name,
  });
}
