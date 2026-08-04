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

      if (fetchError) {
        // Never fall through to the "no row yet" branch on a fetch failure —
        // that branch carries forward (or defaults) progress and writes it,
        // so treating a transient/RLS error as "this week hasn't started"
        // would silently stomp real progress with level-1 defaults.
        console.error('Failed to fetch this week\'s package:', fetchError);
        setLoading(false);
        return;
      }

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
      dummy_battles_won: newDummyBattlesWon
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