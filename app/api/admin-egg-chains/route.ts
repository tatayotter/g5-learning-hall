import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdminPasscode } from '@/lib/adminAuth';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { passcode, action } = body;

  const authError = requireAdminPasscode(passcode);
  if (authError) return authError;

  if (action === 'upsert_chain') {
    const { speciesId, predecessorSpeciesId, element } = body;
    if (!speciesId || !predecessorSpeciesId || !element) {
      return NextResponse.json({ success: false, error: 'Species, predecessor species, and element are required.' }, { status: 400 });
    }
    const { error } = await supabase.rpc('admin_upsert_egg_chain', {
      p_passcode: process.env.ADMIN_PASSCODE,
      p_species_id: speciesId,
      p_predecessor_species_id: predecessorSpeciesId,
      p_element: element,
    });
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    return NextResponse.json({ success: true });
  }

  if (action === 'delete_chain') {
    const { speciesId } = body;
    if (!speciesId) {
      return NextResponse.json({ success: false, error: 'A species id is required.' }, { status: 400 });
    }
    const { error } = await supabase.rpc('admin_delete_egg_chain', {
      p_passcode: process.env.ADMIN_PASSCODE,
      p_species_id: speciesId,
    });
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
}
