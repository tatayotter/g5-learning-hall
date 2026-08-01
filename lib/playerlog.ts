import { supabase } from '@/lib/supabase';
import { isOfflineStorageAvailable } from '@/lib/localDataSource';
import { isAppOffline } from '@/lib/offlineState';

export async function logAction(
  userId: string,
  weekStartingDate: string,
  actionType: string,
  description: string,
  xpChange: number = 0,
  goldChange: number = 0
) {
  // Skipped rather than queued when offline — this is an activity-feed
  // entry, not user-facing progress, not worth the sync complexity.
  if (isOfflineStorageAvailable() && isAppOffline()) return;

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
