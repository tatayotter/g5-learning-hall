// No Supabase client needed here — unlike the other three sync functions,
// this one has no per-parent candidates to query. It targets a whole
// SendFox list via the Campaigns API instead (see comment below).
const SENDFOX_API_TOKEN = Deno.env.get('SENDFOX_API_TOKEN')!;
const SENDFOX_PARENTS_LIST_ID = Deno.env.get('SENDFOX_PARENTS_LIST_ID')!;
const WEEKLY_DIGEST_CRON_SECRET = Deno.env.get('WEEKLY_DIGEST_CRON_SECRET')!;

// Not a user-facing endpoint — called only by pg_cron every Monday morning
// (see migration `schedule_weekly_digest_cron`), authenticated by a shared
// secret header rather than a user JWT.
//
// Structurally different from reengagement-sync / coin-expiry-sync /
// renewal-reminder-sync: those are per-contact triggers (a parent crosses a
// threshold, joins a list, a SendFox *automation* fires once for them).
// This one isn't triggered by anything about the parent — it's a recurring
// broadcast with different content every week, so it uses the Campaigns API
// (POST /campaigns) instead, targeted at the same parents_registration list
// sendfox-sync already populates from marketing_opt_in. No new per-parent
// sync job needed.
//
// Content strategy is deliberately the "teaser" version (Option A), not a
// per-grade content pull: a generic "this week's lessons are ready" email
// with a CTA into the dashboard, where WeeklyLessonsPanel already renders
// the real per-child, per-grade content correctly. Baking actual lesson
// content into the email would mean 5 grade-segmented campaigns and a new
// weekly content-to-HTML step — real ongoing complexity for a feature this
// starts as. Revisit if open/click data says the teaser isn't converting.
Deno.serve(async (req: Request) => {
  const providedSecret = req.headers.get('x-cron-secret');
  if (!WEEKLY_DIGEST_CRON_SECRET || providedSecret !== WEEKLY_DIGEST_CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }

  // Monday of the current week (server clock — cron is scheduled to land
  // here on a Monday already, this just labels the campaign so a re-run
  // the same week is recognizable, not so it can compute the date itself).
  const now = new Date();
  const weekLabel = now.toISOString().slice(0, 10);
  const campaignTitle = `Weekly Digest — ${weekLabel}`;

  // Dedup: if this week's campaign already exists (a retry, or the cron
  // firing twice), skip instead of double-sending. SendFox's API has no
  // title filter, so page through and match client-side — campaign volume
  // here is low enough that one page (100) always covers "this week's".
  const listRes = await fetch('https://api.sendfox.com/campaigns', {
    headers: { Authorization: `Bearer ${SENDFOX_API_TOKEN}` },
  });
  if (listRes.ok) {
    const listBody = await listRes.json();
    const already = (listBody?.data ?? []).some((c: any) => c.title === campaignTitle);
    if (already) {
      return new Response(JSON.stringify({ skipped: true, reason: 'already sent for this week' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  const html = buildDigestHtml();

  const createRes = await fetch('https://api.sendfox.com/campaigns', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SENDFOX_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: campaignTitle,
      subject: "This week's lessons are ready",
      preview_text: "Monday–Thursday lessons plus Friday's review, mapped to your child's grade.",
      html,
      from_name: 'Rowil Ruelo',
      from_email: 'tatay@learninghallph.com',
      lists: [Number(SENDFOX_PARENTS_LIST_ID)],
    }),
  });

  if (!createRes.ok) {
    const detail = await createRes.text();
    console.error('SendFox campaign create failed', createRes.status, detail);
    return new Response(JSON.stringify({ error: 'campaign create failed', detail }), { status: 502 });
  }

  const campaign = await createRes.json();

  // DRAFT MODE: intentionally not calling POST /campaigns/{id}/send here.
  // First run is meant to be reviewed and sent by hand in the SendFox UI —
  // this function only creates the draft. Once that first send has been
  // checked over, flip this back to auto-send (see git history / ask
  // Claude) for the following weeks.
  return new Response(JSON.stringify({ created: true, sent: false, campaignId: campaign.id, title: campaignTitle }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

// Same shell/palette as the rest of the Mail Kit — plain Inter, one accent
// color spent only on the CTA button, personal sign-off. See mail-kit.html
// (the design gallery) for the full system these tokens come from.
function buildDigestHtml(): string {
  const ACCENT = '#F97316';
  const INK = '#111827';
  const INK_SOFT = '#4B5563';
  const INK_FAINT = '#9CA3AF';
  const LINE = '#E5E7EB';

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body,table,td { font-family: -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; }
  body { margin:0; padding:0; background:#F3F4F6; }
  a { color:${ACCENT}; }
</style>
</head>
<body>
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Monday&ndash;Thursday lessons plus Friday's review, mapped to your child's grade.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#FFFFFF;border-radius:8px;overflow:hidden;border:1px solid ${LINE};">

        <tr>
          <td style="padding:20px 40px;border-bottom:1px solid ${LINE};">
            <img src="https://learninghallph.com/learning_hall_full_logo_optimize.png" width="120" height="89" alt="Learning Hall" style="display:block;border:0;outline:0;">
            <span style="font-size:12px;color:${INK_FAINT};display:block;margin-top:6px;">DepEd-aligned learning, Grades 2&ndash;6</span>
          </td>
        </tr>

        <tr><td style="padding:36px 40px 8px;">
          <div style="font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:${INK_FAINT};margin-bottom:10px;">This week</div>
          <h1 style="margin:0 0 14px;font-size:22px;line-height:1.35;color:${INK};font-weight:800;letter-spacing:-0.01em;">Hi {{contact.first_name}}, this week's lessons are ready</h1>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${INK_SOFT};">Monday&ndash;Thursday brings a new lesson in every subject, with Friday wrapping it all up in a review &mdash; already mapped to your child's grade and ready in their dashboard.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
            <tr><td style="border-radius:8px;background:${ACCENT};">
              <a href="https://learninghallph.com/parent-dashboard" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:8px;">See This Week's Lessons</a>
            </td></tr>
          </table>
        </td></tr>

        <tr>
          <td style="padding:28px 40px 30px;border-top:1px solid ${LINE};">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:13px;color:${INK_SOFT};line-height:1.7;padding-bottom:14px;">
                  Warmly,<br><b style="color:${INK};">Tatay &amp; the Learning Hall team</b>
                </td>
              </tr>
              <tr>
                <td style="font-size:12px;color:${INK_FAINT};line-height:1.7;">
                  You're receiving this because you registered a Learning Hall parent account.<br>
                  <a href="{{unsubscribe_url}}" style="color:${INK_FAINT};text-decoration:underline;">Unsubscribe</a>
                  <br><br>Learning Hall PH &middot; Philippines
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
