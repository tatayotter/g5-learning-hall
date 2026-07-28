import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdminPasscode } from '@/lib/adminAuth';

export async function POST(request: NextRequest) {
  const { passcode, id, status } = await request.json();

  const authError = requireAdminPasscode(passcode);
  if (authError) return authError;
  if (typeof id !== 'number' || (status !== 'pending' && status !== 'supplied')) {
    return NextResponse.json({ success: false, error: 'A valid id and status are required' }, { status: 400 });
  }

  const { error } = await supabase.rpc('admin_set_reward_claim_status', {
    p_passcode: process.env.ADMIN_PASSCODE,
    p_id: id,
    p_status: status,
  });
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 409 });
  return NextResponse.json({ success: true });
}
