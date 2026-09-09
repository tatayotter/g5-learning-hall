// Pushes a paid donor to SendFox on app/support/page.tsx's checkout success.
// Invoked server-side by app/api/paymongo-webhook/route.ts's 'donation'
// branch using SUPABASE_SERVICE_ROLE_KEY as the bearer token (verify_jwt:
// true — never called from the browser). Same per-contact-trigger shape as
// coin-expiry-sync/reengagement-sync/renewal-reminder-sync: this function
// only syncs the contact + custom field, it does NOT send an email itself —
// the actual thank-you/receipt email lives in a SendFox Automation
// configured on SENDFOX_DONATION_LIST_ID ("contact joins this list → send
// this email"), same division of responsibility as those three functions.
//
// Replaces the earlier Resend-based support-donation-notify function
// (disabled) — donations now go through SendFox end-to-end per product
// decision, rather than splitting receipt (Resend) from the update list
// (SendFox).

const SENDFOX_API_TOKEN = Deno.env.get('SENDFOX_API_TOKEN')!;
const SENDFOX_DONATION_LIST_ID = Deno.env.get('SENDFOX_DONATION_LIST_ID')!;
const SENDFOX_SUPPORTERS_UPDATES_LIST_ID = Deno.env.get('SENDFOX_SUPPORTERS_UPDATES_LIST_ID')!;
// The field's machine-readable slug (from sendfox.com/dashboard/contact-fields),
// NOT its numeric id — verified against sendfox.com/openapi.yaml, whose real
// POST /contacts schema is `contact_fields: [{ name: string, value: string }]`.
// The three pre-existing sync functions (coin-expiry-sync, reengagement-sync,
// renewal-reminder-sync) all send `{ id: number, value }` instead, which this
// schema does not define — see the finding flagged alongside this fix.
const SENDFOX_DONATION_AMOUNT_FIELD_NAME = Deno.env.get('SENDFOX_DONATION_AMOUNT_FIELD_NAME') || 'donation_amount';

interface SyncBody {
  email: string;
  displayName: string | null;
  amountPhp: number;
  subscribeUpdates: boolean;
}

Deno.serve(async (req: Request) => {
  let body: SyncBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid request body' }), { status: 400 });
  }

  const { email, displayName, amountPhp, subscribeUpdates } = body;
  if (!email || !amountPhp) {
    return new Response(JSON.stringify({ error: 'missing required fields' }), { status: 400 });
  }

  // Every donor goes on the receipt-trigger list regardless of the updates
  // opt-in — the thank-you email is a transactional confirmation of their
  // own payment, not a marketing send. Only additionally added to the
  // ongoing dev-updates list if they opted in.
  const lists = subscribeUpdates
    ? [Number(SENDFOX_DONATION_LIST_ID), Number(SENDFOX_SUPPORTERS_UPDATES_LIST_ID)]
    : [Number(SENDFOX_DONATION_LIST_ID)];

  const sendfoxRes = await fetch('https://api.sendfox.com/contacts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SENDFOX_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      first_name: (displayName || '').trim().split(' ')[0] || undefined,
      lists,
      contact_fields: [{ name: SENDFOX_DONATION_AMOUNT_FIELD_NAME, value: String(amountPhp) }],
    }),
  });

  const sendfoxBody = await sendfoxRes.text();
  if (!sendfoxRes.ok) {
    console.error('SendFox donation sync failed', email, sendfoxRes.status, sendfoxBody);
    return new Response(JSON.stringify({ error: 'sendfox sync failed' }), { status: 502 });
  }

  return new Response(sendfoxBody, {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
