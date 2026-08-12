// hooks/useWeeklyData.ts
import { useState, useEffect } from 'react';
import { supabase, ensureAnonymousSession } from '@/lib/supabase';
import { startOfWeek, format } from 'date-fns';
import { ACHIEVEMENTS, Achievement } from '@/lib/achievements';
import { logAction } from '@/lib/playerlog';
import { USERS, UserId, gradeToNumber } from '@/lib/userSession';
import { isOfflineStorageAvailable, cacheWeeklyData, getCachedWeeklyData, enqueueSync } from '@/lib/localDataSource';
import { isAppOffline } from '@/lib/offlineState';
import { fetchPlayerProgress, PlayerProgress } from '@/lib/lifetimeStats';

export interface CharacterStats {
  level: number;
  xp: number;
  gold: number;
}

// Mirrors the level-up loop in apply_character_deltas (Postgres RPC): every
// level's xp requirement is 500 + level*100, and xp beyond that threshold
// carries over as the next level's starting remainder. Converts a
// (level, remainder) pair back into the raw cumulative xp it represents, so
// that two states can be diffed correctly even when a level-up happened
// between them.
function totalXpForLevelState(level: number, xp: number): number {
  let total = xp;
  for (let l = 1; l < level; l++) {
    total += 500 + l * 100;
  }
  return total;
}

// Same level-up loop as the apply_character_deltas Postgres RPC — used to
// keep the offline (no-RPC) path's level/xp consistent with what the server
// would compute once the queued delta replays.
function applyXpDelta(level: number, xp: number, delta: number): { level: number; xp: number } {
  let newLevel = level;
  let newXp = xp + delta;
  while (newXp >= 500 + newLevel * 100) {
    newXp -= 500 + newLevel * 100;
    newLevel += 1;
  }
  return { level: newLevel, xp: newXp };
}

// Reconstructs a package_data-shaped object (weekday -> subject -> {summary_markdown,
// quiz: [{id, question, options}]}) from the normalized content_* tables, grade-keyed instead of
// per-student contentSourceId (Phase 4 Wave 3, see docs/weekly-progress-redesign-plan.md).
// Deliberately kept in the OLD nested shape rather than a flat list — every downstream consumer
// (Main Quest quiz UI, Monster Arena's extractQuestions, lib/weeklyReview.ts's synthesis) already
// walks this exact shape, so reconstructing it here means none of them need to change, only how
// they grade (by real question.id now, not text/position). correct_answer is never included —
// same answer-stripping guarantee weekly_packages_public used to provide, enforced structurally
// by content_questions_public (which never selects it), not a client-side strip.
// Fetched through app/api/content (Data-Cache-backed, shared across every visitor, 5min TTL or
// immediate on admin save) instead of querying Supabase directly — this used to be 2 queries PER
// STUDENT PER PAGE LOAD; content only changes when an admin authors a week, so there's no reason
// every visitor should re-fetch it individually. See app/api/content/route.ts.
// Also returns the resolved content_weeks.id (null if the admin hasn't authored this grade/week
// yet) — Wave 4 keys player_weekly_journal off it instead of a week_starting_date column.
async function fetchGradeContent(grade: number, weekStartingDate: string): Promise<{ content: any; contentWeekId: string | null }> {
  try {
    const res = await fetch(`/api/content?grade=${grade}&week=${weekStartingDate}`);
    if (!res.ok) return { content: {}, contentWeekId: null };
    return await res.json();
  } catch {
    return { content: {}, contentWeekId: null };
  }
}

// The 12 "this week" battle/activity counters, zeroed for a week with no player_weekly_journal
// row yet (a brand new week, or a week nobody has interacted with). No carry-forward from the
// previous week — unlike character_stats, these have always reset to 0 client-side on a new
// week (see the old carriedForward object this replaced), so starting empty is correct, not a
// gap to fill in.
const EMPTY_JOURNAL_FIELDS = {
  journal_logs: {} as Record<string, JournalEntry>,
  mastery_count: 0,
  purchased_items: 0,
  honor_grants: 0,
  quiz_attempts: {} as Record<string, number>,
  mastered_quizzes: [] as string[],
  guild_sessions_count: 0,
  monster_battles_won: 0,
  sibling_battles_won: 0,
  perfect_quizzes: 0,
  dummy_battles_won: 0,
  eggs_hatched: 0,
  curios_graduated: 0,
  trades_completed: 0,
  legendaries_caught: 0,
  tutor_rerolls: 0,
  tatay_battles_won: 0,
  tatay_battles_lost: 0,
};

export interface JournalEntry {
  done_today: string;
  tomorrow_plan: string;
  hardest_challenge: string;
  gratitude: string;
}

export interface WeeklyData {
  week_starting_date: string;
  user_id: string;
  character_stats: CharacterStats;
  journal_logs: Record<string, JournalEntry>;
  mastery_count: number;
  purchased_items: number;
  honor_grants: number;
  achievements: Record<string, boolean>;
  package_data?: any;
  quiz_attempts?: Record<string, number>;
  mastered_quizzes?: string[];
  guild_sessions_count: number;
  monster_battles_won: number;
  sibling_battles_won: number;
  perfect_quizzes: number;
  dummy_battles_won: number;
  eggs_hatched: number;
  curios_graduated: number;
  trades_completed: number;
  legendaries_caught: number;
  tutor_rerolls: number;
  tatay_battles_won: number;
  tatay_battles_lost: number;
}

export function useWeeklyData(userId: string = 'damien') {
  const [data, setData] = useState<WeeklyData | null>(null);
  const [loading, setLoading] = useState(true);
  // Lifetime totals for achievement-criteria checking (Phase 4 Wave 2, see
  // docs/weekly-progress-redesign-plan.md) — kept a little stale between saves is fine
  // (self-heals next fetch); it's also the source of `data.character_stats`/`.achievements`
  // below, and (Wave 4) the target of every stats/achievement write, so it's fetched inline in
  // the same effect as everything else rather than a separate race-prone effect.
  const [progress, setProgress] = useState<PlayerProgress | null>(null);
  // Resolved content_weeks.id for (grade, currentSunday) — null if the admin hasn't authored
  // this grade/week yet. Needed by updateStatsAndJournal to know which player_weekly_journal
  // row to upsert (Phase 4 Wave 4).
  const [contentWeekId, setContentWeekId] = useState<string | null>(null);

  const today = new Date();
  const currentSunday = format(startOfWeek(today), 'yyyy-MM-dd');

  // Content is grade-keyed, not per-student (Phase 4 Wave 3, see
  // docs/weekly-progress-redesign-plan.md) — replaces the old contentSourceId
  // indirection where classmates read a reference player's package_data.
  const grade = gradeToNumber(USERS[userId as UserId]?.grade);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      // Offline (Android only): skip the network round-trip entirely and load
      // straight from the on-device cache — see lib/localDataSource.ts's
      // cacheWeeklyData, written every time `data` changes below.
      if (isOfflineStorageAvailable() && isAppOffline()) {
        const cached = await getCachedWeeklyData(userId);
        setData(cached);
        setLoading(false);
        return;
      }

      // player_progress/player_weekly_journal RLS only grants access to the `authenticated`
      // role, which this app's anonymous-auth bridge (lib/supabase.ts) provides — but that
      // sign-in happens in a separate effect (userSession.linkIdentity), so without waiting
      // here this fetch can race ahead on the unauthenticated `anon` role and get rejected.
      await ensureAnonymousSession();

      const [{ content: gradeContent, contentWeekId: weekId }, progressData] = await Promise.all([
        fetchGradeContent(grade, currentSunday),
        fetchPlayerProgress(userId),
      ]);
      if (cancelled) return;

      // No carry-forward step here (Phase 4 Wave 4) — journal_logs/counters genuinely reset
      // to empty on a new week (see EMPTY_JOURNAL_FIELDS), and character_stats/achievements
      // are always read live from player_progress (lifetime, no week dimension to carry
      // forward at all). This eliminates the fetch-error/carry-forward bug class for these
      // fields entirely, the same way Wave 1 eliminated it for xp/gold/level.
      let journalRow: Record<string, any> | null = null;
      if (weekId) {
        const { data: journal, error: journalError } = await supabase
          .from('player_weekly_journal')
          .select('*')
          .eq('user_id', userId)
          .eq('content_week_id', weekId)
          .maybeSingle();
        if (journalError) {
          console.error('Failed to fetch this week\'s journal:', journalError);
          setLoading(false);
          return;
        }
        journalRow = journal;
      }
      if (cancelled) return;

      setProgress(progressData);
      setContentWeekId(weekId);
      setData({
        week_starting_date: currentSunday,
        user_id: userId,
        character_stats: progressData
          ? { level: progressData.level, xp: progressData.xp, gold: progressData.gold }
          : { level: 1, xp: 0, gold: 0 },
        ...EMPTY_JOURNAL_FIELDS,
        ...(journalRow || {}),
        achievements: progressData?.achievements || {},
        package_data: gradeContent,
      });
      setLoading(false);
    }
    fetchData();
    return () => { cancelled = true; };
  }, [currentSunday, userId, grade]);

  // Mirror the full WeeklyData snapshot (stats, journal, achievements,
  // package_data — also what Monster Arena wild encounters draw from, quiz
  // history, etc.) into the on-device SQLite cache, so the Android offline
  // shell has everything it needs next time there's no connection. Skipped
  // when we just loaded `data` FROM the cache (offline) to avoid a pointless
  // write-back of the same data. Best-effort only — never allowed to affect
  // the online experience.
  useEffect(() => {
    if (!data || !isOfflineStorageAvailable() || isAppOffline()) return;
    cacheWeeklyData(userId, data).catch(e => {
      console.error('Offline cache write failed (non-fatal):', e);
    });
  }, [data, userId]);

  const updateStatsAndJournal = async (
    newStats: CharacterStats,
    newJournal: Record<string, JournalEntry>,
    newPurchasedItems: number = data?.purchased_items || 0,
    newMasteryCount: number = data?.mastery_count || 0,
    newHonorGrants: number = data?.honor_grants || 0,
    newQuizAttempts: Record<string, number> = data?.quiz_attempts || {},
    newMasteredQuizzes: string[] = data?.mastered_quizzes || [],
    newHonorGrantsCount: number = data?.honor_grants || 0,
    newGuildSessionsCount: number = data?.guild_sessions_count || 0,
    newMonsterBattlesWon: number = data?.monster_battles_won || 0,
    newSiblingBattlesWon: number = data?.sibling_battles_won || 0,
    newPerfectQuizzes: number = data?.perfect_quizzes || 0,
    newDummyBattlesWon: number = data?.dummy_battles_won || 0,
    newEggsHatched: number = data?.eggs_hatched || 0,
    newCuriosGraduated: number = data?.curios_graduated || 0,
    newTradesCompleted: number = data?.trades_completed || 0,
    newLegendariesCaught: number = data?.legendaries_caught || 0,
    newTutorRerolls: number = data?.tutor_rerolls || 0,
    newTatayBattlesWon: number = data?.tatay_battles_won || 0,
    newTatayBattlesLost: number = data?.tatay_battles_lost || 0
  ) => {
    if (!data) {
      console.error('Aborting update: data is null');
      return;
    }

    const currentAchievements = data.achievements || {};
    let addedXp = 0;
    let addedGold = 0;

    const newUnlocked = { ...currentAchievements };
    const newlyUnlockedTitles: { title: string; xp: number; gold: number }[] = [];
    const newlyUnlockedIds: string[] = [];

    // Achievement criteria now check LIFETIME totals (player_progress), not the current
    // week's weekly-reset counters — thresholds unchanged, only the data source moved
    // (Phase 4 Wave 2, see docs/weekly-progress-redesign-plan.md). The 12 counters below
    // still reset weekly in weekly_packages (unchanged write below), so what's being unlocked
    // here is projected: lifetimeTotal + (thisCall'sNewWeeklyValue - thisWeek'sOldValue) —
    // exactly what the Phase 3 trigger will compute once this call's otherChanges write lands,
    // computed here ahead of time so the achievement check and the atomic xp/gold write can
    // stay in the same round trip. mastery_count/purchased_items/honor_grants need no such
    // projection — they already carry forward as lifetime-equivalent values today.
    const projectLifetime = (total: number, newWeeklyValue: number, oldWeeklyValue: number) =>
      total + (newWeeklyValue - oldWeeklyValue);

    ACHIEVEMENTS.forEach((ach: Achievement) => {
      if (!newUnlocked[ach.id] && ach.criteria({
        ...data,
        character_stats: newStats,
        journal_logs: newJournal,
        purchased_items: newPurchasedItems,
        mastery_count: newMasteryCount,
        honor_grants: newHonorGrants,
        quiz_attempts: newQuizAttempts,
        mastered_quizzes: newMasteredQuizzes,
        guild_sessions_count: projectLifetime(progress?.guild_sessions_count_total || 0, newGuildSessionsCount, data.guild_sessions_count || 0),
        monster_battles_won: projectLifetime(progress?.monster_battles_won_total || 0, newMonsterBattlesWon, data.monster_battles_won || 0),
        sibling_battles_won: projectLifetime(progress?.sibling_battles_won_total || 0, newSiblingBattlesWon, data.sibling_battles_won || 0),
        perfect_quizzes: projectLifetime(progress?.perfect_quizzes_total || 0, newPerfectQuizzes, data.perfect_quizzes || 0),
        dummy_battles_won: projectLifetime(progress?.dummy_battles_won_total || 0, newDummyBattlesWon, data.dummy_battles_won || 0),
        eggs_hatched: projectLifetime(progress?.eggs_hatched_total || 0, newEggsHatched, data.eggs_hatched || 0),
        curios_graduated: projectLifetime(progress?.curios_graduated_total || 0, newCuriosGraduated, data.curios_graduated || 0),
        trades_completed: projectLifetime(progress?.trades_completed_total || 0, newTradesCompleted, data.trades_completed || 0),
        legendaries_caught: projectLifetime(progress?.legendaries_caught_total || 0, newLegendariesCaught, data.legendaries_caught || 0),
        tutor_rerolls: projectLifetime(progress?.tutor_rerolls_total || 0, newTutorRerolls, data.tutor_rerolls || 0),
        tatay_battles_won: projectLifetime(progress?.tatay_battles_won_total || 0, newTatayBattlesWon, data.tatay_battles_won || 0),
        tatay_battles_lost: projectLifetime(progress?.tatay_battles_lost_total || 0, newTatayBattlesLost, data.tatay_battles_lost || 0)
      })) {
        newUnlocked[ach.id] = true;
        addedXp += ach.xpReward;
        addedGold += ach.goldReward;
        newlyUnlockedTitles.push({ title: ach.title, xp: ach.xpReward, gold: ach.goldReward });
        newlyUnlockedIds.push(ach.id);
      }
    });

    if (!isAppOffline()) {
      newlyUnlockedTitles.forEach(({ title, xp, gold }) => {
        logAction(userId, currentSunday, 'achievement', `Unlocked achievement: ${title}`, xp, gold);
      });
    }

    // xp/gold/level are applied server-side as atomic deltas (not written as
    // an absolute snapshot of local state) so that two saves firing close
    // together both land instead of the second one clobbering the first —
    // this used to silently lose gold when e.g. a battle reward and a quiz
    // save raced each other.
    // Diffed as total accumulated xp, not raw `.xp` fields — callers like
    // QuestModule/GuildJournal pre-consume xp into levels locally before
    // calling this (for the level-up celebration/achievement checks), so
    // newStats.xp is a post-level-up remainder while data.character_stats.xp
    // is the old remainder. Subtracting those directly could go negative (or
    // undercount) whenever a level-up happened in between, silently losing
    // xp on the server write.
    const xpDelta = (totalXpForLevelState(newStats.level, newStats.xp) - totalXpForLevelState(data.character_stats.level, data.character_stats.xp)) + addedXp;
    const goldDelta = (newStats.gold - data.character_stats.gold) + addedGold;

    // Journal fields (this-week only — no longer lifetime-adjacent, see player_weekly_journal)
    // written via a direct client upsert below, RLS-gated to the caller's own row. Kept as its
    // own object so the upsert below can't touch character_stats/achievements, which are
    // player_progress's job now (see the apply_progress_update RPC call further down).
    const journalChanges = {
      journal_logs: newJournal,
      purchased_items: newPurchasedItems,
      mastery_count: newMasteryCount,
      honor_grants: newHonorGrants,
      quiz_attempts: newQuizAttempts,
      mastered_quizzes: newMasteredQuizzes,
      guild_sessions_count: newGuildSessionsCount,
      monster_battles_won: newMonsterBattlesWon,
      sibling_battles_won: newSiblingBattlesWon,
      perfect_quizzes: newPerfectQuizzes,
      dummy_battles_won: newDummyBattlesWon,
      eggs_hatched: newEggsHatched,
      curios_graduated: newCuriosGraduated,
      trades_completed: newTradesCompleted,
      legendaries_caught: newLegendariesCaught,
      tutor_rerolls: newTutorRerolls,
      tatay_battles_won: newTatayBattlesWon,
      tatay_battles_lost: newTatayBattlesLost
    };

    // Per-call deltas for the 12 lifetime *_total counters on player_progress — same
    // projectLifetime math as the achievement check above, reused here as the actual RPC
    // arguments instead of just a projection.
    const counterDeltas = {
      guild: newGuildSessionsCount - (data.guild_sessions_count || 0),
      monster: newMonsterBattlesWon - (data.monster_battles_won || 0),
      sibling: newSiblingBattlesWon - (data.sibling_battles_won || 0),
      perfect: newPerfectQuizzes - (data.perfect_quizzes || 0),
      dummy: newDummyBattlesWon - (data.dummy_battles_won || 0),
      eggs: newEggsHatched - (data.eggs_hatched || 0),
      grad: newCuriosGraduated - (data.curios_graduated || 0),
      trades: newTradesCompleted - (data.trades_completed || 0),
      legend: newLegendariesCaught - (data.legendaries_caught || 0),
      tutor: newTutorRerolls - (data.tutor_rerolls || 0),
      tatayWon: newTatayBattlesWon - (data.tatay_battles_won || 0),
      tatayLost: newTatayBattlesLost - (data.tatay_battles_lost || 0),
    };

    if (isOfflineStorageAvailable() && isAppOffline()) {
      // No RPC available offline — apply the delta locally (safe: offline
      // means single-device/single-session, no concurrent-save race to guard
      // against) and queue the same delta to replay against the real RPC
      // once back online, so the server-side atomicity guarantee still holds
      // for the eventual write.
      const { level: finalLevel, xp: finalXp } = applyXpDelta(data.character_stats.level, data.character_stats.xp, xpDelta);
      const finalStats: CharacterStats = {
        level: finalLevel,
        xp: finalXp,
        gold: data.character_stats.gold + goldDelta,
      };
      const updated = { ...data, character_stats: finalStats, ...journalChanges, achievements: newUnlocked };
      setData(updated);
      await cacheWeeklyData(userId, updated);
      await enqueueSync('apply_progress_update', 'rpc', {
        userId, xpDelta, goldDelta,
        mastery: newMasteryCount, purchased: newPurchasedItems, honor: newHonorGrants,
        counterDeltas, newAchievementIds: newlyUnlockedIds,
      });
      if (contentWeekId) {
        await enqueueSync('player_weekly_journal_upsert', 'upsert', {
          userId, contentWeekId, journalChanges,
        });
      }
      return;
    }

    // xp/gold/level/counters/mastery-purchased-honor/achievements all live on player_progress
    // (lifetime, not week-keyed) now — applied atomically in one round trip by
    // apply_progress_update (Phase 4 Wave 4, see docs/weekly-progress-redesign-plan.md).
    // Auto-creates its row on first use, so there's no carry-forward step to get wrong here.
    const { data: finalStats, error: statsError } = await supabase.rpc('apply_progress_update', {
      p_user_id: userId,
      p_xp_delta: xpDelta,
      p_gold_delta: goldDelta,
      p_mastery_count: newMasteryCount,
      p_purchased_items: newPurchasedItems,
      p_honor_grants: newHonorGrants,
      p_guild_sessions_delta: counterDeltas.guild,
      p_monster_battles_won_delta: counterDeltas.monster,
      p_sibling_battles_won_delta: counterDeltas.sibling,
      p_perfect_quizzes_delta: counterDeltas.perfect,
      p_dummy_battles_won_delta: counterDeltas.dummy,
      p_eggs_hatched_delta: counterDeltas.eggs,
      p_curios_graduated_delta: counterDeltas.grad,
      p_trades_completed_delta: counterDeltas.trades,
      p_legendaries_caught_delta: counterDeltas.legend,
      p_tutor_rerolls_delta: counterDeltas.tutor,
      p_tatay_battles_won_delta: counterDeltas.tatayWon,
      p_tatay_battles_lost_delta: counterDeltas.tatayLost,
      p_new_achievement_ids: newlyUnlockedIds,
    });

    if (statsError || !finalStats) {
      console.error('Failed to apply progress update:', statsError);
      alert(`⚠️ Save failed: ${statsError?.message}`);
      return;
    }

    setData({ ...data, character_stats: finalStats as CharacterStats, ...journalChanges, achievements: newUnlocked });

    // journal_logs/counters are this-week-only content, not lifetime — written directly via a
    // client upsert (RLS: `current_app_user_id() = user_id`), same trust boundary the old blind
    // weekly_packages .update() had. Skipped if the admin hasn't authored this grade/week yet
    // (nothing to key the row to) — matches package_data being empty in that case too.
    if (contentWeekId) {
      const { error: journalError } = await supabase
        .from('player_weekly_journal')
        .upsert({ user_id: userId, content_week_id: contentWeekId, ...journalChanges }, { onConflict: 'user_id,content_week_id' });

      if (journalError) {
        console.error('Failed to save journal:', journalError);
        alert(`⚠️ Save failed: ${journalError.message}`);
        return;
      }
    }

    // Refresh the lifetime snapshot used by the achievement projection above, so the next
    // save in this session isn't checking against increasingly stale totals.
    fetchPlayerProgress(userId).then(setProgress);
  };

  // Increments one or more of the newer per-mechanic achievement counters
  // (egg hatching, graduation, trading, legendary catches, Tutor rerolls,
  // the Tatay joke fight) without callers having to thread the entire
  // updateStatsAndJournal positional argument list through just to bump one
  // number — everything else is carried forward from the current `data`.
  const bumpCounters = async (deltas: Partial<{
    eggs_hatched: number;
    curios_graduated: number;
    trades_completed: number;
    legendaries_caught: number;
    tutor_rerolls: number;
    tatay_battles_won: number;
    tatay_battles_lost: number;
  }>) => {
    if (!data) return;
    await updateStatsAndJournal(
      data.character_stats, data.journal_logs,
      data.purchased_items, data.mastery_count, data.honor_grants,
      data.quiz_attempts || {}, data.mastered_quizzes || [],
      data.honor_grants,
      data.guild_sessions_count || 0,
      data.monster_battles_won || 0,
      data.sibling_battles_won || 0,
      data.perfect_quizzes || 0,
      data.dummy_battles_won || 0,
      (data.eggs_hatched || 0) + (deltas.eggs_hatched || 0),
      (data.curios_graduated || 0) + (deltas.curios_graduated || 0),
      (data.trades_completed || 0) + (deltas.trades_completed || 0),
      (data.legendaries_caught || 0) + (deltas.legendaries_caught || 0),
      (data.tutor_rerolls || 0) + (deltas.tutor_rerolls || 0),
      (data.tatay_battles_won || 0) + (deltas.tatay_battles_won || 0),
      (data.tatay_battles_lost || 0) + (deltas.tatay_battles_lost || 0)
    );
  };

  const applyGoldDelta = async (amount: number) => {
    if (!data) return;

    if (isOfflineStorageAvailable() && isAppOffline()) {
      const finalStats: CharacterStats = { ...data.character_stats, gold: data.character_stats.gold + amount };
      const updated = { ...data, character_stats: finalStats };
      setData(updated);
      await cacheWeeklyData(userId, updated);
      await enqueueSync('apply_character_deltas', 'rpc', {
        userId, xpDelta: 0, goldDelta: amount,
      });
      return;
    }

    const { data: finalStats, error } = await supabase.rpc('apply_progress_deltas', {
      p_user_id: userId,
      p_xp_delta: 0,
      p_gold_delta: amount
    });

    if (error || !finalStats) {
      console.error('Failed to apply gold delta:', error);
      return;
    }

    setData(prev => prev ? { ...prev, character_stats: finalStats as CharacterStats } : prev);
  };

  // Pure local-state sync — refetches the real player_progress row and mirrors
  // it into character_stats, WITHOUT going through apply_progress_update/
  // apply_progress_deltas. Those two push another server-side delta on top of
  // whatever's already there; this is for when a different SECURITY DEFINER
  // RPC (e.g. respond_to_trade) already made its own atomic gold/xp write
  // elsewhere, so re-deriving and re-applying a "delta" here would double-
  // apply that change. See applyGoldDelta/updateStatsAndJournal above for the
  // delta-applying counterparts, and MonsterGuild's onGoldSynced for the same
  // distinction on the Tutor-Curio path.
  const syncCharacterStats = async () => {
    const fresh = await fetchPlayerProgress(userId);
    if (!fresh) return;
    setProgress(fresh);
    setData(prev => prev
      ? { ...prev, character_stats: { level: fresh.level, xp: fresh.xp, gold: fresh.gold } }
      : prev);
  };

  return { data, loading, updateStatsAndJournal, currentSunday, applyGoldDelta, bumpCounters, syncCharacterStats };
}