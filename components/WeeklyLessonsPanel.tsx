'use client';
import { useEffect, useState } from 'react';
import { startOfWeek, format, addDays } from 'date-fns';
import { gradeToNumber } from '@/lib/userSession';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday'] as const;
const DAY_SHORT: Record<string, string> = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
};

// Light subject-to-colour mapping so the chips are easy to scan at a glance.
const SUBJECT_COLOR: Record<string, string> = {
  English:              'bg-sky-900/40 border-sky-700/40 text-sky-200',
  Mathematics:          'bg-violet-900/40 border-violet-700/40 text-violet-200',
  Filipino:             'bg-rose-900/40 border-rose-700/40 text-rose-200',
  Science:              'bg-emerald-900/40 border-emerald-700/40 text-emerald-200',
  'Araling Panlipunan': 'bg-amber-900/40 border-amber-700/40 text-amber-200',
  Makabansa:            'bg-amber-900/40 border-amber-700/40 text-amber-200',
  GMRC:                 'bg-pink-900/40 border-pink-700/40 text-pink-200',
  MAPEH:                'bg-teal-900/40 border-teal-700/40 text-teal-200',
  'EPP (ICT)':          'bg-indigo-900/40 border-indigo-700/40 text-indigo-200',
  Computer:             'bg-indigo-900/40 border-indigo-700/40 text-indigo-200',
};
const DEFAULT_COLOR = 'bg-neutral-800/60 border-neutral-700 text-gray-300';

function subjectColor(subject: string): string {
  return SUBJECT_COLOR[subject] ?? DEFAULT_COLOR;
}

interface Props {
  grade: string; // e.g. "Grade 5"
}

export default function WeeklyLessonsPanel({ grade }: Props) {
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<Record<string, string[]> | null>(null);
  const [weekLabel, setWeekLabel] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    const gradeNum = gradeToNumber(grade);
    if (!gradeNum) {
      setLoading(false);
      return;
    }

    // Week key matches useWeeklyData: Sunday-anchored (no weekStartsOn override)
    const sunday = startOfWeek(new Date());
    const weekDate = format(sunday, 'yyyy-MM-dd');
    // Display label still shows Mon–Fri for the parent
    const monday = addDays(sunday, 1);
    setWeekLabel(
      `${format(monday, 'MMM d')}–${format(addDays(monday, 4), 'MMM d, yyyy')}`
    );

    fetch(`/api/content?grade=${gradeNum}&week=${weekDate}`)
      .then(r => {
        if (!r.ok) throw new Error('fetch failed');
        return r.json();
      })
      .then(({ content }: { content: Record<string, Record<string, unknown>> }) => {
        if (!content || Object.keys(content).length === 0) {
          setLessons(null);
        } else {
          const byDay: Record<string, string[]> = {};
          for (const day of DAYS) {
            if (content[day] && Object.keys(content[day]).length > 0) {
              byDay[day] = Object.keys(content[day]);
            }
          }
          setLessons(Object.keys(byDay).length > 0 ? byDay : null);
        }
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [grade]);

  if (loading) {
    return (
      <p className="text-xs text-gray-500 animate-pulse py-1">
        Loading this week's lessons…
      </p>
    );
  }

  if (error) {
    return <p className="text-xs text-red-500/70 py-1">Could not load lessons.</p>;
  }

  if (!lessons) {
    return (
      <p className="text-xs text-gray-600 py-1">
        No lessons published for this week yet.
      </p>
    );
  }

  return (
    <div className="space-y-2 pt-1">
      <p className="text-[10px] text-gray-500 uppercase tracking-widest">
        Week of {weekLabel}
      </p>

      {DAYS.filter(d => lessons[d]).map(day => (
        <div key={day} className="flex items-start gap-2">
          <span className="text-[10px] text-gray-500 w-7 pt-0.5 shrink-0 font-mono">
            {DAY_SHORT[day]}
          </span>
          <div className="flex flex-wrap gap-1">
            {lessons[day].map(subject => (
              <span
                key={subject}
                className={`rounded-md border text-[10px] px-1.5 py-0.5 leading-tight ${subjectColor(subject)}`}
              >
                {subject}
              </span>
            ))}
          </div>
        </div>
      ))}

      <p className="text-[10px] text-gray-600">Fri — Weekly Review (all subjects)</p>
    </div>
  );
}
