// lib/mainQuestAttempts.ts
// A board-tab main quest (day_subject quiz, including the synthetic Friday
// "Weekly Review") allows at most this many attempts per real calendar day.
// If the last attempt of the day isn't perfect, the quest locks until the
// next calendar day, which grants a fresh set of attempts — see
// main_quest_daily_attempts / grade_content_quiz (Postgres) for the
// server-authoritative enforcement, and daily_quest_attempts in
// hooks/useWeeklyData.ts for how the client mirrors it.
export const MAIN_QUEST_DAILY_ATTEMPT_CAP = 2;
