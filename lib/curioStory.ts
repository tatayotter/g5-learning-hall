// lib/curioStory.ts
// Per-curio counters shown on the back of its trading card (components/monster/CurioCard.tsx):
// battles fought and won as the active curio, and main quests it trained on. Best-effort — a
// failed count must never get in the way of the battle or quest reward that triggered it.
import { supabase } from '@/lib/supabase';

export function recordCurioStory(
  userId: string,
  curioId: string | null | undefined,
  event: { battleWon?: boolean; trained?: boolean },
): void {
  if (!curioId) return;
  void supabase
    .rpc('record_curio_story', {
      p_user_id: userId,
      p_curio_id: curioId,
      p_battle_won: event.battleWon ?? null,
      p_trained: event.trained ?? false,
    })
    .then(({ error }) => { if (error) console.warn('record_curio_story failed', error.message); });
}
