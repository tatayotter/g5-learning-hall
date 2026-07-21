import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { passcode, action } = body;

  if (passcode !== process.env.ADMIN_PASSCODE) {
    return NextResponse.json({ success: false, error: 'Invalid passcode' }, { status: 401 });
  }

  if (action === 'upsert_event') {
    const { id, title, banner_url, details_markdown, reward_lore_markdown, reward_monster_id, start_date, end_date } = body;
    if (!title || !reward_monster_id || !start_date || !end_date) {
      return NextResponse.json({ success: false, error: 'Title, curio reward, start date, and end date are required.' }, { status: 400 });
    }
    const { data, error } = await supabase.rpc('admin_upsert_custom_event', {
      p_passcode: process.env.ADMIN_PASSCODE,
      p_id: id || null,
      p_title: title,
      p_banner_url: banner_url || null,
      p_details_markdown: details_markdown || null,
      p_reward_lore_markdown: reward_lore_markdown || null,
      p_reward_monster_id: reward_monster_id,
      p_start_date: start_date,
      p_end_date: end_date,
    });
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    return NextResponse.json({ success: true, id: data });
  }

  if (action === 'set_status') {
    const { id, status } = body;
    if (!id || !['draft', 'scheduled', 'active', 'archived'].includes(status)) {
      return NextResponse.json({ success: false, error: 'A valid id and status are required' }, { status: 400 });
    }
    const { error } = await supabase.rpc('admin_set_event_status', {
      p_passcode: process.env.ADMIN_PASSCODE,
      p_id: id,
      p_status: status,
    });
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
}
