import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Reuses the service-role client (bypasses RLS) purely to read PUBLIC,
// answer-stripped quiz content — content_weeks (only id/grade/week_starting_date
// selected) and content_questions_public (a view that structurally never
// selects correct_answer, regardless of caller privilege). No user-specific or
// sensitive data ever passes through this route, so lib/supabaseAdmin.ts's
// "passcode-verified callers only" rule doesn't apply here — it's needed
// because content_weeks' RLS only grants the `authenticated` role, and this
// route has no per-request user session to authenticate as (it's meant to be
// cached and shared across every student's browser, not scoped to one user).
async function loadGradeContent(grade: number, weekStartingDate: string) {
  const { data: week } = await supabaseAdmin
    .from('content_weeks')
    .select('id')
    .eq('grade', grade)
    .eq('week_starting_date', weekStartingDate)
    .maybeSingle();
  if (!week) return { content: {}, contentWeekId: null };

  const { data: rows, error } = await supabaseAdmin
    .from('content_questions_public')
    .select('id, prompt, options, sort_order, subject, weekday, summary_markdown')
    .eq('content_week_id', week.id)
    .order('sort_order');
  if (error || !rows) return { content: {}, contentWeekId: week.id };

  const byDay: Record<string, Record<string, { summary_markdown?: string; quiz: any[] }>> = {};
  rows.forEach((r: any) => {
    if (!byDay[r.weekday]) byDay[r.weekday] = {};
    if (!byDay[r.weekday][r.subject]) {
      byDay[r.weekday][r.subject] = { summary_markdown: r.summary_markdown ?? undefined, quiz: [] };
    }
    byDay[r.weekday][r.subject].quiz.push({ id: r.id, question: r.prompt, options: r.options });
  });
  return { content: byDay, contentWeekId: week.id };
}

// Cached via Next.js's Data Cache — shared across ALL concurrent requests on
// this deployment, not per-visitor. Content only changes when an admin
// authors a week (see app/api/admin-weekly/route.ts's set_content_week
// action, which calls revalidateTag('content', { expire: 0 }) to invalidate
// this immediately on save). A 5-minute fallback TTL means the previous
// pattern — 2 Supabase queries PER STUDENT PER PAGE LOAD, scaling with
// concurrent traffic — becomes ~2 queries total per (grade, week)
// combination shared across every visitor, moving load off the free-tier
// Postgres instance onto Vercel's free Data Cache.
//
// unstable_cache, not the newer 'use cache' directive: this app doesn't have
// cacheComponents enabled in next.config.mjs (an app-wide rendering-model
// switch, out of scope for this fix), and unstable_cache — while deprecated
// in favor of 'use cache' — remains fully functional without it. See
// node_modules/next/dist/docs/.../unstable_cache.md, per AGENTS.md's
// instruction to check the docs for this non-stock Next.js build.
const getCachedGradeContent = unstable_cache(loadGradeContent, ['grade-content'], {
  revalidate: 300,
  tags: ['content'],
});

export async function GET(request: NextRequest) {
  const grade = Number(request.nextUrl.searchParams.get('grade'));
  const week = request.nextUrl.searchParams.get('week');
  if (!grade || !week) {
    return NextResponse.json({ content: {}, contentWeekId: null }, { status: 400 });
  }
  const result = await getCachedGradeContent(grade, week);
  return NextResponse.json(result);
}
