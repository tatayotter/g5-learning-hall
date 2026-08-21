// lib/botProfiles.ts
// Simulated G5 classmate bots — Filipino names with "bot" embedded in each
// surname. All progression is purely deterministic date math; nothing is ever
// written to the database.

import { ALL_MONSTERS, getScaledStats } from '@/lib/monsterConfig';
import { ActiveBattleMonster, UserMonster } from '@/components/battle/shared';

export interface BotProfile {
  /** Acts as the userId for presence/leaderboard — unique across all bots. */
  id: string;
  firstName: string;
  fullName: string;
  gender: 'boy' | 'girl';
  grade: string;
  /** Path relative to /public — shown as the bot's avatar / userpic. */
  userpic: string;
  /**
   * Fraction of questions the bot "answers correctly" per round (0–1).
   * Used in useLiveBattle's bot mode to randomise correctCount.
   */
  accuracy: number;
  /** Training-map home tile — bot wanders within ±3 tiles of this point. */
  homeX: number;
  homeY: number;
  /**
   * The one starter curio chosen from the starter picker (MONSTERS).
   * Always owned; placed in the first team slot regardless of level.
   */
  starterId: string;
  /**
   * The two wild curios caught via Training-Map encounters (WILD_MONSTERS).
   * wildIds[0] becomes available when level ≥ 10 (second slot),
   * wildIds[1] when level ≥ 15 (third slot) — matching PLAYER_LEVEL_FOR_SLOT.
   */
  wildIds: [string, string];
  // ── Progression parameters ────────────────────────────────────────────────
  /** ISO date string: when the bot "started playing". */
  startDate: string;
  baseLevel: number;
  levelsPerWeek: number;
  questionsPerWeek: number;
  trainerWinsPerWeek: number;
  liveWinsPerWeek: number;
}

export const BOT_PROFILES: BotProfile[] = [
  // ── Easy ──────────────────────────────────────────────────────────────────
  {
    id: 'bote_john',
    firstName: 'John', fullName: 'John Bote', gender: 'boy', grade: 'G5',
    userpic: '/userpics/Spr_RS_School_Kid_M.png',
    accuracy: 0.35,
    homeX: 7, homeY: 5,
    starterId: 'torrenth',
    wildIds: ['mosshorn', 'duskral'],
    startDate: '2026-06-09', baseLevel: 1,
    levelsPerWeek: 0.8, questionsPerWeek: 18,
    trainerWinsPerWeek: 0.5, liveWinsPerWeek: 0.2,
  },
  {
    id: 'abotig_anna',
    firstName: 'Anna', fullName: 'Anna Abotig', gender: 'girl', grade: 'G5',
    userpic: '/userpics/Spr_RS_School_Kid_F.png',
    accuracy: 0.45,
    homeX: 13, homeY: 3,
    starterId: 'solarch',
    wildIds: ['coralyn', 'luminos'],
    startDate: '2026-06-12', baseLevel: 1,
    levelsPerWeek: 1.0, questionsPerWeek: 22,
    trainerWinsPerWeek: 0.6, liveWinsPerWeek: 0.3,
  },
  // ── Mild ──────────────────────────────────────────────────────────────────
  {
    id: 'kibot_rose',
    firstName: 'Rose', fullName: 'Rose Kibot', gender: 'girl', grade: 'G5',
    userpic: '/userpics/Spr_RS_Roxanne.png',
    accuracy: 0.50,
    homeX: 5, homeY: 12,
    starterId: 'pyravex',
    wildIds: ['embrak', 'galestrik'],
    startDate: '2026-06-09', baseLevel: 1,
    levelsPerWeek: 1.1, questionsPerWeek: 28,
    trainerWinsPerWeek: 0.8, liveWinsPerWeek: 0.3,
  },
  {
    id: 'gabot_kyle',
    firstName: 'Kyle', fullName: 'Kyle Gabot', gender: 'boy', grade: 'G5',
    userpic: '/userpics/Spr_RS_Rich_Boy.png',
    accuracy: 0.55,
    homeX: 18, homeY: 8,
    starterId: 'voltmane',
    wildIds: ['duskral', 'embrak'],
    startDate: '2026-06-09', baseLevel: 2,
    levelsPerWeek: 1.3, questionsPerWeek: 32,
    trainerWinsPerWeek: 1.0, liveWinsPerWeek: 0.4,
  },
  // ── Medium ────────────────────────────────────────────────────────────────
  {
    id: 'botero_chloe',
    firstName: 'Chloe', fullName: 'Chloe Botero', gender: 'girl', grade: 'G5',
    userpic: '/userpics/Spr_E_Anabel_AGB-001.png',
    accuracy: 0.60,
    homeX: 10, homeY: 14,
    starterId: 'fernix',
    wildIds: ['mosshorn', 'coralyn'],
    startDate: '2026-06-06', baseLevel: 2,
    levelsPerWeek: 1.5, questionsPerWeek: 38,
    trainerWinsPerWeek: 1.2, liveWinsPerWeek: 0.5,
  },
  {
    id: 'cabote_josh',
    firstName: 'Josh', fullName: 'Josh Cabote', gender: 'boy', grade: 'G5',
    userpic: '/userpics/Spr_FRLG_Bug_Catcher.png',
    accuracy: 0.65,
    homeX: 15, homeY: 11,
    starterId: 'shadrak',
    wildIds: ['galestrik', 'mosshorn'],
    startDate: '2026-06-03', baseLevel: 3,
    levelsPerWeek: 1.6, questionsPerWeek: 42,
    trainerWinsPerWeek: 1.4, liveWinsPerWeek: 0.6,
  },
  // ── Medium-Hard ───────────────────────────────────────────────────────────
  {
    id: 'abot_ian',
    firstName: 'Ian', fullName: 'Ian Abot', gender: 'boy', grade: 'G5',
    userpic: '/userpics/Spr_RS_Wally.png',
    accuracy: 0.70,
    homeX: 3, homeY: 8,
    starterId: 'pyravex',
    wildIds: ['coralyn', 'galestrik'],
    startDate: '2026-06-01', baseLevel: 3,
    levelsPerWeek: 1.8, questionsPerWeek: 48,
    trainerWinsPerWeek: 1.6, liveWinsPerWeek: 0.8,
  },
  // ── Hard ──────────────────────────────────────────────────────────────────
  {
    id: 'sabot_kent',
    firstName: 'Kent', fullName: 'Kent Sabot', gender: 'boy', grade: 'G5',
    userpic: '/userpics/Spr_FRLG_Brock.png',
    accuracy: 0.75,
    homeX: 16, homeY: 4,
    starterId: 'voltmane',
    wildIds: ['embrak', 'duskral'],
    startDate: '2026-05-28', baseLevel: 4,
    levelsPerWeek: 2.0, questionsPerWeek: 55,
    trainerWinsPerWeek: 2.0, liveWinsPerWeek: 1.0,
  },
  {
    id: 'labot_mark',
    firstName: 'Mark', fullName: 'Mark Labot', gender: 'boy', grade: 'G5',
    userpic: '/userpics/Spr_FRLG_Blue_3.png',
    accuracy: 0.80,
    homeX: 8, homeY: 15,
    starterId: 'torrenth',
    wildIds: ['luminos', 'mosshorn'],
    startDate: '2026-05-25', baseLevel: 5,
    levelsPerWeek: 2.2, questionsPerWeek: 60,
    trainerWinsPerWeek: 2.2, liveWinsPerWeek: 1.2,
  },
  // ── Boss-tier ─────────────────────────────────────────────────────────────
  {
    id: 'tibot_clark',
    firstName: 'Clark', fullName: 'Clark Tibot', gender: 'boy', grade: 'G5',
    userpic: '/userpics/Spr_FRLG_Bill.png',
    accuracy: 0.88,
    homeX: 12, homeY: 7,
    starterId: 'shadrak',
    wildIds: ['duskral', 'galestrik'],
    startDate: '2026-05-20', baseLevel: 6,
    levelsPerWeek: 2.5, questionsPerWeek: 70,
    trainerWinsPerWeek: 2.5, liveWinsPerWeek: 1.5,
  },
];

/** Quick Set for O(1) bot detection anywhere in the app. */
export const BOT_IDS = new Set(BOT_PROFILES.map(b => b.id));

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns the full ordered list of 3 curio IDs: [starter, wild1, wild2]. */
export function botAllMonsterIds(bot: BotProfile): [string, string, string] {
  return [bot.starterId, bot.wildIds[0], bot.wildIds[1]];
}

/**
 * How many team slots a bot (or any player) can fill at a given level.
 * Mirrors BATTLE_CONSTANTS.PLAYER_LEVEL_FOR_SLOT: { 1: 5, 2: 10, 3: 15 }.
 *   Level  1–9  → 1 monster  (starter only, slot 1)
 *   Level 10–14 → 2 monsters (starter + first wild, slot 2)
 *   Level 15+   → 3 monsters (full team, slot 3)
 */
export function teamSizeForLevel(level: number): 1 | 2 | 3 {
  if (level >= 15) return 3;
  if (level >= 10) return 2;
  return 1;
}

// ── Progression ───────────────────────────────────────────────────────────────

function weeksSince(isoDate: string, now: Date): number {
  const start = new Date(isoDate);
  return Math.max(0, (now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
}

export interface BotProgress {
  level: number;
  gold: number;
  questionsAnswered: number;
  /** Number of curios currently owned (1 starter + 0, 1, or 2 wilds). */
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
  const trainerBattlesWon = Math.floor(weeks * bot.trainerWinsPerWeek);
  const liveBattleWins    = Math.floor(weeks * bot.liveWinsPerWeek);
  const gold              = questionsAnswered * 2 + trainerBattlesWon * 15 + liveBattleWins * 30;
  // monstersCollected mirrors teamSizeForLevel — the wilds are caught as
  // slots open up, so the count never exceeds 3 (1 starter + 2 wilds).
  const monstersCollected = teamSizeForLevel(level);
  return { level, gold, questionsAnswered, monstersCollected, trainerBattlesWon, liveBattleWins };
}

// ── Battle team ───────────────────────────────────────────────────────────────

/**
 * Builds an ActiveBattleMonster[] for `bot` at their current level.
 * Team size is gated by level (1, 2, or 3 monsters) matching PLAYER_LEVEL_FOR_SLOT.
 * Monster order: [starter, wildIds[0], wildIds[1]].slice(0, teamSize).
 */
export function buildBotTeam(bot: BotProfile, now: Date = new Date()): ActiveBattleMonster[] {
  const { level } = getBotProgress(bot, now);
  const size = teamSizeForLevel(level);
  const ids = botAllMonsterIds(bot).slice(0, size) as string[];

  return ids.map((monsterId, i) => {
    const def = ALL_MONSTERS[monsterId];
    if (!def) throw new Error(`Bot team: unknown monster id "${monsterId}"`);
    const { hp } = getScaledStats(def, level, 'normal');
    const userMonster: UserMonster = {
      id: `${bot.id}_m${i}`,
      user_id: bot.id,
      monster_id: monsterId,
      nickname: null,
      monster_exp: (level - 1) * 100,
      monster_level: level,
      slot: i + 1, // slots are 1-indexed in the real game
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
