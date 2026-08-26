import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

const BASE_PRICE_PHP = 249;
const ADDON_PRICE_PHP = 99;

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

  const { addonChildren } = await request.json();
  const addons = Number(addonChildren) || 0;
  if (!Number.isInteger(addons) || addons < 0 || addons > 2) {
    return NextResponse.json({ success: false, error: 'Invalid addon_children' }, { status: 400 });
  }

  // Captured here (browser request context) so the Paymongo webhook —
  // server-to-server, no cookies/IP of its own — can still attach them to
  // the Meta CAPI event later for match-quality scoring.
  const fbp = request.cookies.get('_fbp')?.value || null;
  const fbc = request.cookies.get('_fbc')?.value || null;
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || request.headers.get('x-real-ip')
    || null;
  const clientUserAgent = request.headers.get('user-agent') || null;

  const amountPhp = BASE_PRICE_PHP + addons * ADDON_PRICE_PHP;
  const lineItems = [
    { currency: 'PHP', amount: BASE_PRICE_PHP * 100, name: 'Learning Hall Premium (1 year)', quantity: 1 },
  ];
  if (addons > 0) {
    lineItems.push({ currency: 'PHP', amount: ADDON_PRICE_PHP * 100, name: 'Additional child slot (1 year)', quantity: addons });
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
          line_items: lineItems,
          payment_method_types: ['gcash', 'card', 'paymaya'],
          description: 'Learning Hall parent subscription',
          success_url: `${siteUrl}/parent-dashboard?checkout=success`,
          cancel_url: `${siteUrl}/parent-dashboard?checkout=cancelled`,
          metadata: { parent_id: userData.user.id, addon_children: String(addons) },
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

  const { error: rpcError } = await supabaseAsUser.rpc('create_checkout_session', {
    p_addon_children: addons,
    p_amount_php: amountPhp,
    p_checkout_id: checkoutId,
    p_fbp: fbp,
    p_fbc: fbc,
    p_client_ip: clientIp,
    p_client_user_agent: clientUserAgent,
  });

  if (rpcError) {
    return NextResponse.json({ success: false, error: rpcError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, checkoutUrl });
}
