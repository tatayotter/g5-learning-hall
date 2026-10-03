// lib/intro/keeperEgg.ts
//
// Script + beat data for the Keeper's Egg (components/intro/KeeperEggSequence.tsx),
// the "come back tomorrow" sequence: after a player's first win, at the next
// calm moment on the Board, the Lorekeeper gives them an egg that hatches a
// random starter on their third check-in day. It also teaches how the real
// egg system works (level up, graduate, lay an egg) and ends on the daily
// checklist. Plan and rationale: docs/intro/sequence-roadmap.md.
//
// Same conventions as lib/intro/originStory.ts: each line's clip is
// voiceSrc(id) (ids start with "ke_"), missing clips fall back to reading
// time, `text` doubles as the ElevenLabs script (numbers as words), and every
// line stays a one-line object literal so tools/split_intro_vo.py can read it.
import type { Beat, VoiceLine } from '@/lib/intro/originStory';

// Taps to warm the egg in the first beat.
export const WARM_TAPS = 3;

// The art reuses finished intro scenes; a dedicated set can replace these later.
const HALL_ART = { src: '/intro/ledger_hall.webp', fallback: '/intro/ledger_hall.webp', focus: '50% 40%' };
const DAWN_ART = { src: '/intro/keepers_call.webp', fallback: '/intro/ledger_hall.webp' };
const GROW_ART = { src: '/intro/solarch_restored.webp', fallback: '/intro/ledger_hall.webp' };

export interface KeeperEggBeatsOptions {
  // Ask for push reminders (skipped when the device can't, or already has them).
  askReminders: boolean;
}

export function keeperEggBeats({ askReminders }: KeeperEggBeatsOptions): Beat[] {
  const beats: Beat[] = [
    {
      id: 'ke_gift',
      art: HALL_ART,
      lines: [
        { id: 'ke_gift_1', speaker: 'narrator', text: 'Well done today, Keeper. Before you go, the Ledger has a gift for you.' },
        { id: 'ke_gift_2', speaker: 'narrator', text: 'A Keeper\'s Egg. The Curio inside only wakes for a Keeper who keeps coming back. Tap it to keep it warm.' },
      ],
      interaction: { kind: 'warm' },
      after: [
        { id: 'ke_gift_3', speaker: 'narrator', text: 'Do you feel that? It moved!' },
      ],
    },
    {
      id: 'ke_days',
      art: DAWN_ART,
      lines: [
        { id: 'ke_days_1', speaker: 'narrator', text: 'Come back tomorrow, and the day after. On your third day, your egg will hatch into a new Curio.' },
        { id: 'ke_days_2', speaker: 'narrator', text: 'Busy one day? Don\'t worry. Your egg will wait for you, and it won\'t forget a single day you came.' },
      ],
      interaction: { kind: 'days' },
    },
  ];

  if (askReminders) {
    beats.push({
      id: 'ke_remind',
      art: DAWN_ART,
      lines: [
        { id: 'ke_remind_1', speaker: 'narrator', text: 'Want a reminder so your egg never gets lonely? Turn on reminders, and you\'ll get three hundred bonus gold too.' },
      ],
      interaction: { kind: 'remind' },
    });
  }

  beats.push(
    {
      id: 'ke_grow',
      art: GROW_ART,
      lines: [
        { id: 'ke_grow_1', speaker: 'narrator', text: 'Here\'s a secret. Some Curios can lay eggs of their own, once they grow strong enough.' },
        { id: 'ke_grow_2', speaker: 'narrator', text: 'Your Curio grows from every quest you finish, every battle you win, and every scroll you answer on the Training Map.' },
        { id: 'ke_grow_3', speaker: 'narrator', text: 'At level twenty, a Graduation Scroll lets it graduate into a stronger form.' },
        { id: 'ke_grow_4', speaker: 'narrator', text: 'Three levels later, a Curio that can lay eggs will be ready. That egg hatches after five days in a row. Tap each step.' },
      ],
      interaction: { kind: 'grow' },
    },
    {
      id: 'ke_daily',
      art: DAWN_ART,
      lines: [
        { id: 'ke_daily_1', speaker: 'narrator', text: 'One more thing. Every day you come back, finish your daily checklist. The more days in a row, the more gold you earn.' },
      ],
      interaction: { kind: 'tap', label: 'Show me today\'s checklist', cue: 'oathDone' },
    },
  );

  return beats;
}

// Played on a later day when the egg has grown but not hatched yet (day two
// of three). The hatch itself is the existing EggHatchModal ceremony.
export const RETURN_LINE: VoiceLine = { id: 'ke_back_1', speaker: 'narrator', text: 'You came back, Keeper! Your egg is wiggling. Just one more day.' };

// Played in EggHatchModal when the Keeper's Egg hatches (day three).
export const HATCH_LINE: VoiceLine = { id: 'ke_hatch_1', speaker: 'narrator', text: 'Your Keeper\'s Egg remembered every day you came back. Say hello to your new Curio!' };

// Every voiced line, in recording order (for the production doc's table).
export const ALL_KEEPER_EGG_LINES: VoiceLine[] = [
  ...keeperEggBeats({ askReminders: true }).flatMap(b => [...b.lines, ...(b.after ?? [])]),
  RETURN_LINE,
  HATCH_LINE,
];

// The return scene shows once per day.
const RETURN_SEEN_PREFIX = 'lh_keeper_egg_return_seen';
export function hasSeenReturnToday(userId: string, day: string): boolean {
  try { return localStorage.getItem(`${RETURN_SEEN_PREFIX}:${userId}`) === day; } catch { return true; }
}
export function markReturnSeen(userId: string, day: string) {
  try { localStorage.setItem(`${RETURN_SEEN_PREFIX}:${userId}`, day); } catch { /* storage unavailable: it may show again, harmless */ }
}
