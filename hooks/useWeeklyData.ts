// hooks/useWeeklyData.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { startOfWeek, format } from 'date-fns';
import { ACHIEVEMENTS, Achievement } from '@/lib/achievements';
import { logAction } from '@/lib/playerlog';
import { USERS, UserId } from '@/lib/userSession';

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
      // Fetch this week's row for the specific user
      const { data: packageData, error: fetchError } = await supabase
        .from('weekly_packages')
        .select('*')
        .eq('week_starting_date', currentSunday)
        .eq('user_id', userId)
        .maybeSingle();

      const applyContentSource = async (row: WeeklyData): Promise<WeeklyData> => {
        if (contentSourceId === userId) return row;
        const { data: sourceRow } = await supabase
          .from('weekly_packages')
          .select('package_data')
          .eq('week_starting_date', currentSunday)
          .eq('user_id', contentSourceId)
          .maybeSingle();
        return sourceRow?.package_data ? { ...row, package_data: sourceRow.package_data } : row;
      };

      if (packageData) {
        setData(await applyContentSource(packageData as WeeklyData));
      } else {
        // No row for this week yet — carry forward progress from most recent past week
        const { data: previousWeek } = await supabase
          .from('weekly_packages')
          .select('character_stats, achievements, mastery_count, purchased_items, honor_grants')
          .eq('user_id', userId)
          .lt('week_starting_date', currentSunday)
          .order('week_starting_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        const defaultRow = {
          week_starting_date: currentSunday,
          user_id: userId,
          package_data: {},
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
          perfect_quizzes: 0
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
      setLoading(false);
    }
    fetchData();
  }, [currentSunday, userId, contentSourceId]);

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
    newPerfectQuizzes: number = data?.perfect_quizzes || 0
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
        perfect_quizzes: newPerfectQuizzes
      })) {
        newUnlocked[ach.id] = true;
        addedXp += ach.xpReward;
        addedGold += ach.goldReward;
        newlyUnlockedTitles.push({ title: ach.title, xp: ach.xpReward, gold: ach.goldReward });
      }
    });

    newlyUnlockedTitles.forEach(({ title, xp, gold }) => {
      logAction(userId, currentSunday, 'achievement', `Unlocked achievement: ${title}`, xp, gold);
    });

    // Apply achievement rewards then re-run level-up loop
    // so XP from achievements doesn't overflow without levelling up
    let finalXp = newStats.xp + addedXp;
    let finalLevel = newStats.level;
    while (finalXp >= (500 + finalLevel * 100)) {
      finalXp -= (500 + finalLevel * 100);
      finalLevel += 1;
    }

    const finalStats = {
      ...newStats,
      xp: finalXp,
      level: finalLevel,
      gold: newStats.gold + addedGold
    };

    const updatedData = {
      ...data,
      character_stats: finalStats,
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
      perfect_quizzes: newPerfectQuizzes
    };

    setData(updatedData);

    const { error } = await supabase
      .from('weekly_packages')
      .update({
        character_stats: finalStats,
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
        perfect_quizzes: newPerfectQuizzes
      })
      .eq('week_starting_date', data.week_starting_date)
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to save to Supabase:', error);
      alert(`⚠️ Save failed: ${error.message}`);
    }
  };

  return { data, loading, updateStatsAndJournal, currentSunday };
}