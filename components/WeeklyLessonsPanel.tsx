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
  English:              { chip: 'bg-sky-900/40 border-sky-700/40 text-sky-200',       border: 'border-sky-800/30' },
  Mathematics:          { chip: 'bg-violet-900/40 border-violet-700/40 text-violet-200', border: 'border-violet-800/30' },
  Filipino:             { chip: 'bg-rose-900/40 border-rose-700/40 text-rose-200',     border: 'border-rose-800/30' },
  Science:              { chip: 'bg-emerald-900/40 border-emerald-700/40 text-emerald-200', border: 'border-emerald-800/30' },
  'Araling Panlipunan': { chip: 'bg-amber-900/40 border-amber-700/40 text-amber-200', border: 'border-amber-800/30' },
  Makabansa:            { chip: 'bg-amber-900/40 border-amber-700/40 text-amber-200', border: 'border-amber-800/30' },
  GMRC:                 { chip: 'bg-pink-900/40 border-pink-700/40 text-pink-200',    border: 'border-pink-800/30' },
  MAPEH:                { chip: 'bg-teal-900/40 border-teal-700/40 text-teal-200',    border: 'border-teal-800/30' },
  'EPP (ICT)':          { chip: 'bg-indigo-900/40 border-indigo-700/40 text-indigo-200', border: 'border-indigo-800/30' },
  Computer:             { chip: 'bg-indigo-900/40 border-indigo-700/40 text-indigo-200', border: 'border-indigo-800/30' },
};
const DEFAULT_COLOR = { chip: 'bg-neutral-800/60 border-neutral-700 text-gray-300', border: 'border-neutral-700/30' };

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
    return <p className="text-xs text-gray-500 animate-pulse py-1">Loading this week's lessons…</p>;
  }
  if (error) {
    return <p className="text-xs text-red-500/70 py-1">Could not load lessons.</p>;
  }
  if (!lessons) {
    return <p className="text-xs text-gray-600 py-1">No lessons published for this week yet.</p>;
  }

  return (
    <div className="space-y-3 pt-1">
      <p className="text-[10px] text-gray-500 uppercase tracking-widest">
        Week of {weekLabel}
      </p>

      {DAYS.filter(d => lessons[d]).map(day => (
        <div key={day} className="space-y-1.5">
          <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
            {DAY_SHORT[day]}
          </p>
          <div className="space-y-1.5">
            {lessons[day].map(({ subject, topic, blurb }) => {
              const colors = subjectColors(subject);
              return (
                <div
                  key={subject}
                  className={`rounded-lg border ${colors.border} bg-black/30 px-2.5 py-2 space-y-0.5`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`rounded border text-[10px] px-1.5 py-0.5 leading-tight shrink-0 ${colors.chip}`}>
                      {subject}
                    </span>
                    {topic && (
                      <span className="text-[11px] text-gray-200 font-medium leading-tight truncate">
                        {topic}
                      </span>
                    )}
                  </div>
                  {blurb && (
                    <p className="text-[10px] text-gray-500 leading-snug pl-0.5">
                      {blurb}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <p className="text-[10px] text-gray-600 pt-0.5">Fri — Weekly Review (all subjects)</p>
    </div>
  );
}
