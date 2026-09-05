import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Groq free-tier model — small/fast, plenty for classifying a short bug
// description. Keep max_tokens low; this only needs a few short fields back.
// (llama-3.1-8b-instant was retired from Groq's catalog; gpt-oss-20b is the
// current equivalent-tier fast/free model — verify against
// https://console.groq.com/docs/models if this ever 404s again.)
const GROQ_MODEL = 'openai/gpt-oss-20b';

const VALID_CATEGORIES = ['login', 'payments', 'progress-tracking', 'content', 'ui', 'other'] as const;
const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;

const TRIAGE_SYSTEM_PROMPT =
  `You triage bug reports from parents using a kids' tutoring app's parent dashboard. ` +
  `Given a raw description, respond with ONLY a JSON object (no prose) with these fields:\n` +
  `- "title": a short (<=8 words) descriptive title\n` +
  `- "category": one of ${VALID_CATEGORIES.join(', ')}\n` +
  `- "severity": one of ${VALID_SEVERITIES.join(', ')}\n` +
  `- "summary": a 1-3 sentence cleaned-up restatement of the issue and, if present, repro steps\n` +
  `- "confidence": a number 0-1 for how confident you are in this classification`;

interface TriageResult {
  ai_title: string | null;
  ai_category: string | null;
  ai_severity: string | null;
  ai_summary: string | null;
  ai_confidence: number | null;
}

// Never throws — a failed/malformed triage just means the row saves with
// null AI fields and status 'needs_manual_triage'; the raw report is never lost.
async function triageWithGroq(rawDescription: string): Promise<TriageResult> {
  const empty: TriageResult = { ai_title: null, ai_category: null, ai_severity: null, ai_summary: null, ai_confidence: null };
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return empty;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: GROQ_MODEL,
        response_format: { type: 'json_object' },
        // gpt-oss-20b spends part of this budget on internal reasoning
        // before emitting the JSON — 300 risked truncating the actual
        // output on a longer report, so this leaves real headroom.
        max_tokens: 600,
        temperature: 0.2,
        messages: [
          { role: 'system', content: TRIAGE_SYSTEM_PROMPT },
          { role: 'user', content: rawDescription },
        ],
      }),
    }).finally(() => clearTimeout(timeout));

    if (!res.ok) {
      console.error('Groq triage request failed:', res.status, await res.text());
      return empty;
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') return empty;

    const parsed = JSON.parse(content);
    const category = VALID_CATEGORIES.includes(parsed.category) ? parsed.category : null;
    const severity = VALID_SEVERITIES.includes(parsed.severity) ? parsed.severity : null;
    const confidence = typeof parsed.confidence === 'number'
      ? Math.max(0, Math.min(1, parsed.confidence))
      : null;

    return {
      ai_title: typeof parsed.title === 'string' ? parsed.title.slice(0, 200) : null,
      ai_category: category,
      ai_severity: severity,
      ai_summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 2000) : null,
      ai_confidence: confidence,
    };
  } catch (err) {
    // Malformed JSON, network error, or abort — non-fatal, falls back below.
    console.error('Groq triage error (non-fatal):', err);
    return empty;
  }
}

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

  const { description } = await request.json();
  if (typeof description !== 'string' || !description.trim()) {
    return NextResponse.json({ success: false, error: 'Missing description' }, { status: 400 });
  }
  const rawDescription = description.trim().slice(0, 4000);

  // parent_email is required — it's the only way the parent gets updated on
  // this ticket, so refuse rather than silently save an unreachable report.
  if (!userData.user.email) {
    return NextResponse.json({ success: false, error: 'Account has no email on file' }, { status: 400 });
  }

  // Rate limit per parent — checked before calling Groq so a blocked
  // request never spends any of the shared free-tier quota. Two guards:
  // a short cooldown against accidental double-submits/spam-clicking, and
  // a daily cap against one account burning the quota outright.
  const COOLDOWN_MS = 2 * 60 * 1000;
  const DAILY_LIMIT = 5;
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: recentReports, error: recentError } = await supabaseAdmin
    .from('bug_reports')
    .select('created_at')
    .eq('parent_id', userData.user.id)
    .gte('created_at', oneDayAgo)
    .order('created_at', { ascending: false });

  if (recentError) {
    return NextResponse.json({ success: false, error: recentError.message }, { status: 500 });
  }

  if (recentReports.length > 0) {
    const msSinceLast = Date.now() - new Date(recentReports[0].created_at).getTime();
    if (msSinceLast < COOLDOWN_MS) {
      return NextResponse.json(
        { success: false, error: 'Please wait a couple minutes before submitting another report' },
        { status: 429 }
      );
    }
  }

  if (recentReports.length >= DAILY_LIMIT) {
    return NextResponse.json(
      { success: false, error: 'Daily bug report limit reached — please try again tomorrow' },
      { status: 429 }
    );
  }

  const { data: parent } = await supabaseAdmin
    .from('parents')
    .select('full_name')
    .eq('id', userData.user.id)
    .single();

  const triage = await triageWithGroq(rawDescription);
  const status = triage.ai_category ? 'new' : 'needs_manual_triage';

  const { error: insertError } = await supabaseAdmin.from('bug_reports').insert({
    parent_id: userData.user.id,
    parent_name: parent?.full_name ?? null,
    parent_email: userData.user.email,
    raw_description: rawDescription,
    status,
    ...triage,
  });

  if (insertError) {
    return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
