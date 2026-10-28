// lib/npcTalk.ts
// Talking town people (Rowil 2026-10-28): every town person, and the Recycler on the wild maps,
// says a prewritten line that fits the kid right now. No live AI: lines live in
// lib/npcLines.ts, each with the facts it needs (quest done, night, rain in Tidewrit, wood in
// the bag...). The picker takes the most fitting lines, skips ones this kid saw in the last 7
// days (kept on the device), and fills in the kid's first name on the device.
// The Knight Commander also chats with his squad and the guards (CHATTER), two lines at a time.
import { CHATTER, LINES, type Exchange, type Line } from '@/lib/npcLines';

/** A bubble over an NPC: `key` changes with each new line; `wave` = their first hello today (a little hop). */
export interface NpcSay { text: string; wave?: boolean; key: number }

/** Facts about the kid right now, e.g. 'quest_done', 'night', 'rain:tidewrit_shallows'. */
export type TalkFacts = Set<string>;

const SEEN_KEY = 'lh_npc_seen_v1';
const GREETED_KEY = 'lh_npc_greeted_v1';
const NO_REPEAT_DAYS = 7;

// Manila day number (the game's day everywhere else too).
export function talkDay(now = Date.now()): number {
  return Math.floor((now / 3600_000 + 8) / 24);
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function writeJson(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode: lines may repeat */ }
}

function hash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

const fits = (when: string[] | undefined, facts: TalkFacts) =>
  !when || when.every(w => (w.startsWith('!') ? !facts.has(w.slice(1)) : facts.has(w)));
// A line's weight: one that needs more facts fits the moment better.
const score = (when: string[] | undefined) => (when ?? []).filter(w => !w.startsWith('!')).length;

/** Picks from `pool` the best-fitting entry not seen lately (every one seen: any of them). */
function pickFrom<T extends { when?: string[] }>(pool: T[], facts: TalkFacts, idOf: (e: T) => string, rand: () => number): T | null {
  const ok = pool.filter(e => fits(e.when, facts));
  if (!ok.length) return null;
  const seen = readJson<Record<string, number>>(SEEN_KEY, {});
  const today = talkDay();
  const fresh = ok.filter(e => !(today - (seen[idOf(e)] ?? -99) < NO_REPEAT_DAYS));
  const from = fresh.length ? fresh : ok;
  // Mostly the best-fitting ones; now and then any line that fits, so it doesn't feel scripted.
  const best = Math.max(...from.map(e => score(e.when)));
  const top = rand() < 0.75 ? from.filter(e => score(e.when) === best) : from;
  const pick = top[Math.floor(rand() * top.length)];
  // Forget lines older than the no-repeat window so the record stays small.
  for (const k of Object.keys(seen)) if (today - seen[k] >= NO_REPEAT_DAYS) delete seen[k];
  seen[idOf(pick)] = today;
  writeJson(SEEN_KEY, seen);
  return pick;
}

const fill = (text: string, name: string) => text.replace(/\{name\}/g, name || 'friend');

/** Which bank an NPC speaks from: the squad shares one, everyone else has their own. */
export function speakerOf(npcId: string): string {
  return /^squad_\d+$/.test(npcId) ? 'squad' : npcId;
}

/** Whether this NPC has lines to say. */
export function canTalk(npcId: string): boolean {
  return !!LINES[speakerOf(npcId)]?.length;
}

/** A line for this NPC, or null when none fits. */
export function pickLine(npcId: string, facts: TalkFacts, name: string, rand = Math.random): string | null {
  const bank: Line[] | undefined = LINES[speakerOf(npcId)];
  if (!bank) return null;
  const line = pickFrom(bank, facts, l => `${speakerOf(npcId)}:${hash(l.say)}`, rand);
  return line ? fill(line.say, name) : null;
}

/** Two lines between the Knight Commander and one of his soldiers. `with` is who's around:
 *  'squad' at a stop, or a guard's id when he's in earshot. */
export function pickExchange(withId: string, facts: TalkFacts, name: string, rand = Math.random): Exchange | null {
  const who = speakerOf(withId);
  const pool = CHATTER.filter(e => e.with === who);
  const ex = pickFrom(pool, facts, e => `chat:${hash(e.lines.map(l => l[1]).join('|'))}`, rand);
  return ex ? { ...ex, lines: ex.lines.map(([s, t]) => [s, fill(t, name)] as [typeof s, string]) } : null;
}

/** True the first time today this NPC greets the kid (they wave or nod with it); marks it done. */
export function firstGreetToday(npcId: string): boolean {
  const today = talkDay();
  const g = readJson<{ day: number; ids: string[] }>(GREETED_KEY, { day: today, ids: [] });
  const ids = g.day === today ? g.ids : [];
  if (ids.includes(npcId)) return false;
  writeJson(GREETED_KEY, { day: today, ids: [...ids, npcId] });
  return true;
}

/** How long a bubble stays up: longer lines get longer to read. */
export function bubbleMs(text: string): number {
  return Math.min(7000, 2600 + text.length * 55);
}

const LAST_WILD_KEY = 'lh_last_wild_map_v1';
/** Remembers the wild map the kid is on, so town people can ask about it later. */
export function noteWildMap(regionId: string) {
  writeJson(LAST_WILD_KEY, { regionId, at: Date.now() });
}
/** The wild map the kid just came from (within the last 30 minutes), or null. */
export function cameFrom(): string | null {
  const v = readJson<{ regionId: string; at: number } | null>(LAST_WILD_KEY, null);
  return v && Date.now() - v.at < 30 * 60_000 ? v.regionId : null;
}
