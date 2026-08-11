// lib/trades.ts
// Client wrappers around the trading RPCs (see Supabase migrations
// create_trading_schema / create_trading_helper_rpcs / create_trade_request_rpc /
// create_respond_to_trade_rpc / create_cancel_trade_and_top_traders_rpcs).
// All gold/ownership math happens server-side inside those SECURITY DEFINER
// functions — this file never computes fees or balances itself, it only
// reflects whatever the RPCs return, same as apply_character_deltas in
// hooks/useWeeklyData.ts.
import { supabase } from '@/lib/supabase';
import { UserId } from '@/lib/userSession';
import { UserMonster } from '@/components/battle/shared';

export interface PlayerSearchResult {
  id: UserId;
  display_name: string;
  grade: string;
}

export type TradeStatus = 'pending' | 'completed' | 'declined' | 'cancelled' | 'expired' | 'failed' | 'countered';

export interface TradeItemRow {
  id: string;
  trade_id: string;
  side: 'initiator' | 'recipient';
  user_monster_id: string;
}

export interface TradeRow {
  id: string;
  initiator_id: UserId;
  recipient_id: UserId;
  status: TradeStatus;
  initiator_gold: number;
  recipient_gold: number;
  initiator_fee_gold: number | null;
  recipient_fee_gold: number | null;
  fail_reason: string | null;
  created_at: string;
  expires_at: string;
  responded_at: string | null;
  thread_id: string;
  parent_trade_id: string | null;
}

export interface TradeWithItems extends TradeRow {
  items: TradeItemRow[];
}

// A negotiation thread: every offer/counter-offer between the same two
// parties over the same trade, oldest first. `trades[trades.length - 1]` is
// the current/active offer (the one that's pending, or the terminal state
// if the thread is resolved) — the rest is the change log.
export interface TradeThread {
  threadId: string;
  trades: TradeWithItems[];
}

export async function searchPlayers(query: string): Promise<PlayerSearchResult[]> {
  if (!query.trim()) return [];
  const { data, error } = await supabase.rpc('search_players', { p_query: query.trim() });
  if (error) return [];
  return data as PlayerSearchResult[];
}

// Fetches a player's tradeable curios — allowed for any user id since
// user_monsters has a "read all" RLS policy (see Supabase migrations).
export async function fetchTradeableMonsters(userId: UserId): Promise<UserMonster[]> {
  const { data, error } = await supabase
    .from('user_monsters')
    .select('id, user_id, monster_id, nickname, monster_exp, monster_level, slot, rest_used, equipped_skills, graduation_tier')
    .eq('user_id', userId);
  if (error) return [];
  return data as UserMonster[];
}

export async function createTradeRequest(params: {
  recipientId: UserId;
  myMonsterIds: string[];
  theirMonsterIds: string[];
  myGold?: number;
  theirGold?: number;
}): Promise<{ tradeId: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('create_trade_request', {
    p_recipient_id: params.recipientId,
    p_my_monster_ids: params.myMonsterIds,
    p_their_monster_ids: params.theirMonsterIds,
    p_my_gold: params.myGold ?? 0,
    p_their_gold: params.theirGold ?? 0,
  });
  if (error) return { tradeId: null, error: error.message };
  return { tradeId: data as string, error: null };
}

// Gold now lives on player_progress (lifetime, no week key) — the RPC no longer needs a
// week_starting_date param at all (Phase 4 Wave 1, see docs/weekly-progress-redesign-plan.md).
// This also removed the last "trust the client's Sunday" call site the redesign plan flagged.
export async function respondToTrade(
  tradeId: string,
  accept: boolean
): Promise<{ status: TradeStatus | 'error'; reason?: string }> {
  const { data, error } = await supabase.rpc('respond_to_trade', {
    p_trade_id: tradeId,
    p_accept: accept,
  });
  if (error) return { status: 'error', reason: error.message };
  return { status: data.status, reason: data.reason };
}

export async function cancelTradeRequest(tradeId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('cancel_trade_request', { p_trade_id: tradeId });
  return !error && data === true;
}

// Countering only makes sense on a trade that's currently pending and where
// the caller is the recipient (enforced server-side too) — it flips roles:
// the counter-offerer becomes the new initiator, and if their counter is
// later accepted, they pay the fee, same as any other initiator.
export async function counterTradeRequest(params: {
  tradeId: string;
  myMonsterIds: string[];
  theirMonsterIds: string[];
  myGold?: number;
  theirGold?: number;
}): Promise<{ tradeId: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('counter_trade_request', {
    p_trade_id: params.tradeId,
    p_my_monster_ids: params.myMonsterIds,
    p_their_monster_ids: params.theirMonsterIds,
    p_my_gold: params.myGold ?? 0,
    p_their_gold: params.theirGold ?? 0,
  });
  if (error) return { tradeId: null, error: error.message };
  return { tradeId: data as string, error: null };
}

async function attachItems(trades: TradeRow[]): Promise<TradeWithItems[]> {
  if (trades.length === 0) return [];
  const tradeIds = trades.map(t => t.id);
  const { data: items } = await supabase
    .from('trade_items')
    .select('*')
    .in('trade_id', tradeIds);
  return trades.map(t => ({
    ...t,
    items: (items as TradeItemRow[] | null)?.filter(i => i.trade_id === t.id) ?? [],
  }));
}

// Groups every trade a user has been party to (as initiator or recipient, at
// any point in a counter-offer chain) into per-thread negotiation histories,
// oldest offer first within each thread.
export async function fetchMyTradeThreads(userId: UserId): Promise<TradeThread[]> {
  const { data: trades, error } = await supabase
    .from('trades')
    .select('*')
    .or(`initiator_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('created_at', { ascending: true });
  if (error || !trades || trades.length === 0) return [];

  const withItems = await attachItems(trades as TradeRow[]);

  const byThread = new Map<string, TradeWithItems[]>();
  withItems.forEach(t => {
    const list = byThread.get(t.thread_id) || [];
    list.push(t);
    byThread.set(t.thread_id, list);
  });

  const threads = Array.from(byThread.entries()).map(([threadId, list]) => ({ threadId, trades: list }));
  // Most recently active thread first (by its latest offer's created_at).
  threads.sort((a, b) =>
    new Date(b.trades[b.trades.length - 1].created_at).getTime()
    - new Date(a.trades[a.trades.length - 1].created_at).getTime()
  );
  return threads;
}

export interface TopTrader {
  user_id: UserId;
  total_fees: number;
}

export async function fetchTopTraders(limit = 10): Promise<TopTrader[]> {
  const { data, error } = await supabase.rpc('get_top_traders', { p_limit: limit });
  if (error) return [];
  return data as TopTrader[];
}
