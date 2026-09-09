import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Sibling to app/api/create-checkout/route.ts and create-sec-checkout/route.ts,
// same PayMongo checkout-session shape, but for public pay-what-you-want
// donations from app/support/page.tsx. Unlike those two routes, there is no
// caller auth here -- donors never log in -- so this route validates
// everything itself and writes directly via supabaseAdmin (service role)
// rather than going through an "as user" RPC. See the migration
// 20260909120000_add_support_contributions.sql for the table/RPC side.

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

const MIN_AMOUNT_PHP = 50;
const MAX_AMOUNT_PHP = 50_000;
const MAX_NAME_LEN = 60;
const MAX_MESSAGE_LEN = 240;

function isValidEmail(value: string): boolean {
  // Deliberately loose -- just enough to reject obvious typos before we ask
  // PayMongo/Resend to do anything with it. Real verification is implicit:
  // the receipt email either lands or it doesn't.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const email = String(body.email || '').trim();
  const displayNameRaw = String(body.displayName || '').trim().slice(0, MAX_NAME_LEN);
  const messageRaw = String(body.message || '').trim().slice(0, MAX_MESSAGE_LEN);
  const showName = Boolean(body.showName);
  const subscribeUpdates = body.subscribeUpdates !== false; // default true
  const amountPhp = Math.round(Number(body.amountPhp));

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ success: false, error: 'A valid email is required' }, { status: 400 });
  }
  if (!Number.isFinite(amountPhp) || amountPhp < MIN_AMOUNT_PHP || amountPhp > MAX_AMOUNT_PHP) {
    return NextResponse.json(
      { success: false, error: `Amount must be between ₱${MIN_AMOUNT_PHP} and ₱${MAX_AMOUNT_PHP.toLocaleString()}` },
      { status: 400 },
    );
  }

  // Pending row first, checkout session second -- mirrors create_sec_checkout_session's
  // ordering rationale isn't relevant here (no unique-conflict retry to
  // handle since there's no natural key per donor), but we still want the
  // row to exist before we hand the browser a redirect URL, so a webhook
  // that somehow arrives early always has something to update.
  const { data: row, error: insertError } = await supabaseAdmin
    .from('support_contributions')
    .insert({
      email,
      display_name: displayNameRaw || null,
      message: messageRaw || null,
      show_name: showName,
      subscribe_updates: subscribeUpdates,
      amount_php: amountPhp,
      status: 'pending',
    })
    .select('id')
    .single();

  if (insertError || !row) {
    console.error('create-donation-checkout: insert failed', insertError);
    return NextResponse.json({ success: false, error: 'Could not start checkout' }, { status: 500 });
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
          send_email_receipt: false, // we send our own via the donation branch of paymongo-webhook
          show_line_items: true,
          show_description: true,
          line_items: [
            { currency: 'PHP', amount: amountPhp * 100, name: 'Support Learning Hall', quantity: 1 },
          ],
          payment_method_types: ['gcash', 'card', 'paymaya'],
          description: 'One-time donation to support Learning Hall PH development',
          success_url: `${siteUrl}/support?donation=success`,
          cancel_url: `${siteUrl}/support?donation=cancelled`,
          // type discriminator lets the shared webhook branch to the donation
          // activation path instead of subscription/sec_purchase.
          metadata: { type: 'donation', contribution_id: row.id },
        },
      },
    }),
  });

  const paymongoData = await paymongoRes.json();
  if (!paymongoRes.ok) {
    console.error('create-donation-checkout: PayMongo error', paymongoData);
    // Clean up the pending row -- no checkout session exists for it, so it
    // would otherwise sit as an orphaned 'pending' row forever.
    await supabaseAdmin.from('support_contributions').delete().eq('id', row.id);
    return NextResponse.json({ success: false, error: paymongoData?.errors?.[0]?.detail || 'PayMongo error' }, { status: 502 });
  }

  const checkoutId: string = paymongoData.data.id;
  const checkoutUrl: string = paymongoData.data.attributes.checkout_url;

  const { error: updateError } = await supabaseAdmin
    .from('support_contributions')
    .update({ paymongo_checkout_id: checkoutId })
    .eq('id', row.id);

  if (updateError) {
    console.error('create-donation-checkout: could not attach checkout id', updateError);
    return NextResponse.json({ success: false, error: 'Could not start checkout' }, { status: 500 });
  }

  return NextResponse.json({ success: true, checkoutUrl });
}
