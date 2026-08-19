import { supabase } from '@/lib/supabase';

export const CURRICULUM_GRADES = [2, 3, 4, 5, 6] as const;
export type CurriculumGrade = (typeof CURRICULUM_GRADES)[number];

/**
 * Subjects that carry Special Science Elementary School (SSES) enrichment —
 * confirmed from the actual budget_of_work data (every grade's English, Math,
 * and Science rows carry a "Special Science enrichment" note; every other
 * subject's rows say enrichment doesn't apply). Never claim SSES enrichment
 * for a subject outside this list — it isn't true and the data doesn't back it.
 */
export const SSES_SUBJECTS = ['English', 'Mathematics', 'Science'];

/** Canonical display order for a grade's subject list — DepEd's own rough sequencing (languages, math/science, values/social studies, then MAPEH/EPP/Computer). Unlisted subjects sort alphabetically after these. */
const SUBJECT_ORDER = [
  'English',
  'Filipino',
  'Mathematics',
  'Science',
  'Araling Panlipunan',
  'Makabansa',
  'GMRC',
  'MAPEH',
  'EPP (ICT)',
  'EPP (AFA/FCS/IA)',
  'Computer',
];

export type BudgetOfWorkEntry = {
  subject: string;
  content_markdown: string;
  source_file: string | null;
};

export async function getBudgetOfWork(grade: CurriculumGrade): Promise<BudgetOfWorkEntry[]> {
  const { data, error } = await supabase
    .from('budget_of_work')
    .select('subject, content_markdown, source_file')
    .eq('grade', grade);
  if (error || !data) return [];
  return [...data].sort((a, b) => {
    const ai = SUBJECT_ORDER.indexOf(a.subject);
    const bi = SUBJECT_ORDER.indexOf(b.subject);
    if (ai === -1 && bi === -1) return a.subject.localeCompare(b.subject);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

/** Unique, real source URLs cited across a grade's budget_of_work rows, for outbound citation. */
export function getCitedSources(entries: BudgetOfWorkEntry[]): string[] {
  const urls = new Set<string>();
  for (const entry of entries) {
    if (!entry.source_file) continue;
    // source_file sometimes has "url (note)" — take just the URL part.
    const match = entry.source_file.match(/https?:\/\/\S+\.pdf/);
    if (match) urls.add(match[0]);
  }
  return Array.from(urls);
}
