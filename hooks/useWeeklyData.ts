// hooks/useWeeklyData.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { startOfWeek, format } from 'date-fns';
import { ACHIEVEMENTS, Achievement } from '@/lib/achievements';

// 1. Define the shapes of our data
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
  character_stats: CharacterStats;
  journal_logs: Record<string, JournalEntry>;
  mastery_count: number;
  purchased_items: number;
  honor_grants: number;
  achievements: Record<string, boolean>;
  package_data?: any; // We can strictly type this later if needed
  quiz_attempts?: Record<string, number>;
  mastered_quizzes?: string[];
}

export function useWeeklyData() {
  // 2. Tell useState that 'data' can be either WeeklyData OR null
  const [data, setData] = useState<WeeklyData | null>(null);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const currentSunday = format(startOfWeek(today), 'yyyy-MM-dd');

  useEffect(() => {
    async function fetchData() {
      const { data: packageData, error: fetchError } = await supabase
        .from('weekly_packages')
        .select('*')
        .eq('week_starting_date', currentSunday)
        .single();

      console.log("Supabase Fetch Result:", { packageData, fetchError }); // ADD THIS LINE

      if (packageData) {
        setData(packageData as WeeklyData);
      } else {
        // No row for this week yet — carry forward persistent progress from the most recent past week
        const { data: previousWeek } = await supabase
          .from('weekly_packages')
          .select('character_stats, achievements, mastery_count, purchased_items, honor_grants')
          .lt('week_starting_date', currentSunday)
          .order('week_starting_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        const defaultRow = {
          week_starting_date: currentSunday,
          package_data: {},
          character_stats: previousWeek?.character_stats || { level: 1, xp: 0, gold: 0 },
          journal_logs: {},
          achievements: previousWeek?.achievements || {},
          mastery_count: previousWeek?.mastery_count || 0,
          purchased_items: previousWeek?.purchased_items || 0,
          honor_grants: previousWeek?.honor_grants || 0,
          quiz_attempts: {},
          mastered_quizzes: []
        };

        const { data: inserted, error: insertError } = await supabase
          .from('weekly_packages')
          .insert(defaultRow)
          .select()
          .single();

        if (inserted) {
          setData(inserted as WeeklyData);
        } else if (insertError) {
          console.error('Failed to create new weekly package:', insertError);
        }
      }
      setLoading(false);
    }
    fetchData();
  }, [currentSunday]);

  // 3. Add types to our function arguments
  // hooks/useWeeklyData.ts

const updateStatsAndJournal = async (
    newStats: CharacterStats,
    newJournal: Record<string, JournalEntry>,
    newPurchasedItems: number = data?.purchased_items || 0,
    newMasteryCount: number = data?.mastery_count || 0,
    newHonorGrants: number = data?.honor_grants || 0,
    newQuizAttempts: Record<string, number> = data?.quiz_attempts || {},
    newMasteredQuizzes: string[] = data?.mastered_quizzes || []
  ) => {
    console.log("🚀 updateStatsAndJournal triggered!");
    console.log("Current data state:", data);

    if (!data) {
        console.error("❌ Aborting update: data is null!");
        return;
    }

    // 1. Prepare current data state
    const currentAchievements = data.achievements || {};
    let addedXp = 0;
    let addedGold = 0;
    
    // Create a copy to track state changes
    const newUnlocked = { ...currentAchievements };

    // 2. Iterate through all achievements
    ACHIEVEMENTS.forEach((ach: Achievement) => {
      if (!newUnlocked[ach.id] && ach.criteria({ ...data, character_stats: newStats, journal_logs: newJournal, purchased_items: newPurchasedItems, mastery_count: newMasteryCount, honor_grants: newHonorGrants, quiz_attempts: newQuizAttempts, mastered_quizzes: newMasteredQuizzes })) {
        newUnlocked[ach.id] = true;
        addedXp += ach.xpReward;
        addedGold += ach.goldReward;
        console.log(`🎉 Achievement Unlocked: ${ach.title}. Rewards granted.`);
      }
    });

    const finalStats = {
      ...newStats,
      xp: newStats.xp + addedXp,
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
      mastered_quizzes: newMasteredQuizzes
    };

    setData(updatedData);
      
    console.log("Attempting to save to Supabase..."); 

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
        mastered_quizzes: newMasteredQuizzes
      })
      .eq('week_starting_date', data.week_starting_date);

    if (error) {
      console.error('❌ RAW ERROR OBJECT:', JSON.stringify(error, null, 2));
      alert(`Update Failed. Check Console for details.`);
    } else {
      console.log('✅ Supabase Update Successful');
    }
  };

  return { data, loading, updateStatsAndJournal, currentSunday };
}