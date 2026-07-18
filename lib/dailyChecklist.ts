import { supabase } from './supabase';

export type GuildKey = 'lorekeeper' | 'spellcaster' | 'number_realm' | 'logic_labyrinth' | 'lexicon_arena';

export const GUILDS: { key: GuildKey; icon: string; label: string }[] = [
  { key: 'lorekeeper', icon: '📜', label: 'Lorekeeper' },
  { key: 'spellcaster', icon: '🧙‍♂️', label: 'SpellCaster' },
  { key: 'number_realm', icon: '🔢', label: 'Number Realm' },
  { key: 'logic_labyrinth', icon: '🧩', label: 'Logic Labyrinth' },
  { key: 'lexicon_arena', icon: '🧿', label: 'Lexicon Arena' },
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
