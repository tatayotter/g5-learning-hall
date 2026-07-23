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
    title: 'Novice Squire',
    description: 'The Ledger has begun to notice your name. Level up to 2 to show your commitment.',
    criteria: (d) => d.character_stats.level >= 2, 
    xpReward: 50, 
    goldReward: 25 
  },
  { 
    id: 'elite_stats',
    title: 'Elite Stats',
    description: 'Your thread of the Ledger runs thick and steady now. Reach Level 15.',
    criteria: (d) => d.character_stats.level >= 15, 
    xpReward: 500, 
    goldReward: 250 
  },
  { 
    id: 'first_blood',
    title: 'First Blood Victory',
    description: 'The first lesson conquered. Complete your first mastery.',
    criteria: (d) => (d.mastery_count || 0) >= 1, 
    xpReward: 50, 
    goldReward: 50 
  },
  { 
    id: 'portfolio_build',
    title: 'Elite Portfolio',
    description: 'Your work speaks for itself. Attain 10 masteries.',
    criteria: (d) => (d.mastery_count || 0) >= 10, 
    xpReward: 400, 
    goldReward: 200 
  },
  { 
    id: 'first_reflection',
    title: 'First Reflection',
    description: 'Reflect on your progress. Submit your first journal entry.',
    criteria: (d) => Object.keys(d.journal_logs || {}).length >= 1, 
    xpReward: 50, 
    goldReward: 25 
  },
  { 
    id: 'weekly_streak',
    title: 'Weekly Streak',
    description: 'Consistency is key to mastery. Log 7 journal entries.',
    criteria: (d) => Object.keys(d.journal_logs || {}).length >= 7, 
    xpReward: 350, 
    goldReward: 200 
  },
  { 
    id: 'copper_sack',
    title: 'Copper Sack',
    description: 'The world\'s gratitude, in coin. Amass 100 Gold in your wallet.',
    criteria: (d) => d.character_stats.gold >= 100, 
    xpReward: 50, 
    goldReward: 25 
  },
  { 
    id: 'fortune_seeker',
    title: 'Amass Fortune',
    description: 'A thousand thanks from a world that noticed. Amass 1,000 Gold.',
    criteria: (d) => d.character_stats.gold >= 1000, 
    xpReward: 500, 
    goldReward: 250 
  },
  { 
    id: 'vault_novice',
    title: 'Vault Novice',
    description: 'Spend your hard-earned gold. Make your first purchase.',
    criteria: (d) => (d.purchased_items || 0) >= 1, 
    xpReward: 50, 
    goldReward: 25 
  },
  { 
    id: 'activity_bounty',
    title: 'Activity Bounty',
    description: 'Recognized for excellence. Receive an activity bounty grant.',
    criteria: (d) => (d.honor_grants || 0) >= 1, 
    xpReward: 100, 
    goldReward: 50 
  },
  { 
    id: 'level_5',
    title: 'Train Hard',
    description: 'Every watch-post is a little safer for it. Reach Level 5.',
    criteria: (d) => d.character_stats.level >= 5, 
    xpReward: 150, 
    goldReward: 75 
  },
  { 
    id: 'ultimate_status',
    title: 'Ultimate Status',
    description: 'The world keeps a record of keepers like you. Reach Level 20.',
    criteria: (d) => d.character_stats.level >= 20, 
    xpReward: 1000, 
    goldReward: 500 
  },
  { 
    id: 'academic_assignments',
    title: 'Academic Mastery',
    description: 'Versatility in studies. Complete 3 academic masteries.',
    criteria: (d) => (d.mastery_count || 0) >= 3, 
    xpReward: 100, 
    goldReward: 50 
  },
  { 
    id: 'mastery_shatter',
    title: 'Shatter Expectations',
    description: 'Shatter expectations. Achieve 15 masteries total.',
    criteria: (d) => (d.mastery_count || 0) >= 15, 
    xpReward: 600, 
    goldReward: 300 
  },
  { 
    id: 'consistency_3',
    title: 'Journal Consistency',
    description: 'Establishing a rhythm. Submit 3 journal logs.',
    criteria: (d) => Object.keys(d.journal_logs || {}).length >= 3, 
    xpReward: 100, 
    goldReward: 50 
  },
  { 
    id: 'ledger_archive',
    title: 'Ledger Archive',
    description: 'A detailed history of your growth. Archive 10 logs.',
    criteria: (d) => Object.keys(d.journal_logs || {}).length >= 10, 
    xpReward: 500, 
    goldReward: 250 
  },
  { 
    id: 'merchant_assoc',
    title: 'Merchant Associate',
    description: 'A respectable sum of the world\'s gratitude. Reach 300 Gold balance.',
    criteria: (d) => d.character_stats.gold >= 300, 
    xpReward: 100, 
    goldReward: 50 
  },
  { 
    id: 'legendary_bank',
    title: 'Legendary Balance',
    description: 'Your coffers overflow with a world\'s thanks. Reach 1,500 Gold balance.',
    criteria: (d) => d.character_stats.gold >= 1500, 
    xpReward: 800, 
    goldReward: 400 
  },
  { 
    id: 'vault_reward_5',
    title: 'Vault Reward x5',
    description: 'You have been shopping! Claim 5 rewards from the vault.',
    criteria: (d) => (d.purchased_items || 0) >= 5, 
    xpReward: 200, 
    goldReward: 100 
  },
  { 
    id: 'excellent_deeds_3',
    title: '3 Honor Grants',
    description: 'Actions speak louder than words. Receive 3 honor grants.',
    criteria: (d) => (d.honor_grants || 0) >= 3, 
    xpReward: 250, 
    goldReward: 125 
  },
  { 
    id: 'level_10',
    title: 'Threshold Level 10',
    description: 'A seasoned keeper now, trusted with more of the Ledger. Reach Level 10.',
    criteria: (d) => d.character_stats.level >= 10, 
    xpReward: 300, 
    goldReward: 150 
  },
  { 
    id: 'limit_breaker',
    title: 'Limit Breaker',
    description: 'Few watch-posts have ever had a keeper this reliable. Reach Level 25.',
    criteria: (d) => d.character_stats.level >= 25, 
    xpReward: 1500, 
    goldReward: 750 
  },
  { 
    id: 'tactical_master',
    title: 'Tactical Master',
    description: 'Strategic planning pays off. Complete 5 quests.',
    criteria: (d) => (d.mastery_count || 0) >= 5, 
    xpReward: 200, 
    goldReward: 100 
  },
  { 
    id: 'wipeout_20',
    title: 'Wipe Out',
    description: 'Total mastery of the curriculum. Complete 20 quests.',
    criteria: (d) => (d.mastery_count || 0) >= 20, 
    xpReward: 1200, 
    goldReward: 600 
  },
  { 
    id: 'travel_logs_5',
    title: 'Travel Logs',
    description: 'Documenting your journey. Complete 5 journal logs.',
    criteria: (d) => Object.keys(d.journal_logs || {}).length >= 5, 
    xpReward: 150, 
    goldReward: 75 
  },
  { 
    id: 'habit_builder',
    title: 'Habit Builder',
    description: 'Your discipline is legendary. Submit 15 journal logs.',
    criteria: (d) => Object.keys(d.journal_logs || {}).length >= 15, 
    xpReward: 800, 
    goldReward: 400 
  },
  { 
    id: 'wealthy_hoarder',
    title: 'Wealthy Hoarder',
    description: 'The world\'s gratitude piles up. Amass 500 Gold.',
    criteria: (d) => d.character_stats.gold >= 500, 
    xpReward: 200, 
    goldReward: 100 
  },
  { 
    id: 'staggering_wealth',
    title: 'Staggering Wealth',
    description: 'A whole world\'s worth of thanks, in your keeping. Amass 2,000 Gold.',
    criteria: (d) => d.character_stats.gold >= 2000, 
    xpReward: 1200, 
    goldReward: 600 
  },
  { 
    id: 'cash_out_10',
    title: 'Cash Out',
    description: 'Stocking the inventory. Purchase 10 items from the vault.',
    criteria: (d) => (d.purchased_items || 0) >= 10, 
    xpReward: 400, 
    goldReward: 200 
  },
  { 
    id: 'outstanding_help_5',
    title: 'Outstanding Help',
    description: 'Your character is a beacon. Receive 5 honor grants.',
    criteria: (d) => (d.honor_grants || 0) >= 5, 
    xpReward: 600, 
    goldReward: 300 
  },
// ─── SIDE QUEST GUILD ACHIEVEMENTS ───────────────────────────────────────
  {
    id: 'guild_initiate',
    title: 'Guild Initiate',
    description: 'Step into the guild halls for the first time. Complete 1 side quest session.',
    criteria: (d) => (d.guild_sessions_count || 0) >= 1,
    xpReward: 50,
    goldReward: 25
  },
  {
    id: 'guild_regular',
    title: 'Guild Regular',
    description: 'You are becoming a fixture in the halls. Complete 5 guild sessions.',
    criteria: (d) => (d.guild_sessions_count || 0) >= 5,
    xpReward: 100,
    goldReward: 50
  },
  {
    id: 'guild_veteran',
    title: 'Guild Veteran',
    description: 'A seasoned warrior of the side quests. Complete 15 guild sessions.',
    criteria: (d) => (d.guild_sessions_count || 0) >= 15,
    xpReward: 200,
    goldReward: 100
  },
  {
    id: 'guild_champion',
    title: 'Guild Champion',
    description: 'You have proven yourself across all halls. Complete 30 guild sessions.',
    criteria: (d) => (d.guild_sessions_count || 0) >= 30,
    xpReward: 400,
    goldReward: 200
  },
  {
    id: 'guild_legend',
    title: 'Guild Legend',
    description: 'Your name is etched into the guild walls. Complete 50 guild sessions.',
    criteria: (d) => (d.guild_sessions_count || 0) >= 50,
    xpReward: 800,
    goldReward: 400
  },

  // ─── PERFECT QUIZ ACHIEVEMENTS ────────────────────────────────────────────
  {
    id: 'perfect_strike',
    title: 'Perfect Strike',
    description: 'Flawless execution. Achieve your first perfect quiz score.',
    criteria: (d) => (d.perfect_quizzes || 0) >= 1,
    xpReward: 75,
    goldReward: 50
  },
  {
    id: 'perfect_trio',
    title: 'Perfect Trio',
    description: 'Three perfect scores. You are sharper than most. Achieve 3 perfect quizzes.',
    criteria: (d) => (d.perfect_quizzes || 0) >= 3,
    xpReward: 150,
    goldReward: 75
  },
  {
    id: 'perfect_machine',
    title: 'Perfect Machine',
    description: 'Relentless accuracy. Achieve 10 perfect quiz scores.',
    criteria: (d) => (d.perfect_quizzes || 0) >= 10,
    xpReward: 400,
    goldReward: 200
  },
  {
    id: 'perfect_legend',
    title: 'Perfect Legend',
    description: 'You never miss. Achieve 20 perfect quiz scores.',
    criteria: (d) => (d.perfect_quizzes || 0) >= 20,
    xpReward: 1000,
    goldReward: 500
  },

  // ─── MONSTER GUILD ACHIEVEMENTS ───────────────────────────────────────────
  {
    id: 'monster_tamer',
    title: 'Monster Tamer',
    description: 'Your first victory in the Monster Guild. Win 1 trainer battle.',
    criteria: (d) => (d.monster_battles_won || 0) >= 1,
    xpReward: 75,
    goldReward: 50
  },
  {
    id: 'battle_hardened',
    title: 'Battle Hardened',
    description: 'You have fought and won many times. Win 5 trainer battles.',
    criteria: (d) => (d.monster_battles_won || 0) >= 5,
    xpReward: 150,
    goldReward: 75
  },
  {
    id: 'trainer_slayer',
    title: 'Trainer Slayer',
    description: 'Trainers fear your name. Win 15 trainer battles.',
    criteria: (d) => (d.monster_battles_won || 0) >= 15,
    xpReward: 300,
    goldReward: 150
  },
  {
    id: 'monster_overlord',
    title: 'Monster Overlord',
    description: 'You reign supreme over all trainers. Win 30 trainer battles.',
    criteria: (d) => (d.monster_battles_won || 0) >= 30,
    xpReward: 600,
    goldReward: 300
  },

  // ─── PVP BATTLE ACHIEVEMENTS ──────────────────────────────────────────────
  {
    id: 'sibling_rival',
    title: 'Rival Slayer',
    description: 'The rivalry begins. Win your first live PvP battle.',
    criteria: (d) => (d.sibling_battles_won || 0) >= 1,
    xpReward: 100,
    goldReward: 50
  },
  {
    id: 'sibling_dominator',
    title: 'PvP Dominator',
    description: 'No one can stop you. Win 5 live PvP battles.',
    criteria: (d) => (d.sibling_battles_won || 0) >= 5,
    xpReward: 300,
    goldReward: 150
  },
  {
    id: 'family_champion',
    title: 'Arena Champion',
    description: 'The undisputed champion of the arena. Win 10 live PvP battles.',
    criteria: (d) => (d.sibling_battles_won || 0) >= 10,
    xpReward: 600,
    goldReward: 300
  },

  // ─── TRAINING DUMMY ACHIEVEMENTS ──────────────────────────────────────────
  {
    id: 'bully',
    title: 'Bully',
    description: 'Pick on someone your own size. Win 10 Training Dummy battles.',
    criteria: (d) => (d.dummy_battles_won || 0) >= 10,
    xpReward: 100,
    goldReward: 50
  },
  {
    id: 'mega_bully',
    title: 'Mega Bully',
    description: 'The dummy never stood a chance. Win 100 Training Dummy battles.',
    criteria: (d) => (d.dummy_battles_won || 0) >= 100,
    xpReward: 300,
    goldReward: 150
  },
  {
    id: 'fbi_open_up',
    title: 'FBI Open Up!',
    description: 'Someone call for help. Win 1,000 Training Dummy battles.',
    criteria: (d) => (d.dummy_battles_won || 0) >= 1000,
    xpReward: 600,
    goldReward: 300
  },
];