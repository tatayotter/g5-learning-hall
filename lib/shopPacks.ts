// Shared types + presentation content for the Student Enrichment Content
// (SEC) Shop — split out of app/parent-dashboard/shop/page.tsx so both the
// catalog page and the per-product detail page
// (app/parent-dashboard/shop/[packId]/page.tsx) read from the same source
// instead of drifting. See docs/sec-shop-design.md for the shop's design.
import { MTAP_GRADE2_STRANDS, MTAP_GRADE3_STRANDS, MTAP_GRADE4_STRANDS, MTAP_GRADE5_STRANDS, MTAP_GRADE6_STRANDS } from '@/lib/mtapContent';

export interface ChildRow {
  id: string;
  full_name: string;
  grade: string;
}

export interface SecPack {
  id: string;
  grade: number;
  category: string;
  title: string;
  description: string;
  price_php: number;
}

export interface EntitlementRow {
  child_id: string;
  pack_id: string;
  status: 'pending' | 'active';
}

// Marketing/structural detail per pack, keyed by pack id — separate from
// sec_packs' own DB columns since this is presentation content (benefit
// copy, real question/topic counts, the strand preview list), not catalog
// data an admin edits. A future Grade 3-6 pack adds its own entry here once
// its content module (lib/mtapGradeNContent.ts or similar) exists — same
// per-grade-lookup pattern MySecPackReviewer.tsx and BonusQuestsTab.tsx
// already use for strand data, just extended to cover the Shop's own copy.
// Note there's no hero-image/color field here — that's derived straight from
// the pack's own `grade`/`category` columns below, so a future pack gets a
// correctly-branded hero automatically, even before anyone's written its copy.
export const PACK_DETAILS: Record<string, {
  eyebrow: string;
  shortName: string; // the punchy headline name, distinct from sec_packs.title's formal one
  hook: string; // the one-line positioning claim — competition-level, optional, not remedial
  subhook: string; // the empowerment/permission line right under it — "they're already studying, see how far that goes"
  benefits: { icon: string; text: string }[];
  strands: { name: string; topics: number }[];
  questionCount: number;
}> = {
  'g2-math-enrichment': {
    eyebrow: 'MTAP Competition-Level',
    shortName: 'Grade 2 Math+',
    hook: 'Not required for school. Just how far your child could go if you let them.',
    subhook: 'They\'re already putting in the work — this is where that effort gets tested against real competition-level math, not just the regular curriculum.',
    benefits: [
      { icon: '🏆', text: 'True MTAP competition level — well beyond standard school-level math' },
      { icon: '📖', text: 'Untimed reviewer — they learn the method before ever facing the timer' },
      { icon: '🪙', text: 'Real Gold & XP, same as their regular quests' },
    ],
    strands: MTAP_GRADE2_STRANDS.map((s) => ({ name: s.name, topics: s.archetypes.length })),
    questionCount: 518,
  },
  'g3-math-enrichment': {
    eyebrow: 'MTAP Competition-Level',
    shortName: 'Grade 3 Math+',
    hook: 'Not required for school. Just how far your child could go if you let them.',
    subhook: 'They\'re already putting in the work — this is where that effort gets tested against real competition-level math, not just the regular curriculum.',
    benefits: [
      { icon: '🏆', text: 'True MTAP competition level — well beyond standard school-level math' },
      { icon: '📖', text: 'Untimed reviewer — they learn the method before ever facing the timer' },
      { icon: '🪙', text: 'Real Gold & XP, same as their regular quests' },
    ],
    strands: MTAP_GRADE3_STRANDS.map((s) => ({ name: s.name, topics: s.archetypes.length })),
    questionCount: 534,
  },
  'g4-math-enrichment': {
    eyebrow: 'MTAP Competition-Level',
    shortName: 'Grade 4 Math+',
    hook: 'Not required for school. Just how far your child could go if you let them.',
    subhook: 'They\'re already putting in the work — this is where that effort gets tested against real competition-level math, not just the regular curriculum.',
    benefits: [
      { icon: '🏆', text: 'True MTAP competition level — well beyond standard school-level math' },
      { icon: '📖', text: 'Untimed reviewer — they learn the method before ever facing the timer' },
      { icon: '🪙', text: 'Real Gold & XP, same as their regular quests' },
    ],
    strands: MTAP_GRADE4_STRANDS.map((s) => ({ name: s.name, topics: s.archetypes.length })),
    questionCount: 528,
  },
  'g5-math-enrichment': {
    eyebrow: 'MTAP Competition-Level',
    shortName: 'Grade 5 Math+',
    hook: 'Not required for school. Just how far your child could go if you let them.',
    subhook: 'They\'re already putting in the work — this is where that effort gets tested against real competition-level math, not just the regular curriculum.',
    benefits: [
      { icon: '🏆', text: 'True MTAP competition level — well beyond standard school-level math' },
      { icon: '📖', text: 'Untimed reviewer — they learn the method before ever facing the timer' },
      { icon: '🪙', text: 'Real Gold & XP, same as their regular quests' },
    ],
    strands: MTAP_GRADE5_STRANDS.map((s) => ({ name: s.name, topics: s.archetypes.length })),
    questionCount: 560,
  },
  'g6-math-enrichment': {
    eyebrow: 'MTAP Competition-Level',
    shortName: 'Grade 6 Math+',
    hook: 'Not required for school. Just how far your child could go if you let them.',
    subhook: 'They\'re already putting in the work — this is where that effort gets tested against real competition-level math, not just the regular curriculum.',
    benefits: [
      { icon: '🏆', text: 'True MTAP competition level — well beyond standard school-level math' },
      { icon: '📖', text: 'Untimed reviewer — they learn the method before ever facing the timer' },
      { icon: '🪙', text: 'Real Gold & XP, same as their regular quests' },
    ],
    strands: MTAP_GRADE6_STRANDS.map((s) => ({ name: s.name, topics: s.archetypes.length })),
    questionCount: 609,
  },
};

// Hero band is a two-color gradient, not a photo — color 1 keys off grade
// (a light-to-deep progression so higher grades read as "more advanced"),
// color 2 keys off category and reuses WeeklyLessonsPanel.tsx's own
// SUBJECT_COLOR hue for Mathematics (violet) so the same subject reads the
// same color everywhere in the app, not a clashing one-off here. Both are
// real DB columns (sec_packs.grade/category), so this renders correctly for
// any future pack the day it's created — no per-pack art or copy needed.
// Grade -> color itself lives in lib/gradeColors.ts, shared with
// BonusQuestsTab.tsx's pack card hero so the two never drift out of sync.
export const CATEGORY_GRADIENT_COLOR: Record<string, string> = {
  math_enrichment: '#8b5cf6', // violet-500 — matches SUBJECT_COLOR's Mathematics hue in WeeklyLessonsPanel.tsx
};
export const CATEGORY_ICON: Record<string, string> = {
  math_enrichment: '🧮',
};
export const DEFAULT_GRADIENT_COLOR = '#94a3b8'; // slate-400 — an unmapped category still renders a real gradient, just a neutral one
export const DEFAULT_ICON = '📚';

// Human-readable label for a category filter pill — only math_enrichment
// exists today, but english/science/history/etc. packs will land in
// sec_packs.category the same way math did, so the catalog's filter row
// (app/parent-dashboard/shop/page.tsx) builds its pills from whatever
// categories are actually present in the loaded packs rather than a
// hardcoded list. This map just makes the known ones read nicely; an
// unmapped future category still gets a readable pill via humanizeCategory
// below instead of showing raw_snake_case.
export const CATEGORY_LABEL: Record<string, string> = {
  math_enrichment: 'Math',
};

export function humanizeCategory(category: string): string {
  return CATEGORY_LABEL[category] ?? category.replace(/_enrichment$/, '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
