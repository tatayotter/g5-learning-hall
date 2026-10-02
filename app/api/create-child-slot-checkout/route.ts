import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';

// A single extra child slot for an active Premium parent — a flat ₱99 that
// takes effect on payment and does NOT restart the Premium year or reset the
// coin pool (contrast /api/create-checkout, which buys a whole year). See
// supabase/migrations/20261002150000_child_slot_purchase.sql.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

const CHILD_SLOT_PRICE_PHP = 99;
const MAX_ADDON_CHILDREN = 2;

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

  // Checked before creating the PayMongo session so an ineligible parent never
  // gets a payable checkout. create_child_slot_checkout re-checks it in SQL.
  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('status, addon_children, current_period_end')
    .eq('parent_id', userData.user.id)
    .maybeSingle();
  if (!sub || sub.status !== 'active') {
    return NextResponse.json({ success: false, error: 'An active Premium plan is required to add a child slot.' }, { status: 409 });
  }
  if (sub.addon_children >= MAX_ADDON_CHILDREN) {
    return NextResponse.json({ success: false, error: 'Your account already has the maximum number of child slots.' }, { status: 409 });
  }

  const until = sub.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

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
            {
              currency: 'PHP',
              amount: CHILD_SLOT_PRICE_PHP * 100,
              name: until ? `Additional child slot (until ${until})` : 'Additional child slot',
              quantity: 1,
            },
          ],
          payment_method_types: ['gcash', 'card', 'paymaya'],
          description: 'Learning Hall — one more child on your Premium plan',
          success_url: `${siteUrl}/parent-dashboard?checkout=success`,
          cancel_url: `${siteUrl}/parent-dashboard?checkout=cancelled`,
          metadata: { type: 'child_slot', parent_id: userData.user.id },
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

  const { error: rpcError } = await supabaseAsUser.rpc('create_child_slot_checkout', {
    p_checkout_id: checkoutId,
    p_amount_php: CHILD_SLOT_PRICE_PHP,
  });
  if (rpcError) {
    return NextResponse.json({ success: false, error: rpcError.message }, { status: 409 });
  }

  return NextResponse.json({ success: true, checkoutUrl });
}
