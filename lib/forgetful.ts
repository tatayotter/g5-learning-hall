// lib/forgetful.ts
// The Forgetful on the map (docs/lore: the cult who believe forgetting is good). Now and then one
// of their grey-robed followers turns up on a wild map or in Ledger's Heart (never in town or the
// Hideout) and tries to talk the kid into forgetting a question they got wrong before:
//   "Forget it"     -> 2 gold, and the question simply comes back some other day.
//   "I'll remember!" -> the kid tries that question again: right = 10 gold + 15 EXP,
//                       wrong = a kind word, no penalty.
// Either way the Forgetful runs off to the nearest map edge and is gone (lib/phaserMap/guildNpcs.ts
// flee). Rewards are paid by the meet_forgetful RPC (at most 2 paid meetings a day); behind the
// 'forgetful' feature switch.
import type { TownNpc } from '@/lib/townNpcs';
import { HIDEOUT_REGION } from '@/lib/hideoutConfig';
import { manilaToday } from '@/lib/appDay';
import { supabase } from '@/lib/supabase';
import type { BattleQuestion } from '@/components/battle/shared';

export const FORGETFUL_ID = 'forgetful';
/** Same numbers as meet_forgetful (supabase/migrations/20261101050000_forgetful_on_the_map.sql). */
export const FORGETFUL_REWARDS = { forget: 2, rememberGold: 10, rememberXp: 15 };
export const FORGETFUL_PER_DAY = 2;
/** Chance a visit to an allowed map has one (when today's meetings aren't used up). */
const VISIT_CHANCE = 1 / 3;

// Sheets built by /mnt/project-files/story/forgetful-npc/build_forgetful.py from Rowil's art:
// 25 walk frames facing right, then the front idle pose.
const SHEETS = {
  male: { sheet: '/npcs/walk/forgetful_male_right.webp', frameW: 65, frameH: 116 },
  female: { sheet: '/npcs/walk/forgetful_female_right.webp', frameW: 61, frameH: 116 },
} as const;

export function forgetfulAllowedOn(regionId: string): boolean {
  return regionId !== 'town' && regionId !== HIDEOUT_REGION;
}

const seenKey = (userId: string) => `lh_forgetful_${userId}`;

/** How many Forgetful showed up for this kid today on this device. */
function shownToday(userId: string): number {
  try {
    const raw = JSON.parse(localStorage.getItem(seenKey(userId)) ?? 'null');
    return raw?.day === manilaToday() ? Number(raw.n) || 0 : 0;
  } catch { return 0; }
}

function markShown(userId: string) {
  try { localStorage.setItem(seenKey(userId), JSON.stringify({ day: manilaToday(), n: shownToday(userId) + 1 })); } catch { /* best-effort */ }
}

/**
 * Rolls for a Forgetful on this map visit and, on a hit, picks where they stand: an open tile the
 * kid can walk to, 6 to 14 steps from where the kid starts (so they're seen walking about, not
 * on top of the kid). Null when none comes this time.
 */
export function rollForgetful(
  userId: string, layout: { type: string }[][], start: { x: number; y: number }, rand: () => number = Math.random,
): TownNpc | null {
  if (shownToday(userId) >= FORGETFUL_PER_DAY || rand() >= VISIT_CHANCE) return null;
  const h = layout.length, w = layout[0]?.length ?? 0;
  const open = (x: number, y: number) => x > 0 && y > 0 && x < w - 1 && y < h - 1 && layout[y][x].type !== 'wall';
  if (!open(start.x, start.y)) return null;
  const dist = new Int32Array(w * h).fill(-1);
  dist[start.y * w + start.x] = 0;
  const queue = [start.y * w + start.x];
  const spots: number[] = [];
  for (let qi = 0; qi < queue.length; qi++) {
    const i = queue[qi];
    const x = i % w, y = (i - x) / w;
    const d = dist[i];
    if (d >= 6 && d <= 14) spots.push(i);
    if (d >= 14) continue;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (!open(nx, ny) || dist[ny * w + nx] >= 0) continue;
      dist[ny * w + nx] = d + 1;
      queue.push(ny * w + nx);
    }
  }
  if (!spots.length) return null;
  const at = spots[Math.floor(rand() * spots.length)];
  markShown(userId);
  const look = rand() < 0.5 ? SHEETS.male : SHEETS.female;
  return { id: FORGETFUL_ID, name: 'The Forgetful', ...look, home: { x: at % w, y: Math.floor(at / w) }, range: 3 };
}

// What they say. Kid-friendly: they're wrong, not scary.
const HELLO = [
  'Psst! Over here...',
  'Hello, little Keeper...',
  'Shh... come closer.',
  'Why remember? Forgetting is easy!',
];
const PITCH = [
  'Remember that question you got wrong? Why keep it? Just forget it! A blank page is never wrong.',
  "That tricky question still bugs you, right? Let it go. Forget it, and it can't bug you anymore!",
  'Mistakes are heavy. Forgetting is light! Forget that wrong answer and I will even give you gold.',
  'Why try again? Forget it! Nobody needs to remember everything.',
];

export function forgetfulHello(rand: () => number = Math.random) { return HELLO[Math.floor(rand() * HELLO.length)]; }
export function forgetfulPitch(rand: () => number = Math.random) { return PITCH[Math.floor(rand() * PITCH.length)]; }

/**
 * A question the kid got wrong before (their latest try at it was wrong), for "I'll remember!".
 * Falls back to one of this week's questions when they have no misses (or we can't reach them).
 */
export async function fetchMissedQuestion(userId: string, fallback: BattleQuestion[]): Promise<BattleQuestion | null> {
  const pickFallback = () => fallback.length ? fallback[Math.floor(Math.random() * fallback.length)] : null;
  try {
    const { data, error } = await supabase
      .from('player_question_attempts')
      .select('content_question_id')
      .eq('user_id', userId)
      .eq('correct', false)
      .order('answered_at', { ascending: false })
      .limit(30);
    if (error || !data?.length) return pickFallback();
    const ids = data.map(r => r.content_question_id as string);
    const { data: rows, error: qErr } = await supabase
      .from('content_questions_public')
      .select('id, prompt, options, subject')
      .in('id', ids);
    if (qErr || !rows?.length) return pickFallback();
    const row = rows[Math.floor(Math.random() * rows.length)] as { id: string; prompt: string; options: string[]; subject: string };
    return { id: row.id, question: row.prompt, options: row.options, subject: row.subject };
  } catch {
    return pickFallback();
  }
}

export interface ForgetfulResult {
  status: 'forgot' | 'remembered' | 'wrong' | 'tired';
  correct: boolean | null;
  correct_answer: string | null;
  gold: number;
  xp: number;
  progress?: { gold: number; xp: number; level: number } | null;
}

/** Pays (or not) for one meeting. `entryId` makes a retried call count once. */
export async function meetForgetful(
  userId: string, entryId: string, region: string, choice: 'forget' | 'remember', question?: { id: string; selected: string },
): Promise<ForgetfulResult> {
  const { data, error } = await supabase.rpc('meet_forgetful', {
    p_user_id: userId,
    p_entry_id: entryId,
    p_region: region,
    p_choice: choice,
    p_question_id: question?.id ?? null,
    p_selected: question?.selected ?? null,
  });
  if (error || !data) throw error ?? new Error('no result');
  return data as ForgetfulResult;
}
