import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';

// Sibling to app/api/create-checkout/route.ts, same auth/PayMongo shape, but
// for one-time Student Enrichment Content (SEC) pack purchases instead of
// the recurring subscription — see docs/sec-shop-design.md. Deliberately its
// own route + RPC pair rather than generalizing create-checkout: zero risk
// of a SEC-only change touching the subscription path.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) {
    return NextResponse.json({ success: false, error: 'Missing authorization' }, { status: 401 });
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 });
  }

  const { packId, childId } = await request.json();
  if (typeof packId !== 'string' || !packId || typeof childId !== 'string' || !childId) {
    return NextResponse.json({ success: false, error: 'Missing packId or childId' }, { status: 400 });
  }

  const { data: pack, error: packError } = await supabaseAdmin
    .from('sec_packs')
    .select('id, title, price_php, active')
    .eq('id', packId)
    .maybeSingle();
  if (packError || !pack || !pack.active) {
    return NextResponse.json({ success: false, error: 'Pack not available' }, { status: 404 });
  }

  // childId must actually belong to this parent — mirrors the ownership
  // check every other parent-dashboard write (e.g. pricing add-on slots)
  // relies on: `children.parent_id` is the actual ownership column, not
  // user_identity_map (that table only maps an auth session to its own
  // app_user_id, not parent -> child).
  const { data: childRow, error: childError } = await supabaseAdmin
    .from('children')
    .select('parent_id')
    .eq('id', childId)
    .maybeSingle();
  if (childError || !childRow || childRow.parent_id !== userData.user.id) {
    return NextResponse.json({ success: false, error: 'Child does not belong to this account' }, { status: 403 });
  }

  const paymongoRes = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${process.env.PAYMONGO_SECRET_KEY}:`).toString('base64')}`,
    },
    body: JSON.stringify({
      data: {
        attributes: {
          send_email_receipt: false,
          show_line_items: true,
          show_description: true,
          line_items: [
            { currency: 'PHP', amount: pack.price_php * 100, name: pack.title, quantity: 1 },
          ],
          payment_method_types: ['gcash', 'card', 'paymaya'],
          description: `Student Enrichment Content: ${pack.title}`,
          success_url: `${siteUrl}/parent-dashboard/shop?checkout=success`,
          cancel_url: `${siteUrl}/parent-dashboard/shop?checkout=cancelled`,
          // type discriminator lets the shared webhook branch to the SEC
          // activation path instead of the subscription one — see
          // docs/sec-shop-design.md's "Why today's payment plumbing can't
          // just be reused as-is".
          metadata: { type: 'sec_purchase', parent_id: userData.user.id, child_id: childId, pack_id: packId },
        },
      },
    }),
  });

  const paymongoData = await paymongoRes.json();
  if (!paymongoRes.ok) {
    return NextResponse.json({ success: false, error: paymongoData?.errors?.[0]?.detail || 'PayMongo error' }, { status: 502 });
  }

  const checkoutId: string = paymongoData.data.id;
  const checkoutUrl: string = paymongoData.data.attributes.checkout_url;

  const supabaseAsUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: rpcError } = await supabaseAsUser.rpc('create_sec_checkout_session', {
    p_parent_id: userData.user.id,
    p_child_id: childId,
    p_pack_id: packId,
    p_amount_php: pack.price_php,
    p_checkout_id: checkoutId,
  });

  if (rpcError) {
    // 409, not 500 — this is create_sec_checkout_session's own business
    // validation (e.g. "this child already owns this pack"), not a server
    // fault. Matches the status code every other SEC route already uses for
    // its RPC's expected-failure path (admin-sec-packs, admin-sec-refunds).
    return NextResponse.json({ success: false, error: rpcError.message }, { status: 409 });
  }

  return NextResponse.json({ success: true, checkoutUrl });
}
