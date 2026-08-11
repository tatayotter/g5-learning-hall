// lib/subjectSchedule.ts
// Fixed weekly rotation: every subject always publishes to the same weekday,
// so Main Quests no longer need a day picked by hand. Grade 5 and Grade 2
// have different subject lists, so each grade gets its own schedule.
export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
export type Weekday = typeof WEEKDAYS[number];

// Matches the 9 subjects the `deped-draft-questions-grade5` routine generates for.
// Exported (not just used internally) so it doubles as the single source of
// truth for "which subjects does Grade 5 have" — e.g. lib/bossPersonas.ts
// derives its persona list from this instead of hardcoding a second list.
export const GRADE_5_SCHEDULE: Record<string, Weekday> = {
  English: 'Monday',
  Mathematics: 'Monday',
  Filipino: 'Tuesday',
  Science: 'Tuesday',
  'Araling Panlipunan': 'Wednesday',
  'EPP (ICT)': 'Wednesday',
  MAPEH: 'Thursday',
  'EPP (AFA/FCS/IA)': 'Thursday',
  GMRC: 'Thursday',
};

// Matches the 7 subjects the `deped-draft-questions-grade2` routine generates for.
export const GRADE_2_SCHEDULE: Record<string, Weekday> = {
  English: 'Monday',
  Mathematics: 'Monday',
  Filipino: 'Tuesday',
  Science: 'Tuesday',
  Makabansa: 'Wednesday',
  Computer: 'Wednesday',
  GMRC: 'Thursday',
};

const SCHEDULE_BY_GRADE: Record<number, Record<string, Weekday>> = {
  5: GRADE_5_SCHEDULE,
  2: GRADE_2_SCHEDULE,
};

// Subjects with no fixed slot (e.g. "Weekly Review") fall to Friday, the flex/review day.
export function getScheduledDay(subject: string, grade: number = 5): Weekday {
  const schedule = SCHEDULE_BY_GRADE[grade] || GRADE_5_SCHEDULE;
  return schedule[subject] || 'Friday';
}
