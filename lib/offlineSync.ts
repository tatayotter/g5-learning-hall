// lib/offlineSync.ts
//
// Drains the on-device sync_queue (written by the offline shell, or by the
// main app's own local writes) against the same Supabase inserts/RPCs the
// online app already uses. Call this from the main app once it's confirmed
// online — see app/page.tsx.
import { Network } from '@capacitor/network';
import { supabase } from '@/lib/supabase';
import { isOfflineStorageAvailable, getUnsyncedQueue, markSynced, type SyncQueueRow } from '@/lib/localDataSource';
import { markQuestionsCompleted, updateSubclassProfile, type SubclassProfile } from '@/lib/guildEngine';
import { markGuildSessionToday, claimChecklistBonus, type GuildKey } from '@/lib/dailyChecklist';

async function replay(row: SyncQueueRow): Promise<void> {
  const p = row.payload;
  switch (row.tableTarget) {
    case 'user_completed_questions':
      await markQuestionsCompleted(p.userId, p.questType, p.questionIds);
      return;
    case 'mark_guild_session_today':
      await markGuildSessionToday(p.userId, p.guildKey as GuildKey, p.today);
      return;
    case 'claim_daily_checklist_bonus':
      await claimChecklistBonus(p.userId, p.today, p.dayName, p.grade);
      return;
    case 'apply_character_deltas': {
      // Queue target name kept as-is (matches applyGoldDelta's enqueueSync call, which only
      // ever needs a bare xp/gold delta) but replays against apply_progress_deltas
      // (player_progress, lifetime, no week param) — see
      // docs/weekly-progress-redesign-plan.md Phase 4 Wave 1.
      const { error } = await supabase.rpc('apply_progress_deltas', {
        p_user_id: p.userId,
        p_xp_delta: p.xpDelta,
        p_gold_delta: p.goldDelta,
      });
      if (error) throw error;
      return;
    }
    case 'apply_progress_update': {
      // updateStatsAndJournal's full stats+counters+achievements write (Phase 4 Wave 4) — see
      // docs/weekly-progress-redesign-plan.md. Replaces apply_character_deltas +
      // weekly_packages_other_changes for this call site.
      const { error } = await supabase.rpc('apply_progress_update', {
        p_user_id: p.userId,
        p_xp_delta: p.xpDelta,
        p_gold_delta: p.goldDelta,
        p_mastery_count: p.mastery,
        p_purchased_items: p.purchased,
        p_honor_grants: p.honor,
        p_guild_sessions_delta: p.counterDeltas.guild,
        p_monster_battles_won_delta: p.counterDeltas.monster,
        p_sibling_battles_won_delta: p.counterDeltas.sibling,
        p_perfect_quizzes_delta: p.counterDeltas.perfect,
        p_dummy_battles_won_delta: p.counterDeltas.dummy,
        p_eggs_hatched_delta: p.counterDeltas.eggs,
        p_curios_graduated_delta: p.counterDeltas.grad,
        p_trades_completed_delta: p.counterDeltas.trades,
        p_legendaries_caught_delta: p.counterDeltas.legend,
        p_tutor_rerolls_delta: p.counterDeltas.tutor,
        p_tatay_battles_won_delta: p.counterDeltas.tatayWon,
        p_tatay_battles_lost_delta: p.counterDeltas.tatayLost,
        p_new_achievement_ids: p.newAchievementIds,
      });
      if (error) throw error;
      return;
    }
    case 'player_weekly_journal_upsert': {
      const { error } = await supabase
        .from('player_weekly_journal')
        .upsert({ user_id: p.userId, content_week_id: p.contentWeekId, ...p.journalChanges }, { onConflict: 'user_id,content_week_id' });
      if (error) throw error;
      return;
    }
    // Retained so a queue entry written by a pre-Wave-4 app build (an offline device that
    // hasn't come back online since the update) still replays correctly instead of hitting
    // the "unknown target" fallback below.
    case 'weekly_packages_other_changes': {
      const { error } = await supabase
        .from('weekly_packages')
        .update(p.otherChanges)
        .eq('week_starting_date', p.weekStartingDate)
        .eq('user_id', p.userId);
      if (error) throw error;
      return;
    }
    case 'update_subclass_profile':
      await updateSubclassProfile(p.userId, p.fields as Partial<SubclassProfile>);
      return;
    default:
      console.error(`Unknown sync_queue target, skipping: ${row.tableTarget}`);
  }
}

let flushInFlight: Promise<void> | null = null;

export async function flushSyncQueue(): Promise<void> {
  if (!isOfflineStorageAvailable()) return;
  if (flushInFlight) return flushInFlight;

  flushInFlight = (async () => {
    let queue: SyncQueueRow[];
    try {
      queue = await getUnsyncedQueue();
    } catch (e) {
      console.error('Failed to read sync_queue (non-fatal):', e);
      return;
    }

    // Replayed in order (oldest first) — see plan doc for why conflict
    // resolution beyond ordering isn't attempted (single-player progress only).
    for (const row of queue) {
      try {
        await replay(row);
        await markSynced(row.id);
      } catch (e) {
        console.error(`Failed to sync queued ${row.tableTarget} row ${row.id} (will retry next flush):`, e);
      }
    }
  })();

  try {
    await flushInFlight;
  } finally {
    flushInFlight = null;
  }
}

// Call once from the main app's root — flushes immediately if already
// online, and again on every offline->online transition.
export function watchAndFlushSyncQueue(): () => void {
  if (!isOfflineStorageAvailable()) return () => {};

  Network.getStatus().then(status => {
    if (status.connected) void flushSyncQueue();
  });

  const listenerPromise = Network.addListener('networkStatusChange', status => {
    if (status.connected) void flushSyncQueue();
  });

  return () => {
    listenerPromise.then(listener => listener.remove());
  };
}
