// lib/liveBattle.ts
// CRUD helpers for the live_battles table (real-time 1v1 PVP). Keeps the
// realtime hooks (hooks/useLiveBattleInbox.ts, hooks/useLiveBattle.ts) thin —
// they own the channel/broadcast wiring, this file owns the DB shape.
import { supabase } from '@/lib/supabase';
import { trackEvent } from '@/lib/analytics';

export type LiveBattleStatus =
  | 'pending_invite' | 'accepted' | 'declined' | 'in_progress'
  | 'completed' | 'expired' | 'forfeited';

export type LiveBattleEndReason =
  | 'ko' | 'forfeit_timeout' | 'forfeit_disconnect' | 'declined' | 'expired' | 'surrender' | null;

export interface LiveBattleRow {
  id: string;
  challenger_id: string;
  opponent_id: string;
  status: LiveBattleStatus;
  channel_name: string;
  round_number: number;
  round_deadline_at: string | null;
  challenger_team: any[];
  opponent_team: any[];
  challenger_hp: Record<string, number>;
  opponent_hp: Record<string, number>;
  winner_id: string | null;
  end_reason: LiveBattleEndReason;
  invited_at: string;
  accepted_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  result_written_by: string | null;
  created_at: string;
}

function channelNameFor(battleId: string): string {
  return `battle-${battleId}`;
}

// Called by the challenger once they've read the opponent's saved team.
// Creates the pending-invite row; the invite itself is broadcast separately
// via useLiveBattleInbox's sendInvite() once this resolves.
export async function createInvite(
  challengerId: string,
  opponentId: string,
  challengerTeam: any[],
  opponentTeam: any[],
): Promise<LiveBattleRow | null> {
  const initialHp = (team: any[]) =>
    Object.fromEntries(team.map((m, i) => [i, m.currentHp ?? m.maxHp]));

  const { data, error } = await supabase
    .from('live_battles')
    .insert({
      challenger_id: challengerId,
      opponent_id: opponentId,
      status: 'pending_invite',
      channel_name: '', // filled in below once we have the row's id
      challenger_team: challengerTeam,
      opponent_team: opponentTeam,
      challenger_hp: initialHp(challengerTeam),
      opponent_hp: initialHp(opponentTeam),
    })
    .select()
    .single();

  if (error || !data) {
    console.error('Failed to create live battle invite:', error);
    return null;
  }

  const channel_name = channelNameFor(data.id);
  const { data: updated, error: updateError } = await supabase
    .from('live_battles')
    .update({ channel_name })
    .eq('id', data.id)
    .select()
    .single();

  if (updateError || !updated) {
    console.error('Failed to set live battle channel name:', updateError);
    return data as LiveBattleRow;
  }
  return updated as LiveBattleRow;
}

export async function respondToInvite(battleId: string, accept: boolean): Promise<LiveBattleRow | null> {
  const { data, error } = await supabase
    .from('live_battles')
    .update({
      status: accept ? 'accepted' : 'declined',
      accepted_at: accept ? new Date().toISOString() : null,
    })
    .eq('id', battleId)
    .eq('status', 'pending_invite')
    .select()
    .single();

  if (error) {
    console.error('Failed to respond to live battle invite:', error);
    return null;
  }
  return data as LiveBattleRow | null;
}

export async function fetchLiveBattle(battleId: string): Promise<LiveBattleRow | null> {
  const { data, error } = await supabase
    .from('live_battles')
    .select('*')
    .eq('id', battleId)
    .single();
  if (error) return null;
  return data as LiveBattleRow;
}

export async function markBattleStarted(battleId: string): Promise<void> {
  await supabase
    .from('live_battles')
    .update({ status: 'in_progress', started_at: new Date().toISOString() })
    .eq('id', battleId)
    .eq('status', 'accepted');
  trackEvent('curio_arena_battle_start', { battle_id: battleId });
}

export async function updateRoundState(
  battleId: string,
  round: number,
  challengerHp: Record<string, number>,
  opponentHp: Record<string, number>,
  roundDeadlineAt: string | null,
): Promise<void> {
  await supabase
    .from('live_battles')
    .update({
      round_number: round,
      challenger_hp: challengerHp,
      opponent_hp: opponentHp,
      round_deadline_at: roundDeadlineAt,
    })
    .eq('id', battleId);
}

// Atomically resolves a finished battle via the resolve-live-battle Edge
// Function (service-role key) so only one of the two racing clients'
// battle_end handlers actually writes monster_battle_log / the gold gate,
// regardless of which one calls this first.
export async function resolveBattle(
  battleId: string,
  winnerId: string | null,
  endReason: NonNullable<LiveBattleEndReason>,
  winnerMonsterId?: string,
): Promise<{ alreadyResolved: boolean; row: LiveBattleRow | null }> {
  const { data, error } = await supabase.functions.invoke('resolve-live-battle', {
    body: { battleId, winnerId, endReason, winnerMonsterId },
  });

  if (error) {
    console.error('Failed to resolve live battle:', error);
    return { alreadyResolved: false, row: null };
  }
  trackEvent('curio_arena_battle_end', { battle_id: battleId, end_reason: endReason, winner_id: winnerId });
  return { alreadyResolved: !!data?.alreadyResolved, row: (data?.battle as LiveBattleRow) ?? null };
}
