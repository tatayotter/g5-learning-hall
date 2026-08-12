import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdminPasscode } from '@/lib/adminAuth';

function slugify(fullName: string): string {
  return fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Single query for every id sharing this base prefix, instead of probing
// candidate/candidate2/candidate3/... one request at a time.
async function uniqueId(fullName: string): Promise<string> {
  const base = slugify(fullName) || 'classmate';
  const { data } = await supabaseAdmin.from('classmates').select('id').like('id', `${base}%`);
  const taken = new Set((data || []).map((r: { id: string }) => r.id));
  if (!taken.has(base)) return base;
  let suffix = 2;
  while (taken.has(`${base}${suffix}`)) suffix += 1;
  return `${base}${suffix}`;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { passcode, id, username, fullName, grade, password, isActive, gender, schoolName, action } = body;
  const cleanGender = gender === 'girl' ? 'girl' : gender === 'boy' ? 'boy' : null;

  const authError = requireAdminPasscode(passcode);
  if (authError) return authError;

  // classmates denies all direct client SELECT (RLS) — username isn't safe
  // to expose through a public view, so the admin dashboard's list read
  // (which does need username, unlike the public account-select roster)
  // goes through here instead, same passcode-gated pattern as every write
  // action below.
  if (action === 'list') {
    const { data, error } = await supabaseAdmin
      .from('classmates')
      .select('id, username, full_name, grade, gender, is_active, school_name')
      .order('full_name');
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, classmates: data || [] });
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
      p_passcode: process.env.ADMIN_PASSCODE,
      p_school_name: typeof schoolName === 'string' && schoolName.trim() ? schoolName.trim() : null,
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
    p_passcode: process.env.ADMIN_PASSCODE,
    p_school_name: typeof schoolName === 'string' && schoolName.trim() ? schoolName.trim() : undefined,
  });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 409 });
  }
  return NextResponse.json({ success: true, id: newId });
}
