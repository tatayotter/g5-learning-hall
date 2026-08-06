import { createClient } from 'jsr:@supabase/supabase-js@2';

// Scheduled job (pg_cron, hourly — see the schedule_reassignment_cron
// migration) that finalizes any parent reassignment whose 48h objection
// window has elapsed, then emails both parents that the change is done.
// See docs/parent-child-linking-design.md.
//
// Not a user-facing endpoint — same shape as reengagement-sync: authed by
// a shared secret header from pg_cron, not a user JWT. Reuses
// REASSIGNMENT_CRON_SECRET (already set as a DB-level secret for
// execute_due_child_reassignments) as this header's value too, so pg_cron
// -> function and function -> RPC are both gated by the same value.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'Learning Hall PH <onboarding@resend.dev>';
const REASSIGNMENT_CRON_SECRET = Deno.env.get('REASSIGNMENT_CRON_SECRET')!;

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
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
}

Deno.serve(async (req: Request) => {
  const providedSecret = req.headers.get('x-cron-secret');
  if (!REASSIGNMENT_CRON_SECRET || providedSecret !== REASSIGNMENT_CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: rows, error } = await admin.rpc('execute_due_child_reassignments', {
    p_cron_secret: REASSIGNMENT_CRON_SECRET,
  });

  if (error) {
    console.error('execute_due_child_reassignments failed', error);
    return new Response(JSON.stringify({ error: 'query failed' }), { status: 500 });
  }

  for (const row of rows ?? []) {
    const firstName = (row.child_full_name || 'Your child').split(' ')[0];
    if (row.old_parent_email) {
      await sendEmail(
        row.old_parent_email,
        `${firstName}'s account has been reassigned`,
        `<p>The pending reassignment of <strong>${firstName}</strong>'s Learning Hall PH account has now
        taken effect, since it wasn't cancelled within the 48-hour window.</p>`
      );
    }
    await sendEmail(
      row.new_parent_email,
      `You're now linked to ${firstName} on Learning Hall PH`,
      `<p><strong>${firstName}</strong>'s Learning Hall PH account is now linked to this email.
      You can view their progress from your dashboard.</p>`
    );
  }

  return new Response(JSON.stringify({ completed: rows?.length ?? 0 }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
