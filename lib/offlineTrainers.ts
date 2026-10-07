// lib/offlineTrainers.ts
//
// Arena trainer battles with no connection (docs/offline-mode-plan.md). For players with the
// 'offline_play' flag on the installed app, any trainer their level allows can be battled offline:
// - the questions are the rest of the term's main quest questions, downloaded with their answer
//   key (lib/offlineQuests.ts), graded on the device;
// - items come off the device's copy of the inventory;
// - a win shows the curio EXP and the trainer as defeated straight away;
// - each battle goes into a per-player outbox, and on reconnect to sync_offline_trainer_battle
//   once, which re-grades every answer and decides the win and the EXP itself.
import { supabase } from '@/lib/supabase';
import { isOffline } from '@/lib/offlineSnapshot';
import { offlinePlayEnabled, offlineTermQuestions, type PoolQuestion } from '@/lib/offlineQuests';
import { updateOfflineCopy } from '@/lib/offlineReads';
import type { InventoryMap } from '@/lib/inventory';
import type { CurioCollection } from '@/lib/curioCollection';
import { getMonsterLevel } from '@/lib/monsterConfig';

const OUTBOX = (userId: string) => `lh_trainer_outbox_${userId}`;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the battle still plays, it just won't sync.
  }
}

// True when trainer battles should play from the device instead of the network.
export function battlingTrainersOffline(userId: string): boolean {
  return isOffline() && offlinePlayEnabled(userId);
}

// The questions an offline battle asks: the rest of the term's downloaded questions
// (lib/offlineQuests.ts), the ones not asked yet first, like the online Arena.
export function offlineArenaQuestions(userId: string, answeredIds: Set<string>): PoolQuestion[] {
  const pool = offlineTermQuestions(userId);
  const unseen = pool.filter(q => !answeredIds.has(q.id));
  return unseen.length > 0 ? unseen : pool;
}

// An item used in an offline battle: taken off the device's copy of the inventory straight away,
// and off the real one when the battle syncs. False when the device copy has none left.
export function spendItemOffline(userId: string, key: string): boolean {
  let used = false;
  updateOfflineCopy<InventoryMap>(userId, 'inventory', inv => {
    if ((inv[key] ?? 0) <= 0) return inv;
    used = true;
    return { ...inv, [key]: (inv[key] ?? 0) - 1 };
  });
  return used;
}

// ── Outbox ──────────────────────────────────────────────────────────────────

export interface OfflineBattleAnswer {
  questionId: string;
  selected: string;
}

export interface TrainerOutboxEntry {
  id: string;
  trainerId: string;
  monsterRowId: string | null;
  answers: OfflineBattleAnswer[];
  // Item keys used, one per use.
  items: string[];
  won: boolean;
  playedAt: string;
  // Server rejections (not network failures) so far; kept for a look, never dropped.
  failures: number;
}

export function pendingTrainerBattles(userId: string): TrainerOutboxEntry[] {
  return read<TrainerOutboxEntry[]>(OUTBOX(userId), []);
}

export function queueTrainerBattle(
  userId: string, trainerId: string, monsterRowId: string | null,
  answers: OfflineBattleAnswer[], items: string[], won: boolean, exp: number,
) {
  const entry: TrainerOutboxEntry = {
    id: crypto.randomUUID(), trainerId, monsterRowId, answers, items, won,
    playedAt: new Date().toISOString(), failures: 0,
  };
  write(OUTBOX(userId), [...pendingTrainerBattles(userId), entry]);
  void navigator.storage?.persist?.().catch(() => {});
  // Keep the device copy in step with the screen, so reopening offline keeps the win.
  if (!won) return;
  updateOfflineCopy<CurioCollection>(userId, 'curioCollection', c => ({
    ...c,
    userMonsters: c.userMonsters.map(m => {
      if (m.id !== monsterRowId || exp <= 0) return m;
      const total = m.monster_exp + exp;
      return { ...m, monster_exp: total, monster_level: getMonsterLevel(total) };
    }),
    battleState: c.battleState && {
      ...c.battleState,
      defeated_trainers: c.battleState.defeated_trainers.includes(trainerId)
        ? c.battleState.defeated_trainers
        : [...c.battleState.defeated_trainers, trainerId],
    },
  }));
}

export interface SyncedTrainerBattles {
  battles: number;
  wins: number;
}

const flushing = new Map<string, Promise<SyncedTrainerBattles>>();

// Same shape as flushMapOutbox: oldest first, stops at the first network failure, a re-sent
// entry is a no-op server-side.
export function flushTrainerOutbox(userId: string): Promise<SyncedTrainerBattles> {
  const running = flushing.get(userId);
  if (running) return running;
  const run = (async () => {
    const synced: SyncedTrainerBattles = { battles: 0, wins: 0 };
    for (const entry of pendingTrainerBattles(userId)) {
      if (isOffline()) break;
      const { data, error } = await supabase.rpc('sync_offline_trainer_battle', {
        p_user_id: userId,
        p_entry_id: entry.id,
        p_trainer_id: entry.trainerId,
        p_monster_row_id: entry.monsterRowId,
        p_answers: entry.answers.map(a => ({ question_id: a.questionId, selected: a.selected })),
        p_items: entry.items ?? [],
        p_won: entry.won,
        p_played_at: entry.playedAt,
      });
      const remaining = pendingTrainerBattles(userId);
      if (error || !data) {
        if (!error?.code) break;
        console.error('Offline trainer battle sync rejected:', error);
        write(OUTBOX(userId), remaining.map(e => e.id === entry.id ? { ...e, failures: e.failures + 1 } : e));
        continue;
      }
      write(OUTBOX(userId), remaining.filter(e => e.id !== entry.id));
      if (!data.replayed) {
        synced.battles += 1;
        if (data.won) synced.wins += 1;
      }
    }
    return synced;
  })().finally(() => flushing.delete(userId));
  flushing.set(userId, run);
  return run;
}
