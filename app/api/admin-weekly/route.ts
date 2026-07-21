import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// All three actions write to another user's weekly_packages row, which client-side
// RLS no longer allows directly — they go through passcode-gated SECURITY DEFINER
// RPCs instead. The passcode sent to Postgres is always process.env.ADMIN_PASSCODE
// (verified here first), never the client-supplied value, matching classmate-admin.
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { passcode, action, userId, weekStartingDate } = body;

  if (passcode !== process.env.ADMIN_PASSCODE) {
    return NextResponse.json({ success: false, error: 'Invalid passcode' }, { status: 401 });
  }
  if (typeof userId !== 'string' || !userId.trim() || typeof weekStartingDate !== 'string') {
    return NextResponse.json({ success: false, error: 'userId and weekStartingDate are required' }, { status: 400 });
  }

  if (action === 'set_package_data') {
    const { error } = await supabase.rpc('admin_upsert_weekly_package_data', {
      p_passcode: process.env.ADMIN_PASSCODE,
      p_user_id: userId,
      p_week_starting_date: weekStartingDate,
      p_package_data: body.packageData,
    });
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    return NextResponse.json({ success: true });
  }

  if (action === 'set_character_stats') {
    const { error } = await supabase.rpc('admin_set_character_stats', {
      p_passcode: process.env.ADMIN_PASSCODE,
      p_user_id: userId,
      p_week_starting_date: weekStartingDate,
      p_character_stats: body.characterStats,
    });
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    return NextResponse.json({ success: true });
  }

  if (action === 'award_gold') {
    const amount = Number(body.amount);
    if (!amount || amount <= 0) {
      return NextResponse.json({ success: false, error: 'amount must be positive' }, { status: 400 });
    }
    const { data, error } = await supabase.rpc('admin_award_gold', {
      p_passcode: process.env.ADMIN_PASSCODE,
      p_user_id: userId,
      p_week_starting_date: weekStartingDate,
      p_amount: amount,
    });
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    return NextResponse.json({ success: true, characterStats: data });
  }

  return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
}
