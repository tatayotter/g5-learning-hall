import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdminPasscode } from '@/lib/adminAuth';

// Passcode-gated write/list path for the voucher code system — see
// supabase/migrations/20260909130000_add_voucher_code_system.sql.
// voucher_codes has no client SELECT policy at all (a public read would let
// anyone browse every code), so even listing has to go through the
// admin_list_voucher_codes RPC rather than a plain `supabase.from(...)`.
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { passcode, action } = body;

  const authError = requireAdminPasscode(passcode);
  if (authError) return authError;

  if (action === 'list') {
    const { data, error } = await supabase.rpc('admin_list_voucher_codes', {
      p_passcode: process.env.ADMIN_PASSCODE,
    });
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    return NextResponse.json({ success: true, vouchers: data });
  }

  if (action === 'upsert') {
    const {
      code, rewardType, rewardCurioId, rewardItemKey, rewardItemQty,
      rewardGoldAmount, maxRedemptions, expiresAt, isActive,
    } = body;
    if (typeof code !== 'string' || !code.trim()) {
      return NextResponse.json({ success: false, error: 'A code is required.' }, { status: 400 });
    }
    if (!['curio', 'item', 'gold'].includes(rewardType)) {
      return NextResponse.json({ success: false, error: 'Invalid reward type.' }, { status: 400 });
    }
    const { data, error } = await supabase.rpc('admin_upsert_voucher_code', {
      p_passcode: process.env.ADMIN_PASSCODE,
      p_code: code,
      p_reward_type: rewardType,
      p_reward_curio_id: rewardType === 'curio' ? rewardCurioId : null,
      p_reward_item_key: rewardType === 'item' ? rewardItemKey : null,
      p_reward_item_qty: rewardType === 'item' ? rewardItemQty : null,
      p_reward_gold_amount: rewardType === 'gold' ? rewardGoldAmount : null,
      p_max_redemptions: maxRedemptions || null,
      p_expires_at: expiresAt || null,
      p_is_active: isActive !== false,
    });
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    return NextResponse.json({ success: true, code: data });
  }

  if (action === 'delete') {
    const { code } = body;
    if (typeof code !== 'string' || !code.trim()) {
      return NextResponse.json({ success: false, error: 'A code is required.' }, { status: 400 });
    }
    const { error } = await supabase.rpc('admin_delete_voucher_code', {
      p_passcode: process.env.ADMIN_PASSCODE,
      p_code: code,
    });
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
}
