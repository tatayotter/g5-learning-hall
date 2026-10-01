// lib/bossPersonas.ts
// Static config for the Term Exam Boss Fight's "The Forgetting" personas —
// one per subject, same pattern as lib/subjectSchedule.ts. Keyed on subject
// name so grades sharing a subject (English, Mathematics, Filipino, Science,
// GMRC) share one persona instead of duplicating art/lore per grade.
//
// Every grade 2-6 has a roster: the persona list per grade is derived from
// that grade's schedule in subjectSchedule.ts rather than hardcoded again
// here, so the two lists can never drift out of sync.
import { getScheduleForGrade } from './subjectSchedule';


// Persona art lives in public/bosses/ and faces right; the battle stage mirrors
// it to face the player's Curio.
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
  // Hovers on the battle stage (bobbing, no feet on the platform) vs. stands.
  floats: boolean;
  // Kid-facing: what this shadow tries to make you forget, and what fighting
  // it reviews (its questions come from every lesson of the subject this term).
  // Shown in the Term Boss intro's shadow reveal.
  attacks: string;
  reviews: string;
}

export const BOSS_PERSONAS: Record<string, BossPersona> = {
  'English': {
    id: 'silent_word', subject: 'English', name: 'The Silent Word',
    loreShort: 'A wraith stitched from unraveling sentences, its voice dissolving into static.',
    artUrl: '/bosses/silent-word.webp', floats: true, glowColor: '#d4a94a', // parchment gold
    attacks: "Your words: reading, spelling, grammar and the stories you've read.",
    reviews: "Everything from this term's English lessons: reading, vocabulary, grammar and writing.",
  },
  'Mathematics': {
    id: 'the_null', subject: 'Mathematics', name: 'The Null',
    loreShort: 'A geometric void where numbers keep resetting to zero.',
    artUrl: '/bosses/the-null.webp', floats: true, glowColor: '#4a90d4', // chalk blue
    attacks: "Your numbers: counting, operations, shapes and measuring.",
    reviews: "Everything from this term's Mathematics lessons: numbers, operations, problem solving and measurement.",
  },
  'Filipino': {
    id: 'ang_limot', subject: 'Filipino', name: 'Ang Limot',
    loreShort: 'A once-graceful spirit missing half its feathers, leaking blank paper scraps.',
    artUrl: '/bosses/ang-limot.webp', floats: true, glowColor: '#e0c96a', // sampaguita white-gold
    attacks: "The words and stories of your own language.",
    reviews: "Everything from this term's Filipino lessons: reading, vocabulary, grammar and writing in Filipino.",
  },
  'Science': {
    id: 'entropya', subject: 'Science', name: 'Entropya',
    loreShort: 'A specimen-jar golem, half-crystallized, half-wilting.',
    artUrl: '/bosses/entropya.webp', floats: false, glowColor: '#4ad48f', // lab green
    attacks: "How you understand the world: living things, matter, energy and the Earth.",
    reviews: "Everything from this term's Science lessons: observing, experimenting and explaining how things work.",
  },
  'GMRC': {
    id: 'hollow_conscience', subject: 'GMRC', name: 'The Hollow Conscience',
    loreShort: 'A faceless shadow-mirror, trailing a half-second behind its own movement.',
    artUrl: '/bosses/hollow-conscience.webp', floats: true, glowColor: '#9b7fd4', // soft violet
    attacks: "Your good heart: kindness, honesty, respect and responsibility.",
    reviews: "Everything from this term's GMRC lessons on good manners and right conduct.",
  },
  'Araling Panlipunan': {
    id: 'erased_map', subject: 'Araling Panlipunan', name: 'The Erased Map',
    loreShort: 'A cartographer-golem whose torn map keeps redrawing its own borders wrong.',
    artUrl: '/bosses/erased-map.webp', floats: false, glowColor: '#b5834a', // sepia brown
    attacks: "Your country's places, people, history and culture.",
    reviews: "Everything from this term's Araling Panlipunan lessons.",
  },
  'Makabansa': {
    id: 'erased_map', subject: 'Makabansa', name: 'The Erased Map',
    loreShort: 'A cartographer-golem whose torn map keeps redrawing its own borders wrong.',
    artUrl: '/bosses/erased-map.webp', floats: false, glowColor: '#b5834a', // sepia brown
    attacks: "Your community, your country and the people who make it.",
    reviews: "Everything from this term's Makabansa lessons.",
  },
  'EPP (ICT)': {
    id: 'corrupted_file', subject: 'EPP (ICT)', name: 'The Corrupted File',
    loreShort: 'A glitching pixel-block sprite, flickering between broken forms.',
    artUrl: '/bosses/corrupted-file.webp', floats: true, glowColor: '#4ad4d4', // cyan
    attacks: "Your computer skills: files, tools and staying safe online.",
    reviews: "Everything from this term's EPP ICT lessons.",
  },
  'Computer': {
    id: 'corrupted_file', subject: 'Computer', name: 'The Corrupted File',
    loreShort: 'A glitching pixel-block sprite, flickering between broken forms.',
    artUrl: '/bosses/corrupted-file.webp', floats: true, glowColor: '#4ad4d4', // cyan
    attacks: "Your computer skills: files, tools and staying safe online.",
    reviews: "Everything from this term's Computer lessons.",
  },
  'EPP (AFA/FCS/IA)': {
    id: 'wilted_root', subject: 'EPP (AFA/FCS/IA)', name: 'The Wilted Root',
    loreShort: 'A garden-tool golem, roots browning at the tips.',
    artUrl: '/bosses/wilted-root.webp', floats: false, glowColor: '#6a9c4a', // moss green
    attacks: "Your hands-on skills: growing plants, caring for the home and making things.",
    reviews: "Everything from this term's EPP lessons in agriculture, home economics and industrial arts.",
  },
  'MAPEH': {
    id: 'muted_muse', subject: 'MAPEH', name: 'The Muted Muse',
    loreShort: 'A harlequin-dancer built from broken instruments, frozen mid-beat.',
    artUrl: '/bosses/muted-muse.webp', floats: true, glowColor: '#d46a8f', // coral pink
    attacks: "Your music, art, movement and healthy habits.",
    reviews: "Everything from this term's MAPEH lessons: music, arts, P.E. and health.",
  },
};

// `poolCounts` (fetchBossPoolCounts for the current term) drops subjects with
// no questions this term — e.g. Grade 6 has no EPP (ICT) lessons in Term 2 —
// so the roster never shows a shadow that can't be fought. Mirrors how
// claim_boss_gauntlet_reward counts the shadows needed for the sealed Curio.
// Before the counts load (empty object) the full schedule list is returned.
export function getPersonasForGrade(grade: number, poolCounts?: Record<string, number>): BossPersona[] {
  const schedule = getScheduleForGrade(grade);
  if (!schedule) return [];
  const counted = !!poolCounts && Object.keys(poolCounts).length > 0;
  return Object.keys(schedule)
    .filter(subject => !counted || (poolCounts![subject] ?? 0) > 0)
    .map(subject => BOSS_PERSONAS[subject])
    .filter((p): p is BossPersona => !!p);
}

// Used by the entry point / mist overlay to no-op cleanly for a grade with
// no roster rather than showing an empty section.
export function isBossFightGrade(grade: number): boolean {
  return getPersonasForGrade(grade).length > 0;
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
