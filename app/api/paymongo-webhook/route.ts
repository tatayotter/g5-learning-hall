import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

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

    const { error } = await supabaseAdmin.rpc('handle_paymongo_webhook', {
      p_checkout_id: checkoutId,
      p_payment_id: paymentId,
    });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
