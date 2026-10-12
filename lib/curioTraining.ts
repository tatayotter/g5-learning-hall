// lib/curioTraining.ts
// Awards a quest's training curio its share of the quest XP. Shared by the
// main-quest view (components/dashboard/board/ActiveQuestView.tsx) and the
// intro's training quest (components/intro/IntroTrainingQuest.tsx).
// Best-effort: returns null on any failure — a curio EXP hiccup must never
// block the quest reward itself.
import { supabase } from '@/lib/supabase';
import { logAction } from '@/lib/playerlog';
import { ALL_MONSTERS, getMonsterLevel } from '@/lib/monsterConfig';
import { TRAINING_EXP_SHARE, OwnedCurio } from '@/components/dashboard/board/CurioTrainingPicker';
import type { TrainingResult } from '@/components/VictoryScreen';

export async function awardCurioTrainingExp(
  userId: string,
  curio: Pick<OwnedCurio, 'id' | 'source' | 'nickname' | 'display'>,
  xpEarned: number,
  weekStartingDate: string,
): Promise<TrainingResult | null> {
  const exp = Math.floor(xpEarned * TRAINING_EXP_SHARE);
  if (exp <= 0) return null;
  // Team/bench curios live in user_monsters; Catch Inbox curios in user_caught_monsters.
  const table = curio.source === 'inbox' ? 'user_caught_monsters' : 'user_monsters';
  try {
    const { data: row, error } = await supabase
      .from(table)
      .select('monster_id, monster_exp, monster_level')
      .eq('id', curio.id)
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !row) return null;
    const newExp = row.monster_exp + exp;
    const newLevel = getMonsterLevel(newExp);
    const { error: updErr } = await supabase
      .from(table)
      .update({ monster_exp: newExp, monster_level: newLevel })
      .eq('id', curio.id)
      .eq('user_id', userId);
    if (updErr) return null;
    // The form the player picked (graduated / guild stage), not the base species.
    const display = curio.display ?? ALL_MONSTERS[row.monster_id];
    const name = curio.nickname || display?.name || 'Your curio';
    const leveled = newLevel > row.monster_level;
    logAction(userId, weekStartingDate, 'quiz', `🐾 ${name} trained +${exp} Curio EXP`, exp, 0);
    return { monsterId: row.monster_id, display, name, exp, prevExp: row.monster_exp, newExp, leveledTo: leveled ? newLevel : null };
  } catch (e) {
    console.error('Curio training exp failed:', e);
    return null;
  }
}
