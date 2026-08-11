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
// same answer-stripping guarantee weekly_packages_public used to provide, enforced here by
// content_questions_public (which never exposes it) rather than a client-side strip.
async function fetchGradeContent(grade: number, weekStartingDate: string): Promise<any> {
  const { data: week } = await supabase
    .from('content_weeks')
    .select('id')
    .eq('grade', grade)
    .eq('week_starting_date', weekStartingDate)
    .maybeSingle();
  if (!week) return {};

  const { data: rows, error } = await supabase
    .from('content_questions_public')
    .select('id, prompt, options, sort_order, subject, weekday, summary_markdown')
    .eq('content_week_id', week.id)
    .order('sort_order');
  if (error || !rows) return {};

  const byDay: Record<string, Record<string, { summary_markdown?: string; quiz: any[] }>> = {};
  rows.forEach((r: any) => {
    if (!byDay[r.weekday]) byDay[r.weekday] = {};
    if (!byDay[r.weekday][r.subject]) {
      byDay[r.weekday][r.subject] = { summary_markdown: r.summary_markdown ?? undefined, quiz: [] };
    }
    byDay[r.weekday][r.subject].quiz.push({ id: r.id, question: r.prompt, options: r.options });
  });
  return byDay;
}

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
  // (self-heals via the Phase 3 trigger next fetch); it's only used to project what an
  // in-flight counter update will become lifetime-wise, not as a write target itself.
  const [progress, setProgress] = useState<PlayerProgress | null>(null);

  useEffect(() => {
    fetchPlayerProgress(userId).then(setProgress);
  }, [userId]);

  const today = new Date();
  const currentSunday = format(startOfWeek(today), 'yyyy-MM-dd');

  // Content is grade-keyed, not per-student (Phase 4 Wave 3, see
  // docs/weekly-progress-redesign-plan.md) — replaces the old contentSourceId
  // indirection where classmates read a reference player's package_data.
  const grade = gradeToNumber(USERS[userId as UserId]?.grade);

  useEffect(() => {
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

      // weekly_packages RLS only grants access to the `authenticated` role, which
      // this app's anonymous-auth bridge (lib/supabase.ts) provides — but that
      // sign-in happens in a separate effect (userSession.linkIdentity), so without
      // waiting here this fetch can race ahead on the unauthenticated `anon` role
      // and get rejected.
      await ensureAnonymousSession();

      // journal_logs/counters/character_stats still come from weekly_packages (Wave 1/2 left
      // this write path unchanged — only where progress/content are READ from has moved).
      // package_data itself is ignored below in favor of the grade-keyed content fetch.
      const [{ data: packageData, error: fetchError }, gradeContent] = await Promise.all([
        supabase
          .from('weekly_packages_public')
          .select('*')
          .eq('week_starting_date', currentSunday)
          .eq('user_id', userId)
          .maybeSingle(),
        fetchGradeContent(grade, currentSunday),
      ]);

      if (fetchError) {
        // Never fall through to the "no row yet" branch on a fetch failure —
        // that branch carries forward (or defaults) progress and writes it,
        // so treating a transient/RLS error as "this week hasn't started"
        // would silently stomp real progress with level-1 defaults.
        console.error('Failed to fetch this week\'s package:', fetchError);
        setLoading(false);
        return;
      }

      const applyContent = (row: WeeklyData): WeeklyData => ({ ...row, package_data: gradeContent });

      if (packageData && packageData.character_stats) {
        setData(applyContent(packageData as WeeklyData));
      } else {
        // Either no row for this week yet, or an admin pre-staged the week's
        // package_data ahead of time (character_stats left null as the "not
        // started" marker) — in both cases, carry forward progress from the
        // most recent past week now that this week has actually begun.
        const { data: previousWeek, error: previousWeekError } = await supabase
          .from('weekly_packages')
          .select('character_stats, achievements, mastery_count, purchased_items, honor_grants')
          .eq('user_id', userId)
          .lt('week_starting_date', currentSunday)
          .order('week_starting_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (previousWeekError) {
          // Same reasoning as the fetchError guard above: an error here must
          // not be treated as "no previous week exists" — that would carry
          // forward (and persist) level-1/0-xp/0-gold defaults over a real
          // prior week's progress. This is exactly the bug that reset Tala
          // and Damien's levels — bail out and let the next load retry.
          console.error('Failed to fetch previous week for carry-forward:', previousWeekError);
          setLoading(false);
          return;
        }

        const carriedForward = {
          character_stats: previousWeek?.character_stats || { level: 1, xp: 0, gold: 0 },
          journal_logs: {},
          achievements: previousWeek?.achievements || {},
          mastery_count: previousWeek?.mastery_count || 0,
          purchased_items: previousWeek?.purchased_items || 0,
          honor_grants: previousWeek?.honor_grants || 0,
          quiz_attempts: {},
          mastered_quizzes: [],
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
          tatay_battles_lost: 0
        };

        if (packageData) {
          // Pre-staged row: keep its package_data, fill in the carried-forward stats.
          const { data: updated, error: updateError } = await supabase
            .from('weekly_packages')
            .update(carriedForward)
            .eq('id', packageData.id)
            .select()
            .single();

          if (updated) {
            setData(applyContent(updated as WeeklyData));
          } else if (updateError) {
            console.error('Failed to initialize pre-staged weekly package:', updateError);
          }
        } else {
          const defaultRow = {
            week_starting_date: currentSunday,
            user_id: userId,
            package_data: {},
            ...carriedForward
          };

          const { data: inserted, error: insertError } = await supabase
            .from('weekly_packages')
            .insert(defaultRow)
            .select()
            .single();

          if (inserted) {
            setData(applyContent(inserted as WeeklyData));
          } else if (insertError) {
            console.error('Failed to create new weekly package:', insertError);
          }
        }
      }
      setLoading(false);
    }
    fetchData();
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

    // Everything but character_stats (applied atomically, online via RPC or
    // offline via a locally-applied delta) — kept as its own object so the
    // plain .update() below can't re-write character_stats with a stale value.
    const otherChanges = {
      journal_logs: newJournal,
      achievements: newUnlocked,
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
      const updated = { ...data, character_stats: finalStats, ...otherChanges };
      setData(updated);
      await cacheWeeklyData(userId, updated);
      await enqueueSync('apply_character_deltas', 'rpc', {
        userId, xpDelta, goldDelta,
      });
      await enqueueSync('weekly_packages_other_changes', 'update', {
        userId, weekStartingDate: data.week_starting_date, otherChanges,
      });
      return;
    }

    // xp/gold/level now live on player_progress (lifetime, not week-keyed) — see
    // apply_progress_deltas (Phase 1/4 of the progress redesign). This replaces
    // apply_character_deltas, which required a pre-existing weekly_packages row for the
    // given week and was the root cause of the carry-forward/null-sentinel bug class
    // (see docs/weekly-progress-redesign-plan.md). apply_progress_deltas auto-creates its
    // row on first use, so there's no carry-forward step to get wrong here anymore.
    const { data: finalStats, error: statsError } = await supabase.rpc('apply_progress_deltas', {
      p_user_id: userId,
      p_xp_delta: xpDelta,
      p_gold_delta: goldDelta
    });

    if (statsError || !finalStats) {
      console.error('Failed to apply character deltas:', statsError);
      alert(`⚠️ Save failed: ${statsError?.message}`);
      return;
    }

    setData({ ...data, character_stats: finalStats as CharacterStats, ...otherChanges });

    const { error } = await supabase
      .from('weekly_packages')
      .update(otherChanges)
      .eq('week_starting_date', data.week_starting_date)
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to save to Supabase:', error);
      alert(`⚠️ Save failed: ${error.message}`);
      return;
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

  return { data, loading, updateStatsAndJournal, currentSunday, applyGoldDelta, bumpCounters };
}