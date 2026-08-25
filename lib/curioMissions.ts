// lib/curioMissions.ts
// Curio Training Missions — timed idle expeditions that earn EXP for benched curios.
// Slot count scales with player level (see MISSION_SLOT_LEVELS); only benched curios
// (slot === null in user_monsters) can be sent.
import { supabase } from './supabase';
import { BATTLE_CONSTANTS } from './monsterConfig';

// ─── MISSION CONFIG ───────────────────────────────────────────────────────────

export interface MissionTier {
  durationHours: number;
  expReward: number;
  label: string;
  names: readonly string[];
}

export const MISSION_TIERS: readonly MissionTier[] = [
  {
    durationHours: 1,
    expReward: 5,
    label: '1 hr',
    names: ['Alphabet Alchemist', 'Vowel Voyager', 'Syllable Scout', 'Punctuation Pilot'],
  },
  {
    durationHours: 2,
    expReward: 10,
    label: '2 hrs',
    names: ["The Storyteller's Scroll", 'Manners Mentorship', 'Makabansa Messenger', 'Adjective Artist'],
  },
  {
    durationHours: 4,
    expReward: 23,
    label: '4 hrs',
    names: ['Word-Wise Wanderer', "The Catalyst's Observation", 'Habitat Hiker', 'Property Proctor'],
  },
  {
    durationHours: 6,
    expReward: 36,
    label: '6 hrs',
    names: ["Curiosity's Clockwork", "Shape Shifter's Safari", 'Measurement Mountaineer', 'Fraction Fisher'],
  },
  {
    durationHours: 8,
    expReward: 50,
    label: '8 hrs',
    names: ['Arithmagic Expedition', "Critical Thinker's Trek", 'Bayaning Bata Patrol', 'Tech-Tool Trek'],
  },
] as const;

// Player level thresholds for each mission slot (slot 1 at Lv.5, slot 2 at Lv.10, …)
export const MISSION_SLOT_LEVELS = [5, 10, 15, 20, 25] as const;

export function getUnlockedMissionSlots(playerLevel: number): number {
  return MISSION_SLOT_LEVELS.filter(lvl => playerLevel >= lvl).length;
}

// ─── DB TYPES ─────────────────────────────────────────────────────────────────

export interface CurioMission {
  id: string;
  user_id: string;
  monster_row_id: string;   // user_monsters.id
  mission_name: string;
  duration_hours: number;
  exp_reward: number;
  started_at: string;
  ends_at: string;
  claimed_at: string | null;
}

// ─── DB FUNCTIONS ─────────────────────────────────────────────────────────────

/** Returns all unclaimed missions for the user, oldest first. */
export async function fetchActiveMissions(userId: string): Promise<CurioMission[]> {
  const { data, error } = await supabase
    .from('curio_missions')
    .select('*')
    .eq('user_id', userId)
    .is('claimed_at', null)
    .order('started_at', { ascending: true });
  if (error || !data) return [];
  return data as CurioMission[];
}

/** Starts a new mission for a benched curio and returns the new row. */
export async function sendOnMission(
  userId: string,
  monsterRowId: string,
  tier: MissionTier,
): Promise<{ success: boolean; mission?: CurioMission; error?: string }> {
  const name = tier.names[Math.floor(Math.random() * tier.names.length)];
  const now = new Date();
  const endsAt = new Date(now.getTime() + tier.durationHours * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('curio_missions')
    .insert({
      user_id: userId,
      monster_row_id: monsterRowId,
      mission_name: name,
      duration_hours: tier.durationHours,
      exp_reward: tier.expReward,
      started_at: now.toISOString(),
      ends_at: endsAt.toISOString(),
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, mission: data as CurioMission };
}

/**
 * Claims a completed mission: adds EXP (and handles level-up) to the curio,
 * then marks the mission row as claimed.
 */
export async function claimMission(
  userId: string,
  mission: CurioMission,
): Promise<{ success: boolean; newExp?: number; newLevel?: number; leveled?: boolean; error?: string }> {
  // 1. Read current curio exp/level — check user_monsters first, then
  //    user_caught_monsters (wild catches and guild familiars live there until
  //    the player promotes them to the team).
  const { data: row, error: fetchErr } = await supabase
    .from('user_monsters')
    .select('monster_exp, monster_level')
    .eq('id', mission.monster_row_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchErr) return { success: false, error: fetchErr.message };

  // Fall back to user_caught_monsters if not found in user_monsters
  if (!row) {
    const { data: cRow, error: cFetchErr } = await supabase
      .from('user_caught_monsters')
      .select('monster_exp, monster_level')
      .eq('id', mission.monster_row_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (cFetchErr || !cRow) return { success: false, error: 'Monster not found' };

    const oldLevel = cRow.monster_level as number;
    const newExp   = (cRow.monster_exp as number) + mission.exp_reward;
    const newLevel = Math.min(
      Math.floor(newExp / BATTLE_CONSTANTS.MONSTER_EXP_PER_LEVEL) + 1,
      BATTLE_CONSTANTS.MONSTER_LEVEL_CAP,
    );

    const { error: updateErr } = await supabase
      .from('user_caught_monsters')
      .update({ monster_exp: newExp, monster_level: newLevel })
      .eq('id', mission.monster_row_id)
      .eq('user_id', userId);

    if (updateErr) return { success: false, error: updateErr.message };

    const { error: claimErr } = await supabase
      .from('curio_missions')
      .update({ claimed_at: new Date().toISOString() })
      .eq('id', mission.id)
      .eq('user_id', userId);

    if (claimErr) return { success: false, error: claimErr.message };

    return { success: true, newExp, newLevel, leveled: newLevel > oldLevel };
  }

  const oldLevel  = row.monster_level as number;
  const newExp    = (row.monster_exp as number) + mission.exp_reward;
  const newLevel  = Math.min(
    Math.floor(newExp / BATTLE_CONSTANTS.MONSTER_EXP_PER_LEVEL) + 1,
    BATTLE_CONSTANTS.MONSTER_LEVEL_CAP,
  );

  // 2. Update curio
  const { error: updateErr } = await supabase
    .from('user_monsters')
    .update({ monster_exp: newExp, monster_level: newLevel })
    .eq('id', mission.monster_row_id)
    .eq('user_id', userId);

  if (updateErr) return { success: false, error: updateErr.message };

  // 3. Mark mission claimed
  const { error: claimErr } = await supabase
    .from('curio_missions')
    .update({ claimed_at: new Date().toISOString() })
    .eq('id', mission.id)
    .eq('user_id', userId);

  if (claimErr) return { success: false, error: claimErr.message };

  return { success: true, newExp, newLevel, leveled: newLevel > oldLevel };
}
