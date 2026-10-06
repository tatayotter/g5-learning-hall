// lib/offlineMap.ts
//
// The Training Map with no connection (docs/offline-mode-plan.md): walking, scroll questions,
// trash pickup and the recycler. Wild curios, trainers and other players (bots included) stay
// online-only, so offline the player walks the map alone. For players with the 'offline_play'
// flag on the installed app:
// - scrolls are graded from the answer key already downloaded for main quests
//   (lib/offlineQuests.ts), and the curio EXP shows straight away;
// - every scroll answer, trash pickup or trade and the last tile stood on goes into a per-player
//   outbox;
// - on reconnect each entry goes to sync_offline_map once (it re-grades the answer and clamps
//   the trash), keyed by the entry id so a retry can't pay twice.
import { supabase } from '@/lib/supabase';
import { isOffline } from '@/lib/offlineSnapshot';
import { offlineAnswerFor, offlinePlayEnabled } from '@/lib/offlineQuests';
import { updateOfflineCopy } from '@/lib/offlineReads';
import type { CurioCollection } from '@/lib/curioCollection';
import { BATTLE_CONSTANTS, getMonsterLevel } from '@/lib/monsterConfig';

const OUTBOX = (userId: string) => `lh_map_outbox_${userId}`;

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
    // Storage full or blocked: the map still plays, this entry just won't sync.
  }
}

// True when the map should play from the device instead of the network.
export function playingMapOffline(userId: string): boolean {
  return isOffline() && offlinePlayEnabled(userId);
}

// ── Scroll grading ──────────────────────────────────────────────────────────

// Only questions the downloaded key covers can be asked offline.
export function offlineScrollQuestions<T extends { id: string }>(userId: string, questions: T[]): T[] {
  return questions.filter(q => offlineAnswerFor(userId, q.id) !== undefined);
}

export function gradeScrollOffline(userId: string, questionId: string, selected: string) {
  const correctAnswer = offlineAnswerFor(userId, questionId) ?? null;
  return { correct: correctAnswer !== null && selected === correctAnswer, correctAnswer };
}

// ── Outbox ──────────────────────────────────────────────────────────────────

export interface MapOutboxEntry {
  id: string;
  kind: 'scroll' | 'trash' | 'position';
  monsterRowId: string | null;
  questionId: string | null;
  selected: string | null;
  trashCollected: number;
  trashGold: number;
  mapX: number | null;
  mapY: number | null;
  playedAt: string;
  // Server rejections (not network failures) so far; kept for a look, never dropped.
  failures: number;
}

export function pendingMapEntries(userId: string): MapOutboxEntry[] {
  return read<MapOutboxEntry[]>(OUTBOX(userId), []);
}

function queue(userId: string, entry: Partial<MapOutboxEntry> & Pick<MapOutboxEntry, 'kind'>) {
  const full: MapOutboxEntry = {
    monsterRowId: null, questionId: null, selected: null, trashCollected: 0, trashGold: 0, mapX: null, mapY: null,
    ...entry,
    id: crypto.randomUUID(), playedAt: new Date().toISOString(), failures: 0,
  };
  // Only the latest tile matters, so a new position replaces any unsent one.
  const rest = entry.kind === 'position'
    ? pendingMapEntries(userId).filter(e => e.kind !== 'position')
    : pendingMapEntries(userId);
  write(OUTBOX(userId), [...rest, full]);
  void navigator.storage?.persist?.().catch(() => {});
}

export function queueScrollAnswer(userId: string, monsterRowId: string | null, questionId: string, selected: string, correct: boolean) {
  queue(userId, { kind: 'scroll', monsterRowId, questionId, selected });
  // Keep the device copy in step with what the screen shows, so reopening offline keeps the
  // EXP and the checklist credit.
  if (!correct) return;
  const today = new Date().toISOString().split('T')[0];
  updateOfflineCopy<CurioCollection>(userId, 'curioCollection', c => ({
    ...c,
    userMonsters: c.userMonsters.map(m => {
      if (m.id !== monsterRowId) return m;
      const exp = m.monster_exp + BATTLE_CONSTANTS.MONSTER_EXP_PER_GRASS_ANSWER;
      return { ...m, monster_exp: exp, monster_level: getMonsterLevel(exp) };
    }),
    battleState: c.battleState && {
      ...c.battleState,
      last_wild_encounter_win: today,
      questions_since_wild_encounter: (c.battleState.questions_since_wild_encounter ?? 0) + 1,
    },
  }));
}

export function queueTrash(userId: string, collected: number, gold: number) {
  if (collected <= 0 && gold <= 0) return;
  queue(userId, { kind: 'trash', trashCollected: collected, trashGold: gold });
}

export function queuePosition(userId: string, x: number, y: number) {
  queue(userId, { kind: 'position', mapX: x, mapY: y });
  updateOfflineCopy<CurioCollection>(userId, 'curioCollection', c => ({
    ...c,
    battleState: c.battleState && { ...c.battleState, map_x: x, map_y: y },
  }));
}

export interface SyncedMapEntries {
  answers: number;
  gold: number;
}

const flushing = new Map<string, Promise<SyncedMapEntries>>();

// Same shape as flushGuildOutbox: oldest first, stops at the first network failure, a re-sent
// entry is a no-op server-side.
export function flushMapOutbox(userId: string): Promise<SyncedMapEntries> {
  const running = flushing.get(userId);
  if (running) return running;
  const run = (async () => {
    const synced: SyncedMapEntries = { answers: 0, gold: 0 };
    for (const entry of pendingMapEntries(userId)) {
      if (isOffline()) break;
      const { data, error } = await supabase.rpc('sync_offline_map', {
        p_user_id: userId,
        p_entry_id: entry.id,
        p_monster_row_id: entry.monsterRowId,
        p_question_id: entry.questionId,
        p_selected: entry.selected,
        p_trash_collected: entry.trashCollected,
        p_trash_gold: entry.trashGold,
        p_map_x: entry.mapX,
        p_map_y: entry.mapY,
        p_played_at: entry.playedAt,
      });
      const remaining = pendingMapEntries(userId);
      if (error || !data) {
        if (!error?.code) break;
        console.error('Offline map sync rejected:', error);
        write(OUTBOX(userId), remaining.map(e => e.id === entry.id ? { ...e, failures: e.failures + 1 } : e));
        continue;
      }
      write(OUTBOX(userId), remaining.filter(e => e.id !== entry.id));
      if (!data.replayed) {
        if (entry.kind === 'scroll') synced.answers += 1;
        synced.gold += data.gold ?? 0;
      }
    }
    return synced;
  })().finally(() => flushing.delete(userId));
  flushing.set(userId, run);
  return run;
}
