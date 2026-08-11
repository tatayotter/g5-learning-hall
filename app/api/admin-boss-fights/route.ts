import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdminPasscode } from '@/lib/adminAuth';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { passcode, action } = body;

  const authError = requireAdminPasscode(passcode);
  if (authError) return authError;

  if (action === 'set_enabled') {
    const { enabled } = body;
    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ success: false, error: 'enabled must be a boolean' }, { status: 400 });
    }
    const { error } = await supabase.rpc('admin_set_boss_fights_enabled', {
      p_passcode: process.env.ADMIN_PASSCODE,
      p_enabled: enabled,
    });
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    return NextResponse.json({ success: true });
  }

  if (action === 'upsert_gauntlet_reward') {
    const { grade, term, reward_monster_id, reward_lore_markdown } = body;
    if (!grade || !term || !reward_monster_id) {
      return NextResponse.json({ success: false, error: 'Grade, term, and curio reward are required.' }, { status: 400 });
    }
    const { data, error } = await supabase.rpc('admin_upsert_boss_gauntlet_reward', {
      p_passcode: process.env.ADMIN_PASSCODE,
      p_grade: grade,
      p_term: term,
      p_reward_monster_id: reward_monster_id,
      p_reward_lore_markdown: reward_lore_markdown || null,
    });
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    return NextResponse.json({ success: true, id: data });
  }

  return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
}
