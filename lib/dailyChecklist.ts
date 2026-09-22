import { supabase } from './supabase';

export type GuildKey = 'lorekeeper' | 'spellcaster' | 'number_realm' | 'logic_labyrinth' | 'lexicon_arena';

// ─── WORLD MYTH (internal reference — not shown to players verbatim) ────────
// The world is held together by a single, endless Ledger: a living record
// that remembers every story, word, number, path, and meaning. It doesn't
// sit in one place — it lives scattered, folded into small sleeping
// creatures called curios, each one a fragment of the Ledger given breath.
// A curio's element is which *kind* of memory it carries.
//
// The Forgetting isn't a monster; it's an absence — the natural drift by
// which unused knowledge fades and unpracticed skill dulls. It has no army;
// it simply un-writes. Left alone, the Ledger's fragments go quiet and a
// guild's domain blurs back to blank.
//
// The five guilds below are watch-posts built where the Ledger runs
// thinnest. Every Trainer (the player) is a keeper-in-training holding the
// Forgetting back the only way that's ever worked: doing the remembering
// themselves. XP is the Ledger visibly thickening; guild level is a
// watch-post's strength against the Forgetting; gold is the world's
// gratitude, spent to keep curios fed. Every lore/flavor string in this
// codebase should trace back to this same premise.
export const GUILDS: { key: GuildKey; label: string; lore: string }[] = [
  { key: 'logic_labyrinth', label: 'Logic Labyrinth', lore: 'Wayfinder of the Endless Maze — a corridor the Forgetting keeps trying to tangle back into nonsense. Its walls rearrange for those who reason their way through.' },
  { key: 'lexicon_arena', label: 'Lexicon Arena', lore: 'Champion of the Living Dictionary — the Ledger\'s own vocabulary, kept awake one claimed word at a time. Every definition claimed adds a word to your legend.' },
  { key: 'number_realm', label: 'Number Realm', lore: 'Warden of the Shifting Equations — a fragment of the Ledger holding its shape by sheer solved arithmetic. The Realm only stands while its numbers stay solved.' },
  { key: 'spellcaster', label: 'SpellCaster', lore: 'Word-Weaver of the Spelling Spire — its wards are woven from the Ledger itself. Each letter cast true strengthens the wards that guard the Lexicon.' },
  { key: 'lorekeeper', label: 'Lorekeeper', lore: 'Keeper of the Old Stories — a watch-post where the Ledger of memory runs thinnest. Every passage you master seals a page against the Forgetting.' },
];

export interface ChecklistBattleFlags {
  last_wild_encounter_win: string | null;
  guilds_played_today: GuildKey[];
}

// `today` is a display-only date (lib/appDay.ts's manilaToday()) — this only decides what the
// checklist UI shows as done. The server is authoritative for the actual bonus grant
// (claim_daily_checklist_bonus derives its own day and reads guild_sessions itself), so a
// stale/mismatched `today` here can't cause a wrongful claim, only a cosmetic display lag.
//
// Guild plays come from guild_sessions (one row per user/guild/day) rather than the legacy
// user_battle_state.guild_last_played JSON, which claim_daily_checklist_bonus no longer reads.
export async function fetchChecklistBattleFlags(userId: string, today: string): Promise<ChecklistBattleFlags> {
  const [battleRes, guildRes] = await Promise.all([
    supabase
      .from('user_battle_state')
      .select('last_wild_encounter_win')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('guild_sessions')
      .select('guild_key')
      .eq('user_id', userId)
      .eq('played_on', today),
  ]);

  return {
    last_wild_encounter_win: battleRes.data?.last_wild_encounter_win ?? null,
    guilds_played_today: ((guildRes.data as { guild_key: GuildKey }[] | null) ?? []).map(row => row.guild_key),
  };
}

// markGuildSessionToday moved to lib/guildSessions.ts — it now retries and queues on
// failure instead of firing-and-forgetting, so it needed its own module.

export function isQuestDayDone(
  dayName: string,
  packageData: any,
  masteredQuizzes: string[]
): boolean {
  const subjects = Object.keys(packageData?.[dayName] || {});
  if (subjects.length === 0) return true; // no quest scheduled today (e.g. weekend)
  return subjects.every(subject => masteredQuizzes.includes(`${dayName}_${subject}`));
}

export async function hasClaimedChecklistBonus(userId: string, today: string): Promise<boolean> {
  const { data } = await supabase
    .from('daily_checklist_claims')
    .select('claim_date')
    .eq('app_user_id', userId)
    .eq('claim_date', today)
    .maybeSingle();
  return !!data;
}

// Ladder mirrored from the daily_checklist_gold_for_streak SQL function —
// duplicated here only so the UI can render the always-visible streak
// ladder (lib/dailyChecklist.ts callers show this even before claiming)
// without a round-trip; the actual gold grant is always computed and
// enforced server-side in claim_daily_checklist_bonus, never trusted from
// here.
export const STREAK_GOLD_LADDER = [50, 60, 70, 80, 90];
export function goldForStreak(streak: number): number {
  const capped = Math.min(Math.max(streak, 1), STREAK_GOLD_LADDER.length);
  return STREAK_GOLD_LADDER[capped - 1];
}

export interface ChecklistStreakInfo {
  claimedToday: boolean;
  currentStreak: number;
  nextStreak: number;
  todayGold: number | null;
  nextGold: number;
}

// Preview of the streak ladder — how many consecutive days the player is
// on, and what claiming today would earn — so the To-Dos panel can show
// this before the claim button is even pressed.
export async function fetchDailyChecklistStreak(userId: string, today: string): Promise<ChecklistStreakInfo> {
  const { data, error } = await supabase.rpc('get_daily_checklist_streak', {
    p_user_id: userId,
    p_today: today,
  });

  if (error || !data) {
    return { claimedToday: false, currentStreak: 0, nextStreak: 1, todayGold: null, nextGold: STREAK_GOLD_LADDER[0] };
  }
  return {
    claimedToday: !!data.claimedToday,
    currentStreak: data.currentStreak ?? 0,
    nextStreak: data.nextStreak ?? 1,
    todayGold: data.todayGold ?? null,
    nextGold: data.nextGold ?? STREAK_GOLD_LADDER[0],
  };
}

export interface ChecklistClaimResult {
  granted: boolean;
  streak?: number;
  gold?: number;
}

// The server derives today's date, the weekday and the player's grade itself (from their own
// journal row for the current content week) — see claim_daily_checklist_bonus. The only thing
// the client identifies is who is claiming.
export async function claimChecklistBonus(userId: string): Promise<ChecklistClaimResult> {
  const { data, error } = await supabase.rpc('claim_daily_checklist_bonus', {
    p_user_id: userId,
  });

  if (error) {
    console.error('Failed to claim daily checklist bonus:', error);
    return { granted: false };
  }
  return { granted: !!data?.granted, streak: data?.streak, gold: data?.gold };
}
