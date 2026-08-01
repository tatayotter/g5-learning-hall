// lib/dataSource.ts
//
// Shared contract between the online (Supabase-backed) and offline
// (SQLite-backed) data paths. The main app keeps calling lib/guildEngine.ts
// and lib/dailyChecklist.ts directly (this file doesn't rewire it) — this
// interface exists so offline-shell's screens can be written once against
// a stable shape, regardless of which implementation backs them.
import type { GuildKey } from '@/lib/dailyChecklist';

export interface DataSource {
  fetchQuestionPool(userId: string, tableName: string, questType: string, gradeLevel?: number): Promise<any[]>;
  markQuestionsCompleted(userId: string, questType: string, questionIds: string[]): Promise<void>;
  markGuildSessionToday(userId: string, guildKey: GuildKey, today: string): Promise<void>;
  claimChecklistBonus(userId: string, today: string, dayName: string, weekStartingDate: string, gold?: number): Promise<boolean>;
}
