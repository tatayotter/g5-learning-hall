/**
 * promptBuilder.ts
 *
 * Core logic for lean weekly-package prompt assembly.
 *
 * Problem: the grade prompt .md files are 13-18 KB (~4 000 tokens) each.
 * ~85 % of that is the full-year BOW kept as a human lookup table; the AI
 * only needs the ~150-token summary for the current week's subjects.
 *
 * This module turns grade + school-week → a minimal ~550-token prompt.
 */

// ─── School calendar helpers ─────────────────────────────────────────────────

/** Monday of the school-opening week (Week 1 = Orientation, Jun 15 2026). */
const SCHOOL_OPEN_MS = new Date('2026-06-15').getTime();
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

export function schoolWeekFromDate(date: Date): number {
  const diff = date.getTime() - SCHOOL_OPEN_MS;
  return Math.max(1, Math.floor(diff / MS_PER_WEEK) + 1);
}

export function weekStartDate(schoolWeek: number): Date {
  return new Date(SCHOOL_OPEN_MS + (schoolWeek - 1) * MS_PER_WEEK);
}

export type TermInfo = {
  term: 1 | 2 | 3;
  termWeek: number;
  label: string;
  isBreak: boolean;
};

/**
 * Maps a continuous school week → the term context used in the BOW.
 *
 * SY 2026-2027 calendar (from memory/project_school_calendar_sy2026.md):
 *   Week 1           – Orientation
 *   Weeks 2-13       – Term 1 / Q1   (BOW Week 1 = school Week 2)
 *   Week 13-14       – Term 1 break  (Sep 10-20)
 *   Weeks 15-27      – Term 2 / Q2   (BOW Week 1 = school Week 15)
 *   Weeks 27-29      – Term 2 break  (Dec 17-31)
 *   Weeks 30-40      – Term 3 / Q3   (BOW Week 1 = school Week 30)
 *   Weeks 41-50      – Term 3 cont / Q4
 */
export function weekToTermInfo(schoolWeek: number): TermInfo {
  if (schoolWeek <= 1)
    return { term: 1, termWeek: 0, label: 'Week 1 – Orientation', isBreak: false };
  if (schoolWeek <= 13)
    return { term: 1, termWeek: schoolWeek - 1, label: `Term 1 Week ${schoolWeek - 1}`, isBreak: false };
  if (schoolWeek === 14)
    return { term: 1, termWeek: 13, label: 'Term 1 Break', isBreak: true };
  if (schoolWeek <= 27)
    return { term: 2, termWeek: schoolWeek - 14, label: `Term 2 Week ${schoolWeek - 14}`, isBreak: false };
  if (schoolWeek <= 29)
    return { term: 2, termWeek: 13, label: 'Term 2 Break (Christmas)', isBreak: true };
  if (schoolWeek <= 40)
    return { term: 3, termWeek: schoolWeek - 29, label: `Term 3 Week ${schoolWeek - 29}`, isBreak: false };
  return { term: 3, termWeek: schoolWeek - 40, label: `Term 3 (Q4) Week ${schoolWeek - 40}`, isBreak: false };
}

// ─── BOW extraction from existing .md prompt files ───────────────────────────

/**
 * Extracts per-subject bullet-point summaries from the "## BOW REFERENCE"
 * section of a grade prompt .md file, filtered to the given term.
 *
 * Returns { subjectName → bullet string (compact, 1-3 lines) }
 */
export function extractBowSummary(
  mdContent: string,
  term: 1 | 2 | 3
): Record<string, string> {
  const result: Record<string, string> = {};

  const bowStart = mdContent.indexOf('## BOW REFERENCE');
  if (bowStart === -1) return result;

  // Everything from BOW REFERENCE to next top-level ## (or end)
  const afterBow = mdContent.slice(bowStart);
  const nextH2 = afterBow.indexOf('\n## ', 2);
  const bowSection = nextH2 === -1 ? afterBow : afterBow.slice(0, nextH2);

  // Split by subject headers (### ...)
  const subjectBlocks = bowSection.split(/\n### /);
  // First element is the section header — skip it
  for (const block of subjectBlocks.slice(1)) {
    const lines = block.split('\n');
    // First line is the subject name, possibly with (Grade N) and ★ SSES
    const rawName = lines[0].trim();
    const subjectName = rawName
      .replace(/\s*★.*$/, '')
      .replace(/\s*\(Grade \d\).*$/, '')
      .trim();

    // Find "**Term N" block
    const termMarker = `**Term ${term}`;
    const tStart = block.indexOf(termMarker);
    if (tStart === -1) continue;

    // End of this term block = next **Term or end of block
    const rest = block.slice(tStart + termMarker.length);
    const nextTerm = rest.search(/\*\*Term \d/);
    const termBlock = nextTerm === -1 ? rest : rest.slice(0, nextTerm);

    // Pull bullet lines (lines starting with -)
    const bullets = termBlock
      .split('\n')
      .filter(l => l.trimStart().startsWith('-'))
      .map(l => l.trim())
      .join('\n');

    if (bullets) result[subjectName] = bullets;
  }

  return result;
}

// ─── Per-grade default day schedules ─────────────────────────────────────────

export type DaySchedule = Record<string, string[]>; // day → subjects

export const DEFAULT_SCHEDULES: Record<number, DaySchedule> = {
  2: {
    Monday: ['English', 'MAKABANSA'],
    Tuesday: ['GMRC', 'Filipino'],
    Wednesday: ['English', 'Mathematics'],
    Thursday: ['Filipino', 'Mathematics'],
  },
  3: {
    Monday: ['English', 'Makabansa'],
    Tuesday: ['GMRC', 'Filipino'],
    Wednesday: ['Mathematics', 'Science'],
    Thursday: ['Filipino', 'Computer'],
  },
  4: {
    Monday: ['English', 'Araling Panlipunan'],
    Tuesday: ['GMRC', 'Filipino'],
    Wednesday: ['Mathematics', 'Science'],
    Thursday: ['EPP (ICT)', 'MAPEH'],
  },
  5: {
    Monday: ['English', 'Araling Panlipunan'],
    Tuesday: ['GMRC', 'Filipino'],
    Wednesday: ['Mathematics', 'Science'],
    Thursday: ['EPP (ICT)', 'MAPEH'],
  },
  6: {
    Monday: ['English', 'Araling Panlipunan'],
    Tuesday: ['GMRC', 'Filipino'],
    Wednesday: ['Mathematics', 'Science'],
    Thursday: ['EPP (ICT)', 'MAPEH'],
  },
};

export const ALL_SUBJECTS_BY_GRADE: Record<number, string[]> = {
  2: ['English', 'Mathematics', 'Filipino', 'GMRC', 'MAKABANSA'],
  3: ['English', 'Mathematics', 'Filipino', 'Science', 'GMRC', 'Makabansa', 'Computer'],
  4: ['English', 'Mathematics', 'Filipino', 'Science', 'Araling Panlipunan', 'GMRC', 'EPP (ICT)', 'EPP (AFA/FCS/IA)', 'MAPEH'],
  5: ['English', 'Mathematics', 'Filipino', 'Science', 'Araling Panlipunan', 'GMRC', 'EPP (ICT)', 'EPP (AFA/FCS/IA)', 'MAPEH'],
  6: ['English', 'Mathematics', 'Filipino', 'Science', 'Araling Panlipunan', 'GMRC', 'EPP (ICT)', 'EPP (AFA/FCS/IA)', 'MAPEH'],
};

// ─── Lean prompt templates ────────────────────────────────────────────────────

const SHARED_OUTPUT_RULES_BASE = `OUTPUT RULES:
- Return ONLY valid JSON. No explanation, no markdown, no code blocks.
- Top-level keys: Monday, Tuesday, Wednesday, Thursday, Friday
- Each day has subject keys (e.g. "English", "Mathematics")
- Each subject has exactly two fields: "summary_markdown" and "quiz"
- Friday is always "Weekly Review" covering all subjects from Mon–Thu`;

const QUIZ_RULES = `- quiz: array of 8 questions, each with:
    "question" — clear, age-appropriate wording
    "options"  — array of strings (see count below)
    "correct_answer" — must exactly match one option string
  OPTION LENGTH: all options in a question must be approximately the same length.
  The correct answer must NOT consistently be longer than the distractors.`;

function gradeContext(grade: number): string {
  const ages: Record<number, string> = { 2: '7-8', 3: '8-9', 4: '9-10', 5: '10-11', 6: '11-12' };
  return `Filipino Grade ${grade} learner (age ${ages[grade] ?? '?'})`;
}

function languageRule(grade: number): string {
  if (grade === 2) return 'English for English/Mathematics | Filipino for Filipino/GMRC/MAKABANSA';
  return 'English for English/Mathematics/Science/EPP | Filipino for Filipino/Araling Panlipunan/GMRC | MAPEH: Filipino instructions, English technical terms';
}

function summaryRule(grade: number): string {
  if (grade === 2)
    return `- summary_markdown: rich lesson note for a ${gradeContext(grade)}. Short bullet points, ≥2 concrete examples, key words in bold, encouraging tone. NO "Tomorrow's Sneak Peek".`;
  if (grade <= 4)
    return `- summary_markdown: well-structured lesson note for a ${gradeContext(grade)}. Organized bullets, ≥2 worked examples (step-by-step for Math/Science), key vocab in bold, confident peer-level tone. NO "Tomorrow's Sneak Peek".`;
  return `- summary_markdown: detailed lesson note for a ${gradeContext(grade)}. Structured bullets, ≥2 worked examples, key vocab in bold, academic tone. NO "Tomorrow's Sneak Peek".`;
}

function difficultyRule(grade: number): string {
  if (grade === 2) return '- Quiz difficulty: straightforward recall and simple application, Grade 2 appropriate. 3-4 options per question.';
  if (grade <= 4) return '- Quiz difficulty: Tier 1 recall through Tier 2 application. Include ≥1 higher-order question per 8. 4 options per question.';
  return '- Quiz difficulty: SSES subjects (English/Mathematics/Science) must have ≥3 of 8 questions requiring analytical thinking or multi-step reasoning. Other subjects: ≥1 higher-order per 8. 4 options per question.';
}

function weekNote(grade: number, schoolWeek: number, termLabel: string): string {
  if (grade === 2) return `Term ${termLabel}`;
  // G3-G6 use continuous week numbers
  return `Week ${schoolWeek} (${termLabel}).\n(Week number is CONTINUOUS for the whole school year — never restart at a new term.)`;
}

export function buildLeanPrompt(
  grade: number,
  schoolWeek: number,
  dateStr: string,
  topicsBlock: string
): string {
  const { label } = weekToTermInfo(schoolWeek);

  return [
    `You are a curriculum assistant for a ${gradeContext(grade)}.`,
    `Generate a weekly package JSON for the week of ${dateStr} — ${weekNote(grade, schoolWeek, label)}.`,
    '',
    SHARED_OUTPUT_RULES_BASE,
    summaryRule(grade),
    QUIZ_RULES,
    difficultyRule(grade),
    `GRADE: ${grade}`,
    `LANGUAGE: ${languageRule(grade)}`,
    '',
    'SUBJECTS AND TOPICS FOR THIS WEEK:',
    topicsBlock,
    '',
    'Generate the full JSON now.',
  ].join('\n');
}

/**
 * Assembles the topics block from a day schedule + BOW summary bullets.
 * Trims bullets to 2 per subject to keep token count low.
 */
export function buildTopicsBlock(
  daySchedule: DaySchedule,
  bowBySubject: Record<string, string>,
  maxBulletsPerSubject = 2
): string {
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday'];
  const lines: string[] = [];

  for (const day of DAYS) {
    const subjects = daySchedule[day] ?? [];
    if (subjects.length === 0) continue;
    lines.push(`${day}:`);
    for (const subject of subjects) {
      const rawBullets = bowBySubject[subject] ?? '';
      const bullets = rawBullets
        .split('\n')
        .filter(l => l.trim().startsWith('-'))
        .slice(0, maxBulletsPerSubject)
        .map(l => l.trim().replace(/^- /, ''));
      const summary = bullets.join('; ') || '(see BOW for this week)';
      lines.push(`- ${subject}: ${summary}`);
    }
    lines.push('');
  }

  lines.push('Friday:');
  lines.push('- Weekly Review: cover all subjects from Mon–Thu');

  return lines.join('\n').trim();
}

/** Rough token estimate (4 chars ≈ 1 token). */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
