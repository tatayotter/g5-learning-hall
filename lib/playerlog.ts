import { supabase } from '@/lib/supabase';

export async function logAction(
  userId: string,
  weekStartingDate: string,
  actionType: string,
  description: string,
  xpChange: number = 0,
  goldChange: number = 0
) {

  const { error } = await supabase.from('player_log').insert({
    user_id: userId,
    week_starting_date: weekStartingDate,
    action_type: actionType,
    description,
    xp_change: xpChange,
    gold_change: goldChange
  });
  if (error) {
    console.error('Failed to write player log entry:', error);
  }
}
