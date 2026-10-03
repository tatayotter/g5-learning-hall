// lib/wildEncounterLog.ts
// Records each step of the wild curio funnel in wild_encounter_events
// (migration 20261004090000): map scroll answers, spawns, walk-ups,
// encounter questions, battles, catches, runaways. Fire-and-forget: a failed
// log never blocks or breaks gameplay. Players can insert their own rows but
// can't read the table; analytics reads it with the service role.
import { supabase } from '@/lib/supabase';
import type { QualityTier } from '@/lib/curioQuality';

export type WildEncounterEvent =
  | 'scroll_answered'
  | 'spawned'
  | 'restored'
  | 'approached'
  | 'walked_away'
  | 'question_answered'
  | 'battle_started'
  | 'battle_won'
  | 'battle_lost'
  | 'fled'
  | 'caught'
  | 'duplicate_kept'
  | 'duplicate_gold';

export interface WildEncounterEventFields {
  region?: string | null;
  monsterId?: string;
  quality?: QualityTier;
  level?: number;
  attemptsLeft?: number;
  correct?: boolean;
  pity?: boolean;
}

export function logWildEncounterEvent(userId: string, event: WildEncounterEvent, f: WildEncounterEventFields = {}): void {
  void supabase
    .from('wild_encounter_events')
    .insert({
      user_id: userId,
      event,
      region: f.region ?? null,
      monster_id: f.monsterId ?? null,
      quality: f.quality ?? null,
      level: f.level ?? null,
      attempts_left: f.attemptsLeft ?? null,
      correct: f.correct ?? null,
      pity: f.pity ?? null,
    })
    .then(({ error }) => {
      if (error) console.warn('wild encounter log failed:', error.message);
    });
}
