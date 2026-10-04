import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPasscode } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Passcode-gated aggregates for the admin Overview page
// (components/admin/OverviewSection.tsx). Everything is computed here with
// the service-role client and only totals go back to the browser — no
// per-child rows. Days are bucketed in Asia/Manila.

const RANGES = [7, 30, 90] as const;
const PAGE = 1000; // PostgREST caps every select at 1000 rows; page through.
const OPEN_BUG_STATUSES = ['new', 'needs_manual_triage', 'in_progress'];

type Row = Record<string, unknown>;

async function fetchAll(build: (from: number, to: number) => PromiseLike<{ data: Row[] | null; error: { message: string } | null }>) {
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

const manilaDay = (ts: string | Date) =>
  new Date(ts).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

function addDays(day: string, n: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function change(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null; // no baseline: hide the delta
  return (current - previous) / previous;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const authError = requireAdminPasscode(body.passcode);
  if (authError) return authError;

  const days = RANGES.includes(body.days) ? (body.days as number) : 30;
  const today = manilaDay(new Date());
  const periodStart = addDays(today, -(days - 1));
  const prevStart = addDays(periodStart, -days);
  const prevStartTs = `${prevStart}T00:00:00+08:00`;
  const dayList = Array.from({ length: days }, (_, i) => addDays(periodStart, i));
  const prevDayList = Array.from({ length: days }, (_, i) => addDays(prevStart, i));

  try {
    const [children, parents, guildRows, quizRows, premiumRes, bugsRes] = await Promise.all([
      fetchAll((f, t) => supabaseAdmin.from('children').select('id, grade, school_name, parent_id, created_at, is_active').order('created_at').range(f, t)),
      fetchAll((f, t) => supabaseAdmin.from('parents').select('id, created_at').order('created_at').range(f, t)),
      fetchAll((f, t) => supabaseAdmin.from('guild_sessions').select('user_id, played_on').gte('played_on', prevStart).order('played_on').range(f, t)),
      fetchAll((f, t) => supabaseAdmin.from('player_log').select('user_id, created_at').eq('action_type', 'quiz').gte('created_at', prevStartTs).order('created_at').range(f, t)),
      supabaseAdmin.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabaseAdmin.from('bug_reports').select('id', { count: 'exact', head: true }).in('status', OPEN_BUG_STATUSES),
    ]);
    if (premiumRes.error) throw new Error(premiumRes.error.message);
    if (bugsRes.error) throw new Error(bugsRes.error.message);

    // ── Signups ──────────────────────────────────────────────────────────
    const countByDay = (rows: Row[]) => {
      const m = new Map<string, number>();
      for (const r of rows) {
        const d = manilaDay(r.created_at as string);
        m.set(d, (m.get(d) ?? 0) + 1);
      }
      return m;
    };
    const kidsByDay = countByDay(children);
    const parentsByDay = countByDay(parents);
    const sumDays = (m: Map<string, number>, list: string[]) => list.reduce((s, d) => s + (m.get(d) ?? 0), 0);

    // ── Learners: kids who finished a guild session or main quest ────────
    // Limited to real child accounts, which also drops the family accounts.
    const childIds = new Set(children.map((c) => c.id as string));
    const learnersByDay = new Map<string, Set<string>>();
    const addLearner = (day: string, user: string) => {
      if (!childIds.has(user)) return;
      if (!learnersByDay.has(day)) learnersByDay.set(day, new Set());
      learnersByDay.get(day)!.add(user);
    };
    for (const r of guildRows) addLearner(r.played_on as string, r.user_id as string);
    for (const r of quizRows) addLearner(manilaDay(r.created_at as string), r.user_id as string);
    const distinctLearners = (list: string[]) => {
      const s = new Set<string>();
      for (const d of list) learnersByDay.get(d)?.forEach((u) => s.add(u));
      return s.size;
    };

    // ── Composition of active kids ───────────────────────────────────────
    const active = children.filter((c) => c.is_active !== false);
    const gradeCounts = new Map<string, number>();
    const schoolCounts = new Map<string, number>();
    for (const c of active) {
      const g = (c.grade as string) || 'Unknown';
      gradeCounts.set(g, (gradeCounts.get(g) ?? 0) + 1);
      const s = ((c.school_name as string) || '').trim() || 'Not set';
      schoolCounts.set(s, (schoolCounts.get(s) ?? 0) + 1);
    }
    const gradeOrder = (g: string) => Number(g.replace(/\D/g, '')) || 99;
    const grades = [...gradeCounts.entries()]
      .sort((a, b) => gradeOrder(a[0]) - gradeOrder(b[0]))
      .map(([label, value]) => ({ label, value }));
    const rankedSchools = [...schoolCounts.entries()].sort((a, b) => b[1] - a[1]);
    const TOP_SCHOOLS = 8;
    const schools = rankedSchools.slice(0, TOP_SCHOOLS).map(([label, value]) => ({ label, value }));
    const rest = rankedSchools.slice(TOP_SCHOOLS);
    const otherSchools = { schools: rest.length, kids: rest.reduce((s, [, v]) => s + v, 0) };

    const newKids = sumDays(kidsByDay, dayList);
    const newKidsPrev = sumDays(kidsByDay, prevDayList);
    const newParents = sumDays(parentsByDay, dayList);
    const newParentsPrev = sumDays(parentsByDay, prevDayList);
    const learners = distinctLearners(dayList);
    const learnersPrev = distinctLearners(prevDayList);
    const linked = active.filter((c) => c.parent_id).length;

    return NextResponse.json({
      success: true,
      range: { days, start: periodStart, end: today },
      kpis: {
        newKids: { value: newKids, change: change(newKids, newKidsPrev) },
        newParents: { value: newParents, change: change(newParents, newParentsPrev) },
        learners: { value: learners, change: change(learners, learnersPrev) },
        activeKids: active.length,
        linkedPct: active.length ? linked / active.length : 0,
        premium: premiumRes.count ?? 0,
        openBugs: bugsRes.count ?? 0,
      },
      daily: {
        labels: dayList,
        kids: dayList.map((d) => kidsByDay.get(d) ?? 0),
        kidsPrev: prevDayList.map((d) => kidsByDay.get(d) ?? 0),
        parents: dayList.map((d) => parentsByDay.get(d) ?? 0),
        parentsPrev: prevDayList.map((d) => parentsByDay.get(d) ?? 0),
        learners: dayList.map((d) => learnersByDay.get(d)?.size ?? 0),
      },
      grades,
      schools,
      otherSchools,
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Failed to load overview' }, { status: 500 });
  }
}
