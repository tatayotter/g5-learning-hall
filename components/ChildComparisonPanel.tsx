'use client';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';

// Premium perk: side-by-side stats across every child on the account. Pure UI
// on top of the same tables ChildProgressPanel already queries per child
// (player_progress, user_completed_questions, get_child_streak) — just fired
// for every kid at once instead of one at a time behind an expander.
// See computeStreak in ChildProgressPanel.tsx for the same streak logic.

interface Kid {
  id: string;
  full_name: string;
  grade: string;
  avatar: string;
}

interface Row {
  childId: string;
  level: number | null;
  xp: number | null;
  masteryCount: number | null;
  quizzesLast7Days: number;
  streak: number;
}

function computeStreak(claimDates: string[]): number {
  if (claimDates.length === 0) return 0;
  const dates = new Set(claimDates);
  const cursor = new Date();
  if (!dates.has(format(cursor, 'yyyy-MM-dd'))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (dates.has(format(cursor, 'yyyy-MM-dd'))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export default function ChildComparisonPanel({ kids }: { kids: Kid[] }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const results = await Promise.all(
        kids.map(async (kid) => {
          const [progressRes, quizRes, streakRes] = await Promise.all([
            supabase
              .from('player_progress')
              .select('level, xp, mastery_count')
              .eq('user_id', kid.id)
              .maybeSingle(),
            supabase
              .from('user_completed_questions')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', kid.id)
              .gte('completed_at', sevenDaysAgo.toISOString()),
            supabase.rpc('get_child_streak', { p_child_id: kid.id }),
          ]);
          const claimDates = ((streakRes.data as { claim_date: string }[] | null) ?? []).map((r) => r.claim_date);
          return {
            childId: kid.id,
            level: progressRes.data?.level ?? null,
            xp: progressRes.data?.xp ?? null,
            masteryCount: progressRes.data?.mastery_count ?? null,
            quizzesLast7Days: quizRes.count ?? 0,
            streak: computeStreak(claimDates),
          };
        })
      );
      if (!cancelled) {
        setRows(results);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [kids]);

  if (loading) {
    return <p className="text-sm text-stone-500 py-2">Loading comparison…</p>;
  }

  const rowFor = (id: string) => rows.find((r) => r.childId === id);

  const stats: { label: string; icon: string; pick: (r: Row | undefined) => string | number }[] = [
    { label: 'Level', icon: '⭐', pick: (r) => r?.level ?? '—' },
    { label: 'XP', icon: '✨', pick: (r) => r?.xp ?? 0 },
    { label: 'Day streak', icon: '🔥', pick: (r) => r?.streak ?? 0 },
    { label: 'Topics mastered', icon: '📘', pick: (r) => r?.masteryCount ?? 0 },
    { label: 'Questions this week', icon: '📝', pick: (r) => r?.quizzesLast7Days ?? 0 },
  ];

  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200 bg-[#ffffff] shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-200">
            <th className="text-left px-3 py-2.5 text-xs uppercase tracking-wide text-stone-400 font-semibold">Stat</th>
            {kids.map((kid) => (
              <th key={kid.id} className="px-3 py-2.5 text-center">
                <div className="flex flex-col items-center gap-1">
                  <img src={kid.avatar} alt="" className="w-8 h-8 rounded-lg object-cover border border-stone-200" />
                  <span className="text-slate-800 font-bold text-xs whitespace-nowrap">{kid.full_name}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stats.map((stat, i) => (
            <tr key={stat.label} className={i % 2 === 0 ? 'bg-stone-50/60' : ''}>
              <td className="px-3 py-2 text-stone-500 whitespace-nowrap">{stat.icon} {stat.label}</td>
              {kids.map((kid) => (
                <td key={kid.id} className="px-3 py-2 text-center text-slate-800 font-semibold">
                  {stat.pick(rowFor(kid.id))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
