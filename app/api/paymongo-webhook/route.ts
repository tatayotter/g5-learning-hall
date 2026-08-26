import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendCapiEvent } from '@/lib/metaCapi';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// PayMongo signs webhooks with `Paymongo-Signature: t=<ts>,te=<test sig>,li=<live sig>`.
// The signed string is `${t}.${rawBody}`, HMAC-SHA256'd with the webhook's own
// secret (distinct from the API secret key). See docs.paymongo.com/docs/developer-tools-webhook-setup-management.
function verifySignature(rawBody: string, header: string, secret: string): boolean {
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=') as [string, string]));
  const { t, te, li } = parts;
  if (!t) return false;
  const expected = createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex');
  const candidate = li || te;
  if (!candidate || candidate.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));
}

// Best-effort: swallows its own errors (via sendCapiEvent) so a Meta API
// hiccup never turns a successful payment into a failed webhook response —
// Paymongo would just retry, and handle_paymongo_webhook's idempotency
// guard means a retry wouldn't re-fire this anyway.
async function fireParentSubscribedCapiEvent(checkoutId: string, paymentId: string) {
  const { data: sub, error: subError } = await supabaseAdmin
    .from('subscriptions')
    .select('parent_id, amount_php, fbp, fbc, client_ip, client_user_agent')
    .eq('paymongo_checkout_id', checkoutId)
    .maybeSingle();
  if (subError || !sub) {
    console.error('fireParentSubscribedCapiEvent: could not load subscription row', checkoutId, subError);
    return;
  }

  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(sub.parent_id);
  if (authError || !authUser?.user?.email) {
    console.error('fireParentSubscribedCapiEvent: could not load parent email', sub.parent_id, authError);
    return;
  }

  await sendCapiEvent({
    eventName: 'Parent_Subscribed',
    eventId: `sub_${paymentId}`,
    eventSourceUrl: `${siteUrl}/parent-dashboard`,
    userData: {
      email: authUser.user.email,
      phone: authUser.user.phone || null,
      clientIp: sub.client_ip,
      clientUserAgent: sub.client_user_agent,
      fbp: sub.fbp,
      fbc: sub.fbc,
    },
    customData: {
      currency: 'PHP',
      value: Number(sub.amount_php),
    },
  });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get('paymongo-signature') || '';
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET!;

  if (!verifySignature(rawBody, signatureHeader, secret)) {
    return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const eventType = event?.data?.attributes?.type;

  if (eventType === 'checkout_session.payment.paid') {
    const checkoutId: string = event.data.attributes.data.id;
    const paymentId: string = event.data.attributes.data.attributes.payments?.[0]?.id || checkoutId;

    const { data: activated, error } = await supabaseAdmin.rpc('handle_paymongo_webhook', {
      p_checkout_id: checkoutId,
      p_payment_id: paymentId,
    });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // `activated` is false on a legitimate Paymongo webhook retry (the
    // payment was already applied) — only fire the conversion event the
    // one time this checkout actually transitions to active, so CAC/LTV
    // math is never inflated by a retried delivery.
    if (activated) {
      await fireParentSubscribedCapiEvent(checkoutId, paymentId);
    }
  }

  return NextResponse.json({ success: true });
}
