// hooks/useWeeklyData.ts
import { useState, useEffect } from 'react';
import { supabase, ensureAnonymousSession } from '@/lib/supabase';
import { startOfWeek, format } from 'date-fns';
import { ACHIEVEMENTS, Achievement } from '@/lib/achievements';
import { logAction } from '@/lib/playerlog';
import { USERS, UserId } from '@/lib/userSession';
import { isOfflineStorageAvailable, cacheWeeklyData, getCachedWeeklyData, enqueueSync } from '@/lib/localDataSource';
import { isAppOffline } from '@/lib/offlineState';

export interface CharacterStats {
  level: number;
  xp: number;
  gold: number;
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
}

export function useWeeklyData(userId: string = 'damien') {
  const [data, setData] = useState<WeeklyData | null>(null);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const currentSunday = format(startOfWeek(today), 'yyyy-MM-dd');

  // Classmates who don't author their own Main Quest content read questions
  // live from a reference player of the same grade (e.g. Damien), while their
  // own stats/journal/achievements/quiz history stay on their own row.
  const contentSourceId = USERS[userId as UserId]?.contentSourceId || userId;

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

      // Read from weekly_packages_public, which strips correct_answer out of
      // every quiz question — the real answers only ever live server-side,
      // checked by the grade_weekly_quiz RPC at submit time.
      const { data: packageData, error: fetchError } = await supabase
        .from('weekly_packages_public')
        .select('*')
        .eq('week_starting_date', currentSunday)
        .eq('user_id', userId)
        .maybeSingle();

      const applyContentSource = async (row: WeeklyData): Promise<WeeklyData> => {
        if (contentSourceId === userId) return row;
        const { data: sourceRow } = await supabase
          .from('weekly_packages_public')
          .select('package_data')
          .eq('week_starting_date', currentSunday)
          .eq('user_id', contentSourceId)
          .maybeSingle();
        return sourceRow?.package_data ? { ...row, package_data: sourceRow.package_data } : row;
      };

      if (packageData && packageData.character_stats) {
        setData(await applyContentSource(packageData as WeeklyData));
      } else {
        // Either no row for this week yet, or an admin pre-staged the week's
        // package_data ahead of time (character_stats left null as the "not
        // started" marker) — in both cases, carry forward progress from the
        // most recent past week now that this week has actually begun.
        const { data: previousWeek } = await supabase
          .from('weekly_packages')
          .select('character_stats, achievements, mastery_count, purchased_items, honor_grants')
          .eq('user_id', userId)
          .lt('week_starting_date', currentSunday)
          .order('week_starting_date', { ascending: false })
          .limit(1)
          .maybeSingle();

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
          dummy_battles_won: 0
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
            setData(await applyContentSource(updated as WeeklyData));
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
            setData(await applyContentSource(inserted as WeeklyData));
          } else if (insertError) {
            console.error('Failed to create new weekly package:', insertError);
          }
        }
      }
      setLoading(false);
    }
    fetchData();
  }, [currentSunday, userId, contentSourceId]);

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
    newDummyBattlesWon: number = data?.dummy_battles_won || 0
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
        guild_sessions_count: newGuildSessionsCount,
        monster_battles_won: newMonsterBattlesWon,
        sibling_battles_won: newSiblingBattlesWon,
        perfect_quizzes: newPerfectQuizzes,
        dummy_battles_won: newDummyBattlesWon
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
    const xpDelta = (newStats.xp - data.character_stats.xp) + addedXp;
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
      dummy_battles_won: newDummyBattlesWon
    };

    if (isOfflineStorageAvailable() && isAppOffline()) {
      // No RPC available offline — apply the delta locally (safe: offline
      // means single-device/single-session, no concurrent-save race to guard
      // against) and queue the same delta to replay against the real RPC
      // once back online, so the server-side atomicity guarantee still holds
      // for the eventual write.
      const finalStats: CharacterStats = {
        level: newStats.level,
        xp: data.character_stats.xp + xpDelta,
        gold: data.character_stats.gold + goldDelta,
      };
      const updated = { ...data, character_stats: finalStats, ...otherChanges };
      setData(updated);
      await cacheWeeklyData(userId, updated);
      await enqueueSync('apply_character_deltas', 'rpc', {
        userId, weekStartingDate: data.week_starting_date, xpDelta, goldDelta,
      });
      await enqueueSync('weekly_packages_other_changes', 'update', {
        userId, weekStartingDate: data.week_starting_date, otherChanges,
      });
      return;
    }

    const { data: finalStats, error: statsError } = await supabase.rpc('apply_character_deltas', {
      p_user_id: userId,
      p_week_starting_date: data.week_starting_date,
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
    }
  };

  const applyGoldDelta = async (amount: number) => {
    if (!data) return;

    if (isOfflineStorageAvailable() && isAppOffline()) {
      const finalStats: CharacterStats = { ...data.character_stats, gold: data.character_stats.gold + amount };
      const updated = { ...data, character_stats: finalStats };
      setData(updated);
      await cacheWeeklyData(userId, updated);
      await enqueueSync('apply_character_deltas', 'rpc', {
        userId, weekStartingDate: data.week_starting_date, xpDelta: 0, goldDelta: amount,
      });
      return;
    }

    const { data: finalStats, error } = await supabase.rpc('apply_character_deltas', {
      p_user_id: userId,
      p_week_starting_date: data.week_starting_date,
      p_xp_delta: 0,
      p_gold_delta: amount
    });

    if (error || !finalStats) {
      console.error('Failed to apply gold delta:', error);
      return;
    }

    setData(prev => prev ? { ...prev, character_stats: finalStats as CharacterStats } : prev);
  };

  return { data, loading, updateStatsAndJournal, currentSunday, applyGoldDelta };
}