// lib/weeklyReview.ts
// Friday is the flex/review day: instead of separate per-subject quests,
// players get one combined "Weekly Review" quest pulling a few questions
// from everything they studied Monday-Thursday that week — built on the
// fly from packageData, no separate admin authoring needed.
import { WEEKDAYS } from './subjectSchedule';

export const WEEKLY_REVIEW_SUBJECT = 'Weekly Review';
const QUESTIONS_PER_SUBJECT = 4;

export function buildWeeklyReviewDay(packageData: any): Record<string, any> {
  const quiz: any[] = [];

  for (const day of WEEKDAYS.slice(0, 4)) { // Monday-Thursday
    const subjects = packageData?.[day] || {};
    for (const questData of Object.values(subjects) as any[]) {
      const source: any[] = Array.isArray(questData?.quiz)
        ? questData.quiz
        : Array.isArray(questData?.questions)
        ? questData.questions
        : [];
      quiz.push(...source.slice(0, QUESTIONS_PER_SUBJECT));
    }
  }

  if (quiz.length === 0) return {};

  return {
    [WEEKLY_REVIEW_SUBJECT]: {
      summary_markdown: '### Weekly Review\n\nShow what you learned this week! This quest pulls a few questions from every subject you studied.',
      quiz,
    },
  };
}
