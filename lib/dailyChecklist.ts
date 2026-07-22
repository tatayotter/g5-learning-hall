import { supabase } from './supabase';

export type GuildKey = 'lorekeeper' | 'spellcaster' | 'number_realm' | 'logic_labyrinth' | 'lexicon_arena';

export const GUILDS: { key: GuildKey; label: string; lore: string }[] = [
  { key: 'lorekeeper', label: 'Lorekeeper', lore: 'Keeper of the Old Stories — every passage you master seals a page against the Forgetting.' },
  { key: 'spellcaster', label: 'SpellCaster', lore: 'Word-Weaver of the Spelling Spire — each letter cast true strengthens the wards that guard the Lexicon.' },
  { key: 'number_realm', label: 'Number Realm', lore: 'Warden of the Shifting Equations — the Realm only holds its shape while its numbers stay solved.' },
  { key: 'logic_labyrinth', label: 'Logic Labyrinth', lore: 'Wayfinder of the Endless Maze — its walls rearrange for those who reason their way through.' },
  { key: 'lexicon_arena', label: 'Lexicon Arena', lore: 'Champion of the Living Dictionary — every definition claimed adds a word to your legend.' },
];

export interface ChecklistBattleFlags {
  last_wild_encounter_win: string | null;
  guild_last_played: Partial<Record<GuildKey, string>>;
}

export async function fetchChecklistBattleFlags(userId: string): Promise<ChecklistBattleFlags> {
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
  const { data } = await supabase
    .from('daily_checklist_claims')
    .select('claim_date')
    .eq('app_user_id', userId)
    .eq('claim_date', today)
    .maybeSingle();
  return !!data;
}

export async function claimChecklistBonus(
  userId: string,
  today: string,
  dayName: string,
  weekStartingDate: string,
  gold: number = 50
): Promise<boolean> {
  const { data, error } = await supabase.rpc('claim_daily_checklist_bonus', {
    p_user_id: userId,
    p_today: today,
    p_day_name: dayName,
    p_week_starting_date: weekStartingDate,
    p_gold: gold,
  });

  if (error) {
    console.error('Failed to claim daily checklist bonus:', error);
    return false;
  }
  return !!data;
}
