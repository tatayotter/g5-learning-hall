import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdminPasscode } from '@/lib/adminAuth';

// Admin authoring for the SEC Shop catalog — mirrors admin-egg-chains/route.ts
// exactly: requireAdminPasscode is a first pass (fails fast on the wrong
// passcode without a round trip to Postgres), but the real gate is each RPC's
// own check_admin_passcode(p_passcode) call, so p_passcode is always passed
// through as the client-submitted value, not process.env.ADMIN_PASSCODE.
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { passcode, action } = body;

  const authError = requireAdminPasscode(passcode);
  if (authError) return authError;

  if (action === 'list_packs') {
    const { data, error } = await supabase.rpc('admin_list_sec_packs', { p_passcode: passcode });
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    return NextResponse.json({ success: true, packs: data });
  }

  if (action === 'upsert_pack') {
    const { id, grade, category, title, description, pricePhp, contentRef } = body;
    if (!id || !grade || !category || !title || !description || !pricePhp || !contentRef) {
      return NextResponse.json({ success: false, error: 'id, grade, category, title, description, pricePhp, and contentRef are all required.' }, { status: 400 });
    }
    const { error } = await supabase.rpc('admin_upsert_sec_pack', {
      p_passcode: passcode,
      p_id: id,
      p_grade: grade,
      p_category: category,
      p_title: title,
      p_description: description,
      p_price_php: pricePhp,
      p_content_ref: contentRef,
    });
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    return NextResponse.json({ success: true });
  }

  if (action === 'set_active') {
    const { id, active } = body;
    if (!id || typeof active !== 'boolean') {
      return NextResponse.json({ success: false, error: 'id and active (boolean) are required.' }, { status: 400 });
    }
    const { error } = await supabase.rpc('admin_set_sec_pack_active', { p_passcode: passcode, p_id: id, p_active: active });
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
}
