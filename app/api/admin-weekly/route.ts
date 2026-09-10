import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { requireAdminPasscode } from '@/lib/adminAuth';
import { schoolWeekFromDate, weekToTermInfo } from '@/lib/promptBuilder';

// Every action here writes to (or reads, for get_content_week) another user's/grade's row,
// which client-side RLS no longer allows directly — they go through passcode-gated SECURITY
// DEFINER RPCs instead. The passcode sent to Postgres is always process.env.ADMIN_PASSCODE
// (verified here first), never the client-supplied value, matching classmate-admin.
//
// Two action families: progress actions are userId-keyed (player_progress, not week-keyed,
// Phase 4 Wave 1); content actions are grade-keyed + week-keyed (content_weeks/days/quizzes/
// questions, Phase 4 Wave 3, see docs/weekly-progress-redesign-plan.md) — replaces the old
// set_package_data action, which wrote a JSON blob onto a specific student's weekly_packages row.
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { passcode, action, userId, grade, weekStartingDate } = body;

  const authError = requireAdminPasscode(passcode);
  if (authError) return authError;

  if (action === 'set_progress_stats') {
    if (typeof userId !== 'string' || !userId.trim()) {
      return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 });
    }
    const { error } = await supabase.rpc('admin_set_progress_stats', {
      p_passcode: process.env.ADMIN_PASSCODE,
      p_user_id: userId,
      p_character_stats: body.characterStats,
    });
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    return NextResponse.json({ success: true });
  }

  if (action === 'award_progress_gold') {
    if (typeof userId !== 'string' || !userId.trim()) {
      return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 });
    }
    const amount = Number(body.amount);
    if (!amount || amount <= 0) {
      return NextResponse.json({ success: false, error: 'amount must be positive' }, { status: 400 });
    }
    const { data, error } = await supabase.rpc('admin_award_progress_gold', {
      p_passcode: process.env.ADMIN_PASSCODE,
      p_user_id: userId,
      p_amount: amount,
    });
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    return NextResponse.json({ success: true, characterStats: data });
  }

  if (action === 'get_content_week' || action === 'set_content_week') {
    if (typeof grade !== 'number' || typeof weekStartingDate !== 'string') {
      return NextResponse.json({ success: false, error: 'grade and weekStartingDate are required' }, { status: 400 });
    }

    if (action === 'get_content_week') {
      const { data, error } = await supabase.rpc('admin_get_content_week', {
        p_passcode: process.env.ADMIN_PASSCODE,
        p_grade: grade,
        p_week_starting_date: weekStartingDate,
      });
      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 409 });
      return NextResponse.json({ success: true, days: data });
    }

    // Regular subject content has no business existing for a term-break/
    // enrichment week — the Topic Mastery Gauntlet substitutes it entirely
    // (see components/dashboard/board/BoardMapView.tsx and
    // components/DailyChecklist.tsx's gauntlet-aware handling), and until
    // this guard, nothing stopped a week that later got declared a break
    // from having regular content authored/imported for it anyway: that's
    // exactly what happened to the 2026-09-06 week (a scheduled-but-disabled
    // generation run had already produced it before the break was on the
    // calendar), which silently blocked the daily-checklist gold claim for
    // any kid playing the gauntlet instead. `allowBreakWeek: true` opts out
    // for a deliberate exception (e.g. authoring enrichment review content).
    const termInfo = weekToTermInfo(schoolWeekFromDate(new Date(weekStartingDate)));
    if (termInfo.isBreak && !body.allowBreakWeek) {
      return NextResponse.json({
        success: false,
        error: `Week of ${weekStartingDate} falls in "${termInfo.label}" — a break/enrichment week gets the Topic Mastery Gauntlet instead of regular content. Pass allowBreakWeek: true to author it anyway.`,
      }, { status: 409 });
    }

    const { error } = await supabase.rpc('admin_set_content_week', {
      p_passcode: process.env.ADMIN_PASSCODE,
      p_grade: grade,
      p_week_starting_date: weekStartingDate,
      p_days: body.days,
      p_created_by: body.createdBy ?? null,
    });
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    // Bust app/api/content's shared cache immediately, rather than waiting up
    // to 5 minutes for its fallback TTL — a saved week should be playable
    // right away, not eventually. { expire: 0 } (not the 'max' stale-while-
    // revalidate profile) is the documented pattern for a Route Handler that
    // needs data to expire immediately rather than serve-stale-then-refresh.
    revalidateTag('content', { expire: 0 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
}
