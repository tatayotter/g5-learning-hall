// lib/bossPersonas.ts
// Static config for the Term Exam Boss Fight's "The Forgetting" personas —
// one per subject, same pattern as lib/subjectSchedule.ts. Keyed on subject
// name so grades sharing a subject (English, Mathematics, Filipino, Science,
// GMRC) share one persona instead of duplicating art/lore per grade.
//
// v1 scope is Grade 5 + Grade 2 only (locked design decision) — persona list
// per grade is derived from GRADE_5_SCHEDULE/GRADE_2_SCHEDULE in
// subjectSchedule.ts rather than hardcoded again here, so the two lists can
// never drift out of sync.
import { GRADE_5_SCHEDULE, GRADE_2_SCHEDULE } from './subjectSchedule';

// All personas use this placeholder until real art is generated — see
// project_term_boss_fight.md memory for the per-persona art prompts already
// written, ready to swap in later.
const PLACEHOLDER_ART = '/bosses/shadow-persona.webp';

export interface BossPersona {
  id: string;
  subject: string;
  name: string;
  loreShort: string;
  artUrl: string;
  // The "ghost color" bleeding through each persona's corruption, from the
  // original lore brainstorm — used as a radial glow behind the sprite so
  // each boss reads as its subject even with identical placeholder art.
  glowColor: string;
}

export const BOSS_PERSONAS: Record<string, BossPersona> = {
  'English': {
    id: 'silent_word', subject: 'English', name: 'The Silent Word',
    loreShort: 'A wraith stitched from unraveling sentences, its voice dissolving into static.',
    artUrl: '/bosses/silent-word.webp', glowColor: '#d4a94a', // parchment gold
  },
  'Mathematics': {
    id: 'the_null', subject: 'Mathematics', name: 'The Null',
    loreShort: 'A geometric void where numbers keep resetting to zero.',
    artUrl: '/bosses/the-null.webp', glowColor: '#4a90d4', // chalk blue
  },
  'Filipino': {
    id: 'ang_limot', subject: 'Filipino', name: 'Ang Limot',
    loreShort: 'A once-graceful spirit missing half its feathers, leaking blank paper scraps.',
    artUrl: '/bosses/ang-limot.webp', glowColor: '#e0c96a', // sampaguita white-gold
  },
  'Science': {
    id: 'entropya', subject: 'Science', name: 'Entropya',
    loreShort: 'A specimen-jar golem, half-crystallized, half-wilting.',
    artUrl: PLACEHOLDER_ART, glowColor: '#4ad48f', // lab green
  },
  'GMRC': {
    id: 'hollow_conscience', subject: 'GMRC', name: 'The Hollow Conscience',
    loreShort: 'A faceless shadow-mirror, trailing a half-second behind its own movement.',
    artUrl: PLACEHOLDER_ART, glowColor: '#9b7fd4', // soft violet
  },
  'Araling Panlipunan': {
    id: 'erased_map', subject: 'Araling Panlipunan', name: 'The Erased Map',
    loreShort: 'A cartographer-golem whose torn map keeps redrawing its own borders wrong.',
    artUrl: PLACEHOLDER_ART, glowColor: '#b5834a', // sepia brown
  },
  'Makabansa': {
    id: 'erased_map', subject: 'Makabansa', name: 'The Erased Map',
    loreShort: 'A cartographer-golem whose torn map keeps redrawing its own borders wrong.',
    artUrl: PLACEHOLDER_ART, glowColor: '#b5834a', // sepia brown
  },
  'EPP (ICT)': {
    id: 'corrupted_file', subject: 'EPP (ICT)', name: 'The Corrupted File',
    loreShort: 'A glitching pixel-block sprite, flickering between broken forms.',
    artUrl: PLACEHOLDER_ART, glowColor: '#4ad4d4', // cyan
  },
  'Computer': {
    id: 'corrupted_file', subject: 'Computer', name: 'The Corrupted File',
    loreShort: 'A glitching pixel-block sprite, flickering between broken forms.',
    artUrl: PLACEHOLDER_ART, glowColor: '#4ad4d4', // cyan
  },
  'EPP (AFA/FCS/IA)': {
    id: 'wilted_root', subject: 'EPP (AFA/FCS/IA)', name: 'The Wilted Root',
    loreShort: 'A garden-tool golem, roots browning at the tips.',
    artUrl: PLACEHOLDER_ART, glowColor: '#6a9c4a', // moss green
  },
  'MAPEH': {
    id: 'muted_muse', subject: 'MAPEH', name: 'The Muted Muse',
    loreShort: 'A harlequin-dancer built from broken instruments, frozen mid-beat.',
    artUrl: PLACEHOLDER_ART, glowColor: '#d46a8f', // coral pink
  },
};

export function getPersonasForGrade(grade: number): BossPersona[] {
  const schedule = grade === 2 ? GRADE_2_SCHEDULE : grade === 5 ? GRADE_5_SCHEDULE : null;
  if (!schedule) return [];
  return Object.keys(schedule)
    .map(subject => BOSS_PERSONAS[subject])
    .filter((p): p is BossPersona => !!p);
}

// v1 only supports these two grades — used by the entry point / mist overlay
// to no-op cleanly for any other grade rather than showing an empty section.
export function isBossFightGrade(grade: number): boolean {
  return grade === 2 || grade === 5;
}

// Opening-cutscene "seen" flag — one-time-per-term flourish, so a per-device
// localStorage flag is enough; it doesn't need to sync across devices or
// survive a cleared cache the way real progress (defeats, claims) does.
const CUTSCENE_SEEN_PREFIX = 'boss_cutscene_seen';

export function hasCutsceneBeenSeen(grade: number, term: number): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(`${CUTSCENE_SEEN_PREFIX}_g${grade}_t${term}`) === '1';
}

export function markCutsceneSeen(grade: number, term: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${CUTSCENE_SEEN_PREFIX}_g${grade}_t${term}`, '1');
}
