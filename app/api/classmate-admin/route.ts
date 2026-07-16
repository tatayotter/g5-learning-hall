import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function slugify(fullName: string): string {
  return fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function uniqueId(fullName: string): Promise<string> {
  const base = slugify(fullName) || 'classmate';
  let candidate = base;
  let suffix = 2;
  while (true) {
    const { data } = await supabase.from('classmates').select('id').eq('id', candidate).maybeSingle();
    if (!data) return candidate;
    candidate = `${base}${suffix}`;
    suffix += 1;
  }
}

export async function POST(request: NextRequest) {
  const { passcode, id, username, fullName, grade, password, isActive, gender } = await request.json();
  const cleanGender = gender === 'girl' ? 'girl' : gender === 'boy' ? 'boy' : null;

  if (passcode !== process.env.ADMIN_PASSCODE) {
    return NextResponse.json({ success: false, error: 'Invalid passcode' }, { status: 401 });
  }

  if (typeof username !== 'string' || !username.trim() || typeof fullName !== 'string' || !fullName.trim()) {
    return NextResponse.json({ success: false, error: 'Username and full name are required' }, { status: 400 });
  }

  // Writes to `classmates` (including password_hash) are revoked for the anon
  // key directly — everything goes through SECURITY DEFINER functions so
  // hashing happens inside Postgres and the hash never leaves the database.
  if (id) {
    const { error } = await supabase.rpc('update_classmate', {
      p_id: id,
      p_username: username.trim(),
      p_full_name: fullName.trim(),
      p_grade: grade?.trim() || 'Grade 5',
      p_is_active: typeof isActive === 'boolean' ? isActive : null,
      p_password: typeof password === 'string' && password.trim() ? password : null,
      p_gender: cleanGender,
    });
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }
    return NextResponse.json({ success: true, id });
  }

  // Create new classmate — password is required.
  if (typeof password !== 'string' || !password.trim()) {
    return NextResponse.json({ success: false, error: 'Password is required for a new classmate' }, { status: 400 });
  }

  const newId = await uniqueId(fullName);
  const { error } = await supabase.rpc('create_classmate', {
    p_id: newId,
    p_username: username.trim(),
    p_password: password,
    p_full_name: fullName.trim(),
    p_grade: grade?.trim() || 'Grade 5',
    p_gender: cleanGender || 'boy',
  });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 409 });
  }
  return NextResponse.json({ success: true, id: newId });
}
