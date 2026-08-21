// lib/botProfiles.ts
// Simulated G5 classmate bots — Filipino names with "bot" embedded in each
// surname. All progression is purely deterministic date math; nothing is ever
// written to the database.

import { MONSTERS, getScaledStats } from '@/lib/monsterConfig';
import { ActiveBattleMonster, UserMonster } from '@/components/battle/shared';

export interface BotProfile {
  /** Acts as the userId for presence/leaderboard — unique across all bots. */
  id: string;
  firstName: string;
  fullName: string;
  gender: 'boy' | 'girl';
  grade: string;
  /**
   * Fraction of questions the bot "answers correctly" per round (0–1).
   * Used in useLiveBattle's bot mode to randomise correctCount.
   */
  accuracy: number;
  /** Training-map home tile — bot wanders within ±3 tiles of this point. */
  homeX: number;
  homeY: number;
  /** Exactly 3 monster IDs from lib/monsterConfig MONSTERS. */
  monsterIds: [string, string, string];
  // ── Progression parameters ────────────────────────────────────────────────
  /** ISO date string: when the bot "started playing". */
  startDate: string;
  baseLevel: number;
  levelsPerWeek: number;
  questionsPerWeek: number;
  monstersPerWeek: number;
  trainerWinsPerWeek: number;
  liveWinsPerWeek: number;
}

export const BOT_PROFILES: BotProfile[] = [
  // ── Easy ──────────────────────────────────────────────────────────────────
  {
    id: 'bote_john',
    firstName: 'John', fullName: 'John Bote', gender: 'boy', grade: 'G5',
    accuracy: 0.35,
    homeX: 7, homeY: 5,
    monsterIds: ['torrenth', 'fernix', 'shadrak'],
    startDate: '2026-06-09', baseLevel: 1,
    levelsPerWeek: 0.8, questionsPerWeek: 18,
    monstersPerWeek: 0.7, trainerWinsPerWeek: 0.5, liveWinsPerWeek: 0.2,
  },
  {
    id: 'abotig_anna',
    firstName: 'Anna', fullName: 'Anna Abotig', gender: 'girl', grade: 'G5',
    accuracy: 0.45,
    homeX: 13, homeY: 3,
    monsterIds: ['solarch', 'fernix', 'torrenth'],
    startDate: '2026-06-12', baseLevel: 1,
    levelsPerWeek: 1.0, questionsPerWeek: 22,
    monstersPerWeek: 0.8, trainerWinsPerWeek: 0.6, liveWinsPerWeek: 0.3,
  },
  // ── Mild ──────────────────────────────────────────────────────────────────
  {
    id: 'kibot_rose',
    firstName: 'Rose', fullName: 'Rose Kibot', gender: 'girl', grade: 'G5',
    accuracy: 0.50,
    homeX: 5, homeY: 12,
    monsterIds: ['pyravex', 'voltmane', 'solarch'],
    startDate: '2026-06-09', baseLevel: 1,
    levelsPerWeek: 1.1, questionsPerWeek: 28,
    monstersPerWeek: 0.9, trainerWinsPerWeek: 0.8, liveWinsPerWeek: 0.3,
  },
  {
    id: 'gabot_kyle',
    firstName: 'Kyle', fullName: 'Kyle Gabot', gender: 'boy', grade: 'G5',
    accuracy: 0.55,
    homeX: 18, homeY: 8,
    monsterIds: ['voltmane', 'shadrak', 'pyravex'],
    startDate: '2026-06-09', baseLevel: 2,
    levelsPerWeek: 1.3, questionsPerWeek: 32,
    monstersPerWeek: 1.0, trainerWinsPerWeek: 1.0, liveWinsPerWeek: 0.4,
  },
  // ── Medium ────────────────────────────────────────────────────────────────
  {
    id: 'botero_chloe',
    firstName: 'Chloe', fullName: 'Chloe Botero', gender: 'girl', grade: 'G5',
    accuracy: 0.60,
    homeX: 10, homeY: 14,
    monsterIds: ['fernix', 'solarch', 'torrenth'],
    startDate: '2026-06-06', baseLevel: 2,
    levelsPerWeek: 1.5, questionsPerWeek: 38,
    monstersPerWeek: 1.2, trainerWinsPerWeek: 1.2, liveWinsPerWeek: 0.5,
  },
  {
    id: 'cabote_josh',
    firstName: 'Josh', fullName: 'Josh Cabote', gender: 'boy', grade: 'G5',
    accuracy: 0.65,
    homeX: 15, homeY: 11,
    monsterIds: ['shadrak', 'voltmane', 'fernix'],
    startDate: '2026-06-03', baseLevel: 3,
    levelsPerWeek: 1.6, questionsPerWeek: 42,
    monstersPerWeek: 1.3, trainerWinsPerWeek: 1.4, liveWinsPerWeek: 0.6,
  },
  // ── Medium-Hard ───────────────────────────────────────────────────────────
  {
    id: 'abot_ian',
    firstName: 'Ian', fullName: 'Ian Abot', gender: 'boy', grade: 'G5',
    accuracy: 0.70,
    homeX: 3, homeY: 8,
    monsterIds: ['pyravex', 'torrenth', 'voltmane'],
    startDate: '2026-06-01', baseLevel: 3,
    levelsPerWeek: 1.8, questionsPerWeek: 48,
    monstersPerWeek: 1.5, trainerWinsPerWeek: 1.6, liveWinsPerWeek: 0.8,
  },
  // ── Hard ──────────────────────────────────────────────────────────────────
  {
    id: 'sabot_kent',
    firstName: 'Kent', fullName: 'Kent Sabot', gender: 'boy', grade: 'G5',
    accuracy: 0.75,
    homeX: 16, homeY: 4,
    monsterIds: ['voltmane', 'pyravex', 'shadrak'],
    startDate: '2026-05-28', baseLevel: 4,
    levelsPerWeek: 2.0, questionsPerWeek: 55,
    monstersPerWeek: 1.7, trainerWinsPerWeek: 2.0, liveWinsPerWeek: 1.0,
  },
  {
    id: 'labot_mark',
    firstName: 'Mark', fullName: 'Mark Labot', gender: 'boy', grade: 'G5',
    accuracy: 0.80,
    homeX: 8, homeY: 15,
    monsterIds: ['torrenth', 'solarch', 'fernix'],
    startDate: '2026-05-25', baseLevel: 5,
    levelsPerWeek: 2.2, questionsPerWeek: 60,
    monstersPerWeek: 2.0, trainerWinsPerWeek: 2.2, liveWinsPerWeek: 1.2,
  },
  // ── Boss-tier ─────────────────────────────────────────────────────────────
  {
    id: 'tibot_clark',
    firstName: 'Clark', fullName: 'Clark Tibot', gender: 'boy', grade: 'G5',
    accuracy: 0.88,
    homeX: 12, homeY: 7,
    monsterIds: ['shadrak', 'pyravex', 'voltmane'],
    startDate: '2026-05-20', baseLevel: 6,
    levelsPerWeek: 2.5, questionsPerWeek: 70,
    monstersPerWeek: 2.3, trainerWinsPerWeek: 2.5, liveWinsPerWeek: 1.5,
  },
];

/** Quick Set for O(1) bot detection anywhere in the app. */
export const BOT_IDS = new Set(BOT_PROFILES.map(b => b.id));

// ── Progression ───────────────────────────────────────────────────────────────

function weeksSince(isoDate: string, now: Date): number {
  const start = new Date(isoDate);
  return Math.max(0, (now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
}

export interface BotProgress {
  level: number;
  gold: number;
  questionsAnswered: number;
  monstersCollected: number;
  trainerBattlesWon: number;
  liveBattleWins: number;
}

/**
 * Returns a bot's current stats as of `now` (defaults to today).
 * Fully deterministic — same inputs always produce the same output.
 */
export function getBotProgress(bot: BotProfile, now: Date = new Date()): BotProgress {
  const weeks = weeksSince(bot.startDate, now);
  const level            = Math.min(50, bot.baseLevel + Math.floor(weeks * bot.levelsPerWeek));
  const questionsAnswered = Math.floor(weeks * bot.questionsPerWeek);
  const monstersCollected = bot.monsterIds.length + Math.floor(weeks * bot.monstersPerWeek);
  const trainerBattlesWon = Math.floor(weeks * bot.trainerWinsPerWeek);
  const liveBattleWins    = Math.floor(weeks * bot.liveWinsPerWeek);
  const gold              = questionsAnswered * 2 + trainerBattlesWon * 15 + liveBattleWins * 30;
  return { level, gold, questionsAnswered, monstersCollected, trainerBattlesWon, liveBattleWins };
}

// ── Battle team ───────────────────────────────────────────────────────────────

/**
 * Builds a 3-monster ActiveBattleMonster[] for `bot` at their current level.
 * Mirrors MonsterGuild's buildPlayerTeam() shape so LiveBattleScreen renders
 * the opponent side correctly.
 */
export function buildBotTeam(bot: BotProfile, now: Date = new Date()): ActiveBattleMonster[] {
  const { level } = getBotProgress(bot, now);
  return bot.monsterIds.map((monsterId, i) => {
    const def = MONSTERS[monsterId];
    if (!def) throw new Error(`Bot team: unknown monster id "${monsterId}"`);
    const { hp } = getScaledStats(def, level, 'normal');
    const userMonster: UserMonster = {
      id: `${bot.id}_m${i}`,
      user_id: bot.id,
      monster_id: monsterId,
      nickname: null,
      monster_exp: (level - 1) * 100,
      monster_level: level,
      slot: i,
      rest_used: 0,
      equipped_skills: [null, null, null],
      graduation_tier: 0,
      quality: 'normal',
    };
    return {
      def,
      level,
      currentHp: hp,
      maxHp: hp,
      status: null,
      statusTurns: 0,
      restUsed: 0,
      userMonster,
      modifiers: [],
    } as ActiveBattleMonster;
  });
}
