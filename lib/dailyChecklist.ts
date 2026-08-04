import { supabase } from './supabase';
import { isOfflineStorageAvailable, markGuildSessionTodayLocal, claimChecklistBonusLocal, getLocalChecklistState } from '@/lib/localDataSource';
import { isAppOffline } from '@/lib/offlineState';

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
  { key: 'lorekeeper', label: 'Lorekeeper', lore: 'Keeper of the Old Stories — a watch-post where the Ledger of memory runs thinnest. Every passage you master seals a page against the Forgetting.' },
  { key: 'spellcaster', label: 'SpellCaster', lore: 'Word-Weaver of the Spelling Spire — its wards are woven from the Ledger itself. Each letter cast true strengthens the wards that guard the Lexicon.' },
  { key: 'number_realm', label: 'Number Realm', lore: 'Warden of the Shifting Equations — a fragment of the Ledger holding its shape by sheer solved arithmetic. The Realm only stands while its numbers stay solved.' },
  { key: 'logic_labyrinth', label: 'Logic Labyrinth', lore: 'Wayfinder of the Endless Maze — a corridor the Forgetting keeps trying to tangle back into nonsense. Its walls rearrange for those who reason their way through.' },
  { key: 'lexicon_arena', label: 'Lexicon Arena', lore: 'Champion of the Living Dictionary — the Ledger\'s own vocabulary, kept awake one claimed word at a time. Every definition claimed adds a word to your legend.' },
];

export interface ChecklistBattleFlags {
  last_wild_encounter_win: string | null;
  guild_last_played: Partial<Record<GuildKey, string>>;
}

export async function fetchChecklistBattleFlags(userId: string): Promise<ChecklistBattleFlags> {
  if (isOfflineStorageAvailable() && isAppOffline()) {
    const today = new Date().toISOString().slice(0, 10);
    const state = await getLocalChecklistState(userId, today);
    const guild_last_played: Partial<Record<GuildKey, string>> = {};
    (state?.guildSessions || []).forEach(g => { guild_last_played[g] = today; });
    // No offline data source for wild-encounter wins (Monster Arena is
    // online-only) — this sub-item just always shows undone offline.
    return { last_wild_encounter_win: null, guild_last_played };
  }

  const { data, error } = await supabase
    .from('user_battle_state')
    .select('last_wild_encounter_win, guild_last_played')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    return { last_wild_encounter_win: null, guild_last_played: {} };
  }
  return data as ChecklistBattleFlags;
}

// Stamps "played this specific guild today" — called from any of the 5 guild
// components' completion callback, via an RPC so a student who hasn't visited
// the Monster Arena yet (no user_battle_state row) still gets one created
// atomically rather than racing a client-side read-then-upsert.
export async function markGuildSessionToday(userId: string, guildKey: GuildKey, today: string) {
  if (isOfflineStorageAvailable() && isAppOffline()) {
    await markGuildSessionTodayLocal(userId, guildKey, today);
    return;
  }
  await supabase.rpc('mark_guild_session_today', {
    p_user_id: userId,
    p_guild_key: guildKey,
    p_today: today,
  });
}

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
  if (isOfflineStorageAvailable() && isAppOffline()) {
    const state = await getLocalChecklistState(userId, today);
    return state?.claimed ?? false;
  }

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
// this before the claim button is even pressed. No offline data source for
// claim history (same limitation as fetchChecklistBattleFlags), so offline
// this just reports "no known streak" and the real value catches up once
// the queued claim syncs.
export async function fetchDailyChecklistStreak(userId: string, today: string): Promise<ChecklistStreakInfo> {
  if (isOfflineStorageAvailable() && isAppOffline()) {
    return { claimedToday: false, currentStreak: 0, nextStreak: 1, todayGold: null, nextGold: STREAK_GOLD_LADDER[0] };
  }

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

export async function claimChecklistBonus(
  userId: string,
  today: string,
  dayName: string,
  weekStartingDate: string
): Promise<ChecklistClaimResult> {
  if (isOfflineStorageAvailable() && isAppOffline()) {
    await claimChecklistBonusLocal(userId, today, dayName, weekStartingDate);
    // Streak/gold aren't knowable offline (no local claim history) — the
    // real values land once this queued claim syncs and the panel refetches.
    return { granted: true };
  }

  const { data, error } = await supabase.rpc('claim_daily_checklist_bonus', {
    p_user_id: userId,
    p_today: today,
    p_day_name: dayName,
    p_week_starting_date: weekStartingDate,
  });

  if (error) {
    console.error('Failed to claim daily checklist bonus:', error);
    return { granted: false };
  }
  return { granted: !!data?.granted, streak: data?.streak, gold: data?.gold };
}
