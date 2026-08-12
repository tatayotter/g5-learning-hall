// lib/localDataSource.ts
//
// SQLite-backed cache + outbox, used by:
//  - the main app's caching-writer (mirrors reads into local tables so
//    offline-shell has fresh data next time there's no connection)
//  - offline-shell (reads from the cache, queues writes here instead of
//    calling Supabase directly)
//  - the main app's sync-flush routine (drains the outbox once back online)
//
// Native-only: this plugin talks to a real on-device SQLite file via the
// Capacitor bridge. It is not used on web/desktop — callers should guard
// with Capacitor.isNativePlatform() before touching this module.
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import type { GuildKey } from '@/lib/dailyChecklist';
import type { WeeklyData } from '@/hooks/useWeeklyData';
import type { SubclassProfile } from '@/lib/guildEngine';

const DB_NAME = 'learninghall_offline';
const DB_VERSION = 1;

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS local_weekly_data (
  user_id TEXT PRIMARY KEY,
  week_starting_date TEXT NOT NULL,
  weekly_data_json TEXT NOT NULL,
  cached_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS local_subclass_profile (
  user_id TEXT PRIMARY KEY,
  profile_json TEXT NOT NULL,
  cached_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS local_guild_pools (
  table_name TEXT NOT NULL,
  quest_type TEXT NOT NULL,
  grade_level INTEGER,
  difficulty_tier INTEGER,
  questions_json TEXT NOT NULL,
  cached_at TEXT NOT NULL,
  PRIMARY KEY (table_name, quest_type, grade_level, difficulty_tier)
);

CREATE TABLE IF NOT EXISTS local_completed_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  quest_type TEXT NOT NULL,
  question_id TEXT NOT NULL,
  completed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS local_owned_monsters (
  user_id TEXT PRIMARY KEY,
  monsters_json TEXT NOT NULL,
  cached_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS local_achievements (
  user_id TEXT PRIMARY KEY,
  achievements_json TEXT NOT NULL,
  cached_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS local_checklist_state (
  user_id TEXT NOT NULL,
  today TEXT NOT NULL,
  guild_sessions_json TEXT NOT NULL DEFAULT '[]',
  claimed INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, today)
);

-- SQLite is reachable from both the remote (https://learninghall.vercel.app)
-- and locally-bundled origins via the same native Capacitor bridge, unlike
-- localStorage (lib/userSession.ts's SESSION_KEY) which is origin-scoped and
-- so is NOT visible to the offline shell. This table is how the offline
-- shell learns which profile was last active.
CREATE TABLE IF NOT EXISTS local_active_user (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  user_id TEXT NOT NULL,
  grade_level INTEGER,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_target TEXT NOT NULL,
  op TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  synced_at TEXT
);
`;

let sqliteConn: SQLiteConnection | null = null;
let dbPromise: Promise<SQLiteDBConnection> | null = null;

export function isOfflineStorageAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

async function getDb(): Promise<SQLiteDBConnection> {
  if (!isOfflineStorageAvailable()) {
    throw new Error('localDataSource is native-only; guard callers with isOfflineStorageAvailable()');
  }
  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    if (!sqliteConn) sqliteConn = new SQLiteConnection(CapacitorSQLite);
    const consistency = await sqliteConn.checkConnectionsConsistency();
    const alreadyOpen = (await sqliteConn.isConnection(DB_NAME, false)).result;
    const db = consistency.result && alreadyOpen
      ? await sqliteConn.retrieveConnection(DB_NAME, false)
      : await sqliteConn.createConnection(DB_NAME, false, 'no-encryption', DB_VERSION, false);
    await db.open();
    await db.execute(SCHEMA_SQL);
    return db;
  })();
  return dbPromise;
}

// ─── Guild question pools ──────────────────────────────────────────────────

export async function cacheGuildPool(tableName: string, questType: string, gradeLevel: number | undefined, tier: number | null, questions: any[]) {
  const db = await getDb();
  await db.run(
    `INSERT OR REPLACE INTO local_guild_pools (table_name, quest_type, grade_level, difficulty_tier, questions_json, cached_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [tableName, questType, gradeLevel ?? null, tier, JSON.stringify(questions), new Date().toISOString()]
  );
}

export async function getCachedGuildPool(tableName: string, questType: string, gradeLevel: number | undefined, tier: number | null): Promise<any[]> {
  const db = await getDb();
  const result = await db.query(
    `SELECT questions_json FROM local_guild_pools WHERE table_name = ? AND quest_type = ? AND grade_level IS ? AND difficulty_tier IS ?`,
    [tableName, questType, gradeLevel ?? null, tier]
  );
  const row = result.values?.[0];
  return row ? JSON.parse(row.questions_json) : [];
}

// The offline shell doesn't know the player's current difficulty tier
// (that lives in user_subclass_profiles, fetched live only) — it just needs
// *a* pool to practice from, so this merges whatever tiers happen to be
// cached rather than requiring an exact tier match.
export async function getCachedGuildPoolAnyTier(tableName: string, questType: string, gradeLevel: number | undefined): Promise<any[]> {
  const db = await getDb();
  const result = await db.query(
    `SELECT questions_json FROM local_guild_pools WHERE table_name = ? AND quest_type = ? AND grade_level IS ?`,
    [tableName, questType, gradeLevel ?? null]
  );
  const seen = new Set<string>();
  const merged: any[] = [];
  for (const row of result.values || []) {
    for (const q of JSON.parse(row.questions_json)) {
      if (!seen.has(q.id)) { seen.add(q.id); merged.push(q); }
    }
  }
  return merged;
}

// ─── Weekly data (full WeeklyData snapshot: stats, journal, achievements, ─────
// package_data/Main Quest content, quiz history, etc.) ─────────────────────

export async function cacheWeeklyData(userId: string, weeklyData: WeeklyData) {
  const db = await getDb();
  await db.run(
    `INSERT OR REPLACE INTO local_weekly_data (user_id, week_starting_date, weekly_data_json, cached_at) VALUES (?, ?, ?, ?)`,
    [userId, weeklyData.week_starting_date, JSON.stringify(weeklyData), new Date().toISOString()]
  );
}

export async function getCachedWeeklyData(userId: string): Promise<WeeklyData | null> {
  const db = await getDb();
  const result = await db.query(
    `SELECT weekly_data_json FROM local_weekly_data WHERE user_id = ?`,
    [userId]
  );
  const row = result.values?.[0];
  return row ? JSON.parse(row.weekly_data_json) : null;
}

// ─── Subclass profile (per-guild level/xp/tier — user_subclass_profiles) ──

export async function cacheSubclassProfile(userId: string, profile: SubclassProfile) {
  const db = await getDb();
  await db.run(
    `INSERT OR REPLACE INTO local_subclass_profile (user_id, profile_json, cached_at) VALUES (?, ?, ?)`,
    [userId, JSON.stringify(profile), new Date().toISOString()]
  );
}

export async function getCachedSubclassProfile(userId: string): Promise<SubclassProfile | null> {
  const db = await getDb();
  const result = await db.query(`SELECT profile_json FROM local_subclass_profile WHERE user_id = ?`, [userId]);
  const row = result.values?.[0];
  return row ? JSON.parse(row.profile_json) : null;
}

export async function updateSubclassProfileLocal(userId: string, fields: Partial<SubclassProfile>) {
  const existing = (await getCachedSubclassProfile(userId)) || ({} as SubclassProfile);
  const merged = { ...existing, ...fields } as SubclassProfile;
  await cacheSubclassProfile(userId, merged);
  await enqueueSync('update_subclass_profile', 'update', { userId, fields });
}

// ─── Completed questions (local read model, mirrors user_completed_questions) ──

export async function getLocallyCompletedQuestionIds(userId: string, questType: string): Promise<Set<string>> {
  const db = await getDb();
  const result = await db.query(
    `SELECT question_id FROM local_completed_questions WHERE user_id = ? AND quest_type = ?`,
    [userId, questType]
  );
  return new Set((result.values || []).map((r: any) => r.question_id));
}

export async function markQuestionsCompletedLocal(userId: string, questType: string, questionIds: string[]) {
  if (questionIds.length === 0) return;
  const db = await getDb();
  const now = new Date().toISOString();
  await db.beginTransaction();
  try {
    for (const questionId of questionIds) {
      await db.run(
        `INSERT INTO local_completed_questions (user_id, quest_type, question_id, completed_at) VALUES (?, ?, ?, ?)`,
        [userId, questType, questionId, now]
      );
    }
    await db.commitTransaction();
  } catch (e) {
    await db.rollbackTransaction();
    throw e;
  }
  await enqueueSync('user_completed_questions', 'insert', { userId, questType, questionIds });
}

// ─── Owned monsters / achievements (read-only cache for offline views) ────

export async function cacheOwnedMonsters(userId: string, monsters: any[]) {
  const db = await getDb();
  await db.run(
    `INSERT OR REPLACE INTO local_owned_monsters (user_id, monsters_json, cached_at) VALUES (?, ?, ?)`,
    [userId, JSON.stringify(monsters), new Date().toISOString()]
  );
}

export async function getCachedOwnedMonsters(userId: string): Promise<any[]> {
  const db = await getDb();
  const result = await db.query(`SELECT monsters_json FROM local_owned_monsters WHERE user_id = ?`, [userId]);
  const row = result.values?.[0];
  return row ? JSON.parse(row.monsters_json) : [];
}

export async function cacheAchievements(userId: string, achievements: any[]) {
  const db = await getDb();
  await db.run(
    `INSERT OR REPLACE INTO local_achievements (user_id, achievements_json, cached_at) VALUES (?, ?, ?)`,
    [userId, JSON.stringify(achievements), new Date().toISOString()]
  );
}

export async function getCachedAchievements(userId: string): Promise<any[]> {
  const db = await getDb();
  const result = await db.query(`SELECT achievements_json FROM local_achievements WHERE user_id = ?`, [userId]);
  const row = result.values?.[0];
  return row ? JSON.parse(row.achievements_json) : [];
}

// ─── Daily checklist (per-day local state, queued for sync) ───────────────

export async function markGuildSessionTodayLocal(userId: string, guildKey: GuildKey, today: string) {
  const db = await getDb();
  const result = await db.query(
    `SELECT guild_sessions_json FROM local_checklist_state WHERE user_id = ? AND today = ?`,
    [userId, today]
  );
  const existing: GuildKey[] = result.values?.[0] ? JSON.parse(result.values[0].guild_sessions_json) : [];
  if (!existing.includes(guildKey)) existing.push(guildKey);
  await db.run(
    `INSERT INTO local_checklist_state (user_id, today, guild_sessions_json, claimed) VALUES (?, ?, ?, 0)
     ON CONFLICT(user_id, today) DO UPDATE SET guild_sessions_json = excluded.guild_sessions_json`,
    [userId, today, JSON.stringify(existing)]
  );
  await enqueueSync('mark_guild_session_today', 'rpc', { userId, guildKey, today });
}

export async function claimChecklistBonusLocal(userId: string, today: string, dayName: string, grade: number) {
  const db = await getDb();
  await db.run(
    `INSERT INTO local_checklist_state (user_id, today, claimed) VALUES (?, ?, 1)
     ON CONFLICT(user_id, today) DO UPDATE SET claimed = 1`,
    [userId, today]
  );
  await enqueueSync('claim_daily_checklist_bonus', 'rpc', { userId, today, dayName, grade });
}

export async function getLocalChecklistState(userId: string, today: string): Promise<{ guildSessions: GuildKey[]; claimed: boolean } | null> {
  const db = await getDb();
  const result = await db.query(
    `SELECT guild_sessions_json, claimed FROM local_checklist_state WHERE user_id = ? AND today = ?`,
    [userId, today]
  );
  const row = result.values?.[0];
  if (!row) return null;
  return { guildSessions: JSON.parse(row.guild_sessions_json), claimed: !!row.claimed };
}

// ─── Active user handoff (bridges main app <-> offline shell across origins) ──

export async function setActiveUserLocal(userId: string, gradeLevel?: number) {
  const db = await getDb();
  await db.run(
    `INSERT INTO local_active_user (id, user_id, grade_level, updated_at) VALUES (1, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET user_id = excluded.user_id, grade_level = excluded.grade_level, updated_at = excluded.updated_at`,
    [userId, gradeLevel ?? null, new Date().toISOString()]
  );
}

export async function getActiveUserLocal(): Promise<{ userId: string; gradeLevel: number | null } | null> {
  const db = await getDb();
  const result = await db.query(`SELECT user_id, grade_level FROM local_active_user WHERE id = 1`);
  const row = result.values?.[0];
  return row ? { userId: row.user_id, gradeLevel: row.grade_level } : null;
}

// ─── Sync outbox ───────────────────────────────────────────────────────────

export interface SyncQueueRow {
  id: number;
  tableTarget: string;
  op: string;
  payload: any;
  createdAt: string;
}

export async function enqueueSync(tableTarget: string, op: string, payload: any) {
  const db = await getDb();
  await db.run(
    `INSERT INTO sync_queue (table_target, op, payload_json, created_at) VALUES (?, ?, ?, ?)`,
    [tableTarget, op, JSON.stringify(payload), new Date().toISOString()]
  );
}

export async function getUnsyncedQueue(): Promise<SyncQueueRow[]> {
  const db = await getDb();
  const result = await db.query(
    `SELECT id, table_target, op, payload_json, created_at FROM sync_queue WHERE synced_at IS NULL ORDER BY id ASC`
  );
  return (result.values || []).map((r: any) => ({
    id: r.id,
    tableTarget: r.table_target,
    op: r.op,
    payload: JSON.parse(r.payload_json),
    createdAt: r.created_at,
  }));
}

export async function markSynced(id: number) {
  const db = await getDb();
  await db.run(`UPDATE sync_queue SET synced_at = ? WHERE id = ?`, [new Date().toISOString(), id]);
}
