'use client';
import { useEffect, useState } from 'react';
import { startOfWeek, format, addDays } from 'date-fns';
import { gradeToNumber } from '@/lib/userSession';
import { IOS, IosGroup } from '@/components/parent/ios';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday'] as const;

const SUBJECT_COLOR: Record<string, string> = {
  English: IOS.blue,
  Mathematics: IOS.purple,
  Filipino: IOS.pink,
  Science: IOS.green,
  'Araling Panlipunan': IOS.orange,
  Makabansa: IOS.orange,
  GMRC: IOS.red,
  MAPEH: IOS.teal,
  'EPP (ICT)': IOS.indigo,
  Computer: IOS.indigo,
};

function subjectColor(subject: string) {
  return SUBJECT_COLOR[subject] ?? IOS.gray;
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

/**
 * Lesson headings arrive as e.g. "🔤 English — Adverbs, Nouns…". The row
 * already shows the subject as a colored label, so drop the leading emoji
 * and the repeated "Subject — " prefix.
 */
function cleanTopic(topic: string, subject: string): string {
  const noEmoji = topic.replace(/^[^\p{L}\p{N}]+/u, '');
  const prefix = new RegExp(`^${subject.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[—–:-]\\s*`, 'i');
  return noEmoji.replace(prefix, '').trim() || noEmoji;
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
  // Tagged with the grade it was loaded for; a different grade reads as loading.
  const [result, setResult] = useState<{
    grade: string;
    lessons: Record<string, LessonEntry[]> | null;
    weekLabel: string;
    error: boolean;
  } | null>(null);
  const loading = result?.grade !== grade;
  const lessons = loading ? null : result.lessons;
  const weekLabel = result?.weekLabel ?? '';
  const error = !loading && result.error;

  useEffect(() => {
    const gradeNum = gradeToNumber(grade);
    // Week key matches useWeeklyData: Sunday-anchored (no weekStartsOn override)
    const sunday = startOfWeek(new Date());
    const weekDate = format(sunday, 'yyyy-MM-dd');
    const monday = addDays(sunday, 1);
    const label = `${format(monday, 'MMM d')}–${format(addDays(monday, 4), 'MMM d, yyyy')}`;
    let cancelled = false;
    const finish = (lessonsByDay: Record<string, LessonEntry[]> | null, failed = false) => {
      if (!cancelled) setResult({ grade, lessons: lessonsByDay, weekLabel: label, error: failed });
    };

    fetch(`/api/content?grade=${gradeNum}&week=${weekDate}`)
      .then(r => {
        if (!r.ok) throw new Error('fetch failed');
        return r.json();
      })
      .then(({ content }: { content: Record<string, Record<string, { summary_markdown?: string }>> }) => {
        if (!content || Object.keys(content).length === 0) {
          finish(null);
          return;
        }
        const byDay: Record<string, LessonEntry[]> = {};
        for (const day of DAYS) {
          const dayContent = content[day];
          if (!dayContent || Object.keys(dayContent).length === 0) continue;
          byDay[day] = Object.entries(dayContent).map(([subject, data]) => {
            const { topic, blurb } = extractBlurb(data?.summary_markdown ?? '');
            return { subject, topic: cleanTopic(topic, subject), blurb };
          });
        }
        finish(Object.keys(byDay).length > 0 ? byDay : null);
      })
      .catch(() => finish(null, true));
    return () => { cancelled = true; };
  }, [grade]);

  const note = (text: string, color: string = IOS.secondary) => (
    <p className="text-center text-[15px] py-6" style={{ color }}>{text}</p>
  );
  if (loading) return note("Loading this week's lessons…");
  if (error) return note('Could not load lessons.', IOS.red);
  if (!lessons) return note('No lessons published for this week yet.');

  const shown = DAYS.filter((d) => lessons[d]);
  return (
    <div className="space-y-8">
      <p className="text-center text-[13px]" style={{ color: IOS.secondary }}>Week of {weekLabel}</p>
      {shown.map((day, i) => (
        <IosGroup
          key={day}
          header={day}
          footer={i === shown.length - 1 ? 'Friday is a weekly review of every subject.' : undefined}
        >
          {lessons[day].map(({ subject, topic, blurb }) => (
            <div key={subject} className="pl-4">
              <div className="ios-row-sep pr-4 py-2.5" style={{ borderBottom: `0.5px solid ${IOS.separator}` }}>
                <p className="text-[13px] font-semibold" style={{ color: subjectColor(subject) }}>{subject}</p>
                <p className="text-[17px] leading-[22px]">{topic || 'Lesson'}</p>
                {blurb && <p className="text-[13px] leading-[18px] mt-0.5" style={{ color: IOS.secondary }}>{blurb}</p>}
              </div>
            </div>
          ))}
        </IosGroup>
      ))}
    </div>
  );
}
