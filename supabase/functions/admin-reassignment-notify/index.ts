// Sends the two notification emails for an admin-initiated parent
// reassignment — see docs/parent-child-linking-design.md. Invoked
// server-side by app/api/admin-child-reassignment/route.ts using
// SUPABASE_SERVICE_ROLE_KEY as the bearer token (verify_jwt: true, so only
// a valid Supabase-issued JWT — service role or otherwise — can call this;
// it is never called from the browser).
//
// - Old parent (if there is one — a child being linked for the first time
//   via this admin tool has no old parent) gets a cancel link.
// - New parent gets a heads-up that a transfer is pending and will
//   complete in 48h unless cancelled.

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'Learning Hall PH <onboarding@resend.dev>';
const SITE_URL = Deno.env.get('SITE_URL') || 'http://localhost:3000';

interface NotifyBody {
  cancelToken: string;
  oldParentEmail: string | null;
  newParentEmail: string;
  childFullName: string;
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: RESEND_FROM_EMAIL, to: [to], subject, html }),
  });
  if (!res.ok) {
    console.error('Resend send failed', to, res.status, await res.text());
  }
  return res.ok;
}

Deno.serve(async (req: Request) => {
  let body: NotifyBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid request body' }), { status: 400 });
  }

  const { cancelToken, oldParentEmail, newParentEmail, childFullName } = body;
  if (!cancelToken || !newParentEmail || !childFullName) {
    return new Response(JSON.stringify({ error: 'missing required fields' }), { status: 400 });
  }

  const childFirstName = childFullName.split(' ')[0];
  const cancelUrl = `${SITE_URL}/cancel-reassignment?token=${encodeURIComponent(cancelToken)}`;

  let oldParentNotified = false;
  if (oldParentEmail) {
    oldParentNotified = await sendEmail(
      oldParentEmail,
      `A change was requested on ${childFirstName}'s Learning Hall PH account`,
      `
        <p>Hi,</p>
        <p>An admin has requested to reassign <strong>${childFirstName}</strong>'s account to a
        different parent email. If this wasn't expected, or you don't want this to happen, you can
        stop it here — this takes effect in 48 hours unless cancelled:</p>
        <p><a href="${cancelUrl}">Cancel this reassignment</a></p>
        <p>If you're aware of this change and don't need to do anything, you can ignore this email —
        it will complete automatically after the 48-hour window.</p>
      `
    );
  }

  const newParentNotified = await sendEmail(
    newParentEmail,
    `You're being linked to ${childFirstName} on Learning Hall PH`,
    `
      <p>Hi,</p>
      <p>An admin has started linking <strong>${childFirstName}</strong>'s Learning Hall PH account
      to this email address. This will take effect in 48 hours — no action is needed from you.</p>
    `
  );

  return new Response(JSON.stringify({ oldParentNotified, newParentNotified }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
