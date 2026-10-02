'use client';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { IOS, IosGroup } from '@/components/parent/ios';

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
    return <p className="text-center text-[15px] py-6" style={{ color: IOS.secondary }}>Loading comparison…</p>;
  }

  const rowFor = (id: string) => rows.find((r) => r.childId === id);

  const stats: { label: string; pick: (r: Row | undefined) => string | number }[] = [
    { label: 'Level', pick: (r) => r?.level ?? '—' },
    { label: 'XP', pick: (r) => (r?.xp ?? 0).toLocaleString() },
    { label: 'Day streak', pick: (r) => r?.streak ?? 0 },
    { label: 'Topics mastered', pick: (r) => r?.masteryCount ?? 0 },
    { label: 'Questions this week', pick: (r) => r?.quizzesLast7Days ?? 0 },
  ];
  const cols = { gridTemplateColumns: `minmax(0,1.4fr) repeat(${kids.length}, minmax(0,1fr))` };
  const sep = { borderBottom: `0.5px solid ${IOS.separator}` };

  return (
    <IosGroup footer="Questions this week counts the last 7 days.">
      <div className="pl-4">
        <div className="ios-row-sep grid items-end gap-2 pr-4 py-3" style={{ ...cols, ...sep }}>
          <span />
          {kids.map((kid) => (
            <div key={kid.id} className="flex flex-col items-center gap-1 min-w-0">
              <img src={kid.avatar} alt="" className="w-10 h-10 object-contain" />
              <span className="text-[13px] font-semibold truncate max-w-full">{kid.full_name.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>
      {stats.map((stat) => (
        <div key={stat.label} className="pl-4">
          <div className="ios-row-sep grid items-center gap-2 pr-4 min-h-[44px]" style={{ ...cols, ...sep }}>
            <span className="text-[15px] truncate" style={{ color: IOS.secondary }}>{stat.label}</span>
            {kids.map((kid) => (
              <span key={kid.id} className="text-center text-[17px] font-semibold tabular-nums">{stat.pick(rowFor(kid.id))}</span>
            ))}
          </div>
        </div>
      ))}
    </IosGroup>
  );
}
