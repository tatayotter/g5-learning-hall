// lib/achievements.ts
import { WeeklyData } from '@/hooks/useWeeklyData';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  criteria: (data: any) => boolean;
  xpReward: number;
  goldReward: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  { 
    id: 'novice_squire', 
    title: '🌱 Novice Squire', 
    description: 'A humble beginning. Level up to 2 to show your commitment.',
    criteria: (d) => d.character_stats.level >= 2, 
    xpReward: 50, 
    goldReward: 25 
  },
  { 
    id: 'elite_stats', 
    title: '🔒 Elite Stats', 
    description: 'You are becoming a force to be reckoned with. Reach Level 15.',
    criteria: (d) => d.character_stats.level >= 15, 
    xpReward: 500, 
    goldReward: 250 
  },
  { 
    id: 'first_blood', 
    title: '🥇 First Blood Victory', 
    description: 'The first lesson conquered. Complete your first mastery.',
    criteria: (d) => (d.mastery_count || 0) >= 1, 
    xpReward: 50, 
    goldReward: 50 
  },
  { 
    id: 'portfolio_build', 
    title: '🔒 Elite Portfolio', 
    description: 'Your work speaks for itself. Attain 10 masteries.',
    criteria: (d) => (d.mastery_count || 0) >= 10, 
    xpReward: 400, 
    goldReward: 200 
  },
  { 
    id: 'first_reflection', 
    title: '🔒 First Reflection', 
    description: 'Reflect on your progress. Submit your first journal entry.',
    criteria: (d) => Object.keys(d.journal_logs || {}).length >= 1, 
    xpReward: 50, 
    goldReward: 25 
  },
  { 
    id: 'weekly_streak', 
    title: '🔒 Weekly Streak', 
    description: 'Consistency is key to mastery. Log 7 journal entries.',
    criteria: (d) => Object.keys(d.journal_logs || {}).length >= 7, 
    xpReward: 350, 
    goldReward: 200 
  },
  { 
    id: 'copper_sack', 
    title: '🪙 Copper Sack', 
    description: 'A small fortune. Amass 100 Gold in your wallet.',
    criteria: (d) => d.character_stats.gold >= 100, 
    xpReward: 50, 
    goldReward: 25 
  },
  { 
    id: 'fortune_seeker', 
    title: '🔒 Amass Fortune', 
    description: 'A true treasure hunter. Amass 1,000 Gold.',
    criteria: (d) => d.character_stats.gold >= 1000, 
    xpReward: 500, 
    goldReward: 250 
  },
  { 
    id: 'vault_novice', 
    title: '🔒 Vault Novice', 
    description: 'Spend your hard-earned gold. Make your first purchase.',
    criteria: (d) => (d.purchased_items || 0) >= 1, 
    xpReward: 50, 
    goldReward: 25 
  },
  { 
    id: 'activity_bounty', 
    title: '🔒 Activity Bounty', 
    description: 'Recognized for excellence. Receive an activity bounty grant.',
    criteria: (d) => (d.honor_grants || 0) >= 1, 
    xpReward: 100, 
    goldReward: 50 
  },
  { 
    id: 'level_5', 
    title: '🔒 Train Hard', 
    description: 'Training intensifies. Reach Level 5.',
    criteria: (d) => d.character_stats.level >= 5, 
    xpReward: 150, 
    goldReward: 75 
  },
  { 
    id: 'ultimate_status', 
    title: '🔒 Ultimate Status', 
    description: 'You have transcended expectations. Reach Level 20.',
    criteria: (d) => d.character_stats.level >= 20, 
    xpReward: 1000, 
    goldReward: 500 
  },
  { 
    id: 'academic_assignments', 
    title: '🔒 Academic Mastery', 
    description: 'Versatility in studies. Complete 3 academic masteries.',
    criteria: (d) => (d.mastery_count || 0) >= 3, 
    xpReward: 100, 
    goldReward: 50 
  },
  { 
    id: 'mastery_shatter', 
    title: '🔒 Shatter Expectations', 
    description: 'Shatter expectations. Achieve 15 masteries total.',
    criteria: (d) => (d.mastery_count || 0) >= 15, 
    xpReward: 600, 
    goldReward: 300 
  },
  { 
    id: 'consistency_3', 
    title: '🔒 Journal Consistency', 
    description: 'Establishing a rhythm. Submit 3 journal logs.',
    criteria: (d) => Object.keys(d.journal_logs || {}).length >= 3, 
    xpReward: 100, 
    goldReward: 50 
  },
  { 
    id: 'ledger_archive', 
    title: '🔒 Ledger Archive', 
    description: 'A detailed history of your growth. Archive 10 logs.',
    criteria: (d) => Object.keys(d.journal_logs || {}).length >= 10, 
    xpReward: 500, 
    goldReward: 250 
  },
  { 
    id: 'merchant_assoc', 
    title: '💼 Merchant Associate', 
    description: 'A respectable sum. Reach 300 Gold balance.',
    criteria: (d) => d.character_stats.gold >= 300, 
    xpReward: 100, 
    goldReward: 50 
  },
  { 
    id: 'legendary_bank', 
    title: '🔒 Legendary Balance', 
    description: 'Your coffers overflow. Reach 1,500 Gold balance.',
    criteria: (d) => d.character_stats.gold >= 1500, 
    xpReward: 800, 
    goldReward: 400 
  },
  { 
    id: 'vault_reward_5', 
    title: '🔒 Vault Reward x5', 
    description: 'You have been shopping! Claim 5 rewards from the vault.',
    criteria: (d) => (d.purchased_items || 0) >= 5, 
    xpReward: 200, 
    goldReward: 100 
  },
  { 
    id: 'excellent_deeds_3', 
    title: '🔒 3 Honor Grants', 
    description: 'Actions speak louder than words. Receive 3 honor grants.',
    criteria: (d) => (d.honor_grants || 0) >= 3, 
    xpReward: 250, 
    goldReward: 125 
  },
  { 
    id: 'level_10', 
    title: '🔒 Threshold Level 10', 
    description: 'A seasoned learner. Reach Level 10.',
    criteria: (d) => d.character_stats.level >= 10, 
    xpReward: 300, 
    goldReward: 150 
  },
  { 
    id: 'limit_breaker', 
    title: '🔒 Limit Breaker', 
    description: 'You have no limits. Reach Level 25.',
    criteria: (d) => d.character_stats.level >= 25, 
    xpReward: 1500, 
    goldReward: 750 
  },
  { 
    id: 'tactical_master', 
    title: '🔒 Tactical Master', 
    description: 'Strategic planning pays off. Complete 5 quests.',
    criteria: (d) => (d.mastery_count || 0) >= 5, 
    xpReward: 200, 
    goldReward: 100 
  },
  { 
    id: 'wipeout_20', 
    title: '🔒 Wipe Out', 
    description: 'Total mastery of the curriculum. Complete 20 quests.',
    criteria: (d) => (d.mastery_count || 0) >= 20, 
    xpReward: 1200, 
    goldReward: 600 
  },
  { 
    id: 'travel_logs_5', 
    title: '🔒 Travel Logs', 
    description: 'Documenting your journey. Complete 5 journal logs.',
    criteria: (d) => Object.keys(d.journal_logs || {}).length >= 5, 
    xpReward: 150, 
    goldReward: 75 
  },
  { 
    id: 'habit_builder', 
    title: '🔒 Habit Builder', 
    description: 'Your discipline is legendary. Submit 15 journal logs.',
    criteria: (d) => Object.keys(d.journal_logs || {}).length >= 15, 
    xpReward: 800, 
    goldReward: 400 
  },
  { 
    id: 'wealthy_hoarder', 
    title: '💰 Wealthy Hoarder', 
    description: 'The riches pile up. Amass 500 Gold.',
    criteria: (d) => d.character_stats.gold >= 500, 
    xpReward: 200, 
    goldReward: 100 
  },
  { 
    id: 'staggering_wealth', 
    title: '🔒 Staggering Wealth', 
    description: 'You have more than most kingdoms. Amass 2,000 Gold.',
    criteria: (d) => d.character_stats.gold >= 2000, 
    xpReward: 1200, 
    goldReward: 600 
  },
  { 
    id: 'cash_out_10', 
    title: '🔒 Cash Out', 
    description: 'Stocking the inventory. Purchase 10 items from the vault.',
    criteria: (d) => (d.purchased_items || 0) >= 10, 
    xpReward: 400, 
    goldReward: 200 
  },
  { 
    id: 'outstanding_help_5', 
    title: '🔒 Outstanding Help', 
    description: 'Your character is a beacon. Receive 5 honor grants.',
    criteria: (d) => (d.honor_grants || 0) >= 5, 
    xpReward: 600, 
    goldReward: 300 
  },
];