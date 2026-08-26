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

const SUBJECT_COLOR: Record<string, { chip: string; border: string }> = {
  English:              { chip: 'bg-sky-50 border-sky-200 text-sky-700',       border: 'border-sky-200' },
  Mathematics:          { chip: 'bg-violet-50 border-violet-200 text-violet-700', border: 'border-violet-200' },
  Filipino:             { chip: 'bg-rose-50 border-rose-200 text-rose-700',     border: 'border-rose-200' },
  Science:              { chip: 'bg-emerald-50 border-emerald-200 text-emerald-700', border: 'border-emerald-200' },
  'Araling Panlipunan': { chip: 'bg-amber-50 border-amber-200 text-amber-700', border: 'border-amber-200' },
  Makabansa:            { chip: 'bg-amber-50 border-amber-200 text-amber-700', border: 'border-amber-200' },
  GMRC:                 { chip: 'bg-pink-50 border-pink-200 text-pink-700',    border: 'border-pink-200' },
  MAPEH:                { chip: 'bg-teal-50 border-teal-200 text-teal-700',    border: 'border-teal-200' },
  'EPP (ICT)':          { chip: 'bg-indigo-50 border-indigo-200 text-indigo-700', border: 'border-indigo-200' },
  Computer:             { chip: 'bg-indigo-50 border-indigo-200 text-indigo-700', border: 'border-indigo-200' },
};
const DEFAULT_COLOR = { chip: 'bg-stone-100 border-stone-300 text-stone-600', border: 'border-stone-200' };

function subjectColors(subject: string) {
  return SUBJECT_COLOR[subject] ?? DEFAULT_COLOR;
}

/** Pull the lesson topic + a one-liner from summary_markdown. */
function extractBlurb(md: string): { topic: string; blurb: string } {
  const lines = md.split('\n').map(l => l.trim()).filter(Boolean);

  // First ## heading is the lesson topic
  const headingLine = lines.find(l => /^#{1,3}\s/.test(l));
  const topic = headingLine
    ? headingLine.replace(/^#{1,3}\s*/, '').replace(/\*\*/g, '').trim()
    : '';

  // First bullet after the heading as a one-liner description
  const headingIdx = headingLine ? lines.indexOf(headingLine) : -1;
  const blurbLine = lines.slice(headingIdx + 1).find(l => /^[-*]/.test(l));
  const blurb = blurbLine
    ? blurbLine.replace(/^[-*]\s*/, '').replace(/\*\*/g, '').replace(/\*/g, '').trim()
    : '';

  // Truncate blurb to ~90 chars
  const shortBlurb = blurb.length > 90 ? blurb.slice(0, 87) + '…' : blurb;

  return { topic, blurb: shortBlurb };
}

interface LessonEntry {
  subject: string;
  topic: string;
  blurb: string;
}

interface Props {
  grade: string; // e.g. "Grade 5"
}

export default function WeeklyLessonsPanel({ grade }: Props) {
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<Record<string, LessonEntry[]> | null>(null);
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
    const monday = addDays(sunday, 1);
    setWeekLabel(
      `${format(monday, 'MMM d')}–${format(addDays(monday, 4), 'MMM d, yyyy')}`
    );

    fetch(`/api/content?grade=${gradeNum}&week=${weekDate}`)
      .then(r => {
        if (!r.ok) throw new Error('fetch failed');
        return r.json();
      })
      .then(({ content }: { content: Record<string, Record<string, { summary_markdown?: string }>> }) => {
        if (!content || Object.keys(content).length === 0) {
          setLessons(null);
          setLoading(false);
          return;
        }
        const byDay: Record<string, LessonEntry[]> = {};
        for (const day of DAYS) {
          const dayContent = content[day];
          if (!dayContent || Object.keys(dayContent).length === 0) continue;
          byDay[day] = Object.entries(dayContent).map(([subject, data]) => {
            const { topic, blurb } = extractBlurb(data?.summary_markdown ?? '');
            return { subject, topic, blurb };
          });
        }
        setLessons(Object.keys(byDay).length > 0 ? byDay : null);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [grade]);

  if (loading) {
    return <p className="text-sm text-stone-500 animate-pulse py-1">Loading this week's lessons…</p>;
  }
  if (error) {
    return <p className="text-sm text-red-500 py-1">Could not load lessons.</p>;
  }
  if (!lessons) {
    return <p className="text-sm text-stone-400 py-1">No lessons published for this week yet.</p>;
  }

  return (
    <div className="space-y-3 pt-1">
      <p className="text-xs text-stone-400 uppercase tracking-widest">
        Week of {weekLabel}
      </p>

      {DAYS.filter(d => lessons[d]).map(day => (
        <div key={day} className="space-y-1.5">
          <p className="text-xs font-mono text-stone-400 uppercase tracking-widest">
            {DAY_SHORT[day]}
          </p>
          <div className="space-y-1.5">
            {lessons[day].map(({ subject, topic, blurb }) => {
              const colors = subjectColors(subject);
              return (
                <div
                  key={subject}
                  className={`rounded-lg border ${colors.border} bg-stone-50 px-3 py-2.5 space-y-0.5`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`rounded border text-xs px-1.5 py-0.5 leading-tight shrink-0 ${colors.chip}`}>
                      {subject}
                    </span>
                    {topic && (
                      <span className="text-sm text-slate-700 font-medium leading-tight truncate">
                        {topic}
                      </span>
                    )}
                  </div>
                  {blurb && (
                    <p className="text-xs text-stone-500 leading-snug pl-0.5">
                      {blurb}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <p className="text-xs text-stone-400 pt-0.5">Fri — Weekly Review (all subjects)</p>
    </div>
  );
}
