'use client';
// components/trade/TradePanel.tsx
// Peer-to-peer curio trading UI. Every fee/ownership/gold computation happens
// server-side inside the trading RPCs (lib/trades.ts) — this component only
// ever displays what those RPCs return, same pattern as the rest of the app's
// gold handling (hooks/useWeeklyData.ts:applyGoldDelta).
//
// A negotiation is a "thread": a chain of offer -> counter-offer -> counter-
// offer rows (see TradeThread in lib/trades.ts), roles swapping each hop.
// Only the latest trade in a thread is actionable; everything before it is
// shown as a read-only change log.
import { useState, useEffect, useCallback } from 'react';
import { startOfWeek, format } from 'date-fns';
import { UserId } from '@/lib/userSession';
import { ALL_MONSTERS, getGraduatedMonsterDisplay } from '@/lib/monsterConfig';
import { UserMonster } from '@/components/battle/shared';
import { MonsterImage } from '@/components/battle/shared';
import {
  searchPlayers, fetchTradeableMonsters, createTradeRequest, respondToTrade,
  cancelTradeRequest, counterTradeRequest, fetchMyTradeThreads,
  PlayerSearchResult, TradeThread, TradeWithItems,
} from '@/lib/trades';
import { logAction } from '@/lib/playerlog';

interface TradePanelProps {
  userId: UserId;
  userMonsters: UserMonster[];
  onTradeCompleted: () => void;
  // Achievement-counter bump (see lib/achievements.ts) — fired only when a
  // trade actually completes, unlike onTradeCompleted which also refreshes
  // after a decline/cancel.
  onTradeConfirmed?: () => void;
  // respond_to_trade writes gold straight to player_progress server-side —
  // this only ever refetches and mirrors that into local state, it never
  // pushes another delta itself. Fired only on a completed trade (declines/
  // cancels never touch gold, so there's nothing to resync for those).
  onGoldChanged?: () => void;
}

// Curio-for-curio: 250 gold per curio moved, both sides counted, initiator
// pays. Gold sent by either side: 8% on top of what they send, ceiling
// rounded, minimum 1 gold. These mirror respond_to_trade's server-side math
// exactly and are display-only here — the RPC is the source of truth for
// what actually gets charged.
function previewFee(myMonsterCount: number, theirMonsterCount: number, myGold: number) {
  const curioFee = 250 * (myMonsterCount + theirMonsterCount);
  const myGoldFee = myGold > 0 ? Math.max(1, Math.ceil(myGold * 0.08)) : 0;
  return curioFee + myGoldFee;
}

// A monster's displayed name/sprite depends on its graduation tier, not just
// its species id (e.g. a graduated "solarch" displays as "Starlune") — see
// getGraduatedMonsterDisplay and its usage in components/HeroProfile.tsx.
// Trading a curio doesn't change any of this; it's purely a display lookup.
function displayDef(m: UserMonster) {
  const base = ALL_MONSTERS[m.monster_id];
  if (!base) return undefined;
  return base.graduation ? getGraduatedMonsterDisplay(base, m.graduation_tier) : base;
}

function monsterLabel(m: UserMonster): string {
  return displayDef(m)?.name ?? m.monster_id;
}

const currentSunday = () => format(startOfWeek(new Date()), 'yyyy-MM-dd');

export default function TradePanel({ userId, userMonsters, onTradeCompleted, onTradeConfirmed, onGoldChanged }: TradePanelProps) {
  const [tab, setTab] = useState<'pending' | 'new' | 'history'>('pending');
  const [threads, setThreads] = useState<TradeThread[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [counteringId, setCounteringId] = useState<string | null>(null);

  const loadThreads = useCallback(async () => {
    setThreads(await fetchMyTradeThreads(userId));
  }, [userId]);

  useEffect(() => { loadThreads(); }, [loadThreads]);

  const isActive = (t: TradeThread) => t.trades[t.trades.length - 1].status === 'pending';
  const activeThreads = threads.filter(isActive);
  const historyThreads = threads.filter(t => !isActive(t));
  const incomingCount = activeThreads.filter(
    t => t.trades[t.trades.length - 1].recipient_id === userId
  ).length;

  const handleRespond = async (tradeId: string, accept: boolean) => {
    setBusyId(tradeId);
    const result = await respondToTrade(tradeId, accept);
    if (result.status === 'completed') {
      logAction(userId, currentSunday(), 'trade', '🔄 Completed a curio trade', 0, 0);
      onTradeConfirmed?.();
      onGoldChanged?.();
    } else if (!accept) {
      logAction(userId, currentSunday(), 'trade', '🔄 Declined a trade request', 0, 0);
    }
    setBusyId(null);
    await loadThreads();
    onTradeCompleted();
  };

  const handleCancel = async (tradeId: string) => {
    setBusyId(tradeId);
    await cancelTradeRequest(tradeId);
    setBusyId(null);
    await loadThreads();
  };

  const handleCounterSubmitted = async () => {
    setCounteringId(null);
    await loadThreads();
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-neutral-800">
        {([
          { id: 'pending', label: `Requests${incomingCount > 0 ? ` (${incomingCount})` : ''}` },
          { id: 'new', label: 'New Trade' },
          { id: 'history', label: 'History' },
        ] as { id: typeof tab; label: string }[]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-bold transition-colors border-b-2 -mb-px ${
              tab === t.id ? 'border-amber-400 text-amber-400' : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'pending' && (
        <div className="space-y-3">
          {activeThreads.length === 0 && <p className="text-sm text-gray-500">No open trade requests.</p>}
          {activeThreads.map(thread => (
            <ThreadCard
              key={thread.threadId}
              thread={thread}
              viewerId={userId}
              userMonsters={userMonsters}
              busy={busyId === thread.trades[thread.trades.length - 1].id}
              countering={counteringId === thread.trades[thread.trades.length - 1].id}
              onAccept={() => handleRespond(thread.trades[thread.trades.length - 1].id, true)}
              onDecline={() => handleRespond(thread.trades[thread.trades.length - 1].id, false)}
              onCancel={() => handleCancel(thread.trades[thread.trades.length - 1].id)}
              onStartCounter={() => setCounteringId(thread.trades[thread.trades.length - 1].id)}
              onCounterSubmitted={handleCounterSubmitted}
            />
          ))}
        </div>
      )}

      {tab === 'new' && (
        <NewTradeFlow
          userId={userId}
          userMonsters={userMonsters}
          onCreated={async () => { await loadThreads(); setTab('pending'); }}
        />
      )}

      {tab === 'history' && (
        <div className="space-y-3">
          {historyThreads.length === 0 && <p className="text-sm text-gray-500">No completed trades yet.</p>}
          {historyThreads.map(thread => (
            <ThreadCard key={thread.threadId} thread={thread} viewerId={userId} userMonsters={userMonsters} readOnly />
          ))}
        </div>
      )}
    </div>
  );
}

function offerSummary(trade: TradeWithItems, fromLabel: string): string {
  const initiatorItems = trade.items.filter(i => i.side === 'initiator').length;
  const recipientItems = trade.items.filter(i => i.side === 'recipient').length;
  const give = `${initiatorItems} curio${initiatorItems === 1 ? '' : 's'}${trade.initiator_gold > 0 ? ` + ${trade.initiator_gold} gold` : ''}`;
  const get = `${recipientItems} curio${recipientItems === 1 ? '' : 's'}${trade.recipient_gold > 0 ? ` + ${trade.recipient_gold} gold` : ''}`;
  return `${fromLabel} offered ${give} for ${get}`;
}

function ThreadCard({
  thread, viewerId, userMonsters, busy, countering, onAccept, onDecline, onCancel, onStartCounter, onCounterSubmitted, readOnly,
}: {
  thread: TradeThread;
  viewerId: UserId;
  userMonsters: UserMonster[];
  busy?: boolean;
  countering?: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
  onCancel?: () => void;
  onStartCounter?: () => void;
  onCounterSubmitted?: () => void;
  readOnly?: boolean;
}) {
  const [showLog, setShowLog] = useState(false);
  const latest = thread.trades[thread.trades.length - 1];
  const isInitiator = latest.initiator_id === viewerId;
  const myItems = latest.items.filter(i => (isInitiator ? i.side === 'initiator' : i.side === 'recipient'));
  const theirItems = latest.items.filter(i => (isInitiator ? i.side === 'recipient' : i.side === 'initiator'));
  const myGold = isInitiator ? latest.initiator_gold : latest.recipient_gold;
  const theirGold = isInitiator ? latest.recipient_gold : latest.initiator_gold;
  const otherPartyId = isInitiator ? latest.recipient_id : latest.initiator_id;
  const canRespond = latest.status === 'pending' && latest.recipient_id === viewerId;
  const canCancel = latest.status === 'pending' && latest.initiator_id === viewerId;

  return (
    <div className="border border-neutral-800 rounded-xl p-4 bg-neutral-900/50">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-bold text-white">
          {isInitiator ? `To ${otherPartyId}` : `From ${otherPartyId}`}
        </p>
        <span className="text-xs text-gray-500 uppercase">{latest.status}</span>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm text-gray-300 mb-3">
        <div>
          <p className="text-xs text-gray-500 mb-1">You give</p>
          <p>{myItems.length} curio{myItems.length === 1 ? '' : 's'}{myGold > 0 ? ` + ${myGold} gold` : ''}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">You get</p>
          <p>{theirItems.length} curio{theirItems.length === 1 ? '' : 's'}{theirGold > 0 ? ` + ${theirGold} gold` : ''}</p>
        </div>
      </div>
      {latest.status === 'failed' && latest.fail_reason && (
        <p className="text-xs text-red-400 mb-2">{latest.fail_reason}</p>
      )}
      {canCancel && !readOnly && (
        <p className="text-xs text-gray-500 mb-2">Waiting for {otherPartyId} to respond.</p>
      )}

      {thread.trades.length > 1 && (
        <button onClick={() => setShowLog(v => !v)} className="text-xs text-indigo-400 hover:text-indigo-300 font-bold mb-2">
          {showLog ? '▲ Hide offer history' : `▼ Show offer history (${thread.trades.length} offers)`}
        </button>
      )}
      {showLog && (
        <div className="space-y-1 mb-3 border-l-2 border-neutral-800 pl-3">
          {thread.trades.map(t => (
            <p key={t.id} className="text-xs text-gray-500">
              {offerSummary(t, t.initiator_id === viewerId ? 'You' : t.initiator_id)}
              {' — '}{t.status}
            </p>
          ))}
        </div>
      )}

      {!readOnly && canRespond && (
        <div className="flex gap-2">
          <button
            disabled={busy}
            onClick={onAccept}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white disabled:opacity-50"
          >
            Accept
          </button>
          <button
            disabled={busy}
            onClick={onDecline}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-neutral-800 hover:bg-neutral-700 text-gray-300 disabled:opacity-50"
          >
            Decline
          </button>
          <button
            disabled={busy}
            onClick={onStartCounter}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-800 hover:bg-indigo-700 text-white disabled:opacity-50"
          >
            Counter
          </button>
        </div>
      )}
      {!readOnly && canCancel && (
        <button
          disabled={busy}
          onClick={onCancel}
          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-neutral-800 hover:bg-neutral-700 text-gray-300 disabled:opacity-50"
        >
          Cancel
        </button>
      )}

      {countering && onCounterSubmitted && (
        <div className="mt-4 pt-4 border-t border-neutral-800">
          <CounterOfferFlow
            trade={latest}
            viewerId={viewerId}
            userMonsters={userMonsters}
            onSubmitted={onCounterSubmitted}
          />
        </div>
      )}
    </div>
  );
}

function CounterOfferFlow({
  trade, viewerId, userMonsters, onSubmitted,
}: {
  trade: TradeWithItems;
  viewerId: UserId;
  userMonsters: UserMonster[];
  onSubmitted: () => void;
}) {
  const otherPartyId = trade.initiator_id === viewerId ? trade.recipient_id : trade.initiator_id;
  const [theirMonsters, setTheirMonsters] = useState<UserMonster[]>([]);

  useEffect(() => {
    fetchTradeableMonsters(otherPartyId).then(setTheirMonsters);
  }, [otherPartyId]);

  return (
    <OfferBuilder
      myMonsters={userMonsters}
      theirMonsters={theirMonsters}
      theirLabel={otherPartyId}
      submitLabel="Send Counter-Offer"
      onSubmit={async (myIds, theirIds, myGold, theirGold) => {
        const { error } = await counterTradeRequest({
          tradeId: trade.id, myMonsterIds: myIds, theirMonsterIds: theirIds, myGold, theirGold,
        });
        if (error) return error;
        onSubmitted();
        return null;
      }}
    />
  );
}

function NewTradeFlow({
  userId, userMonsters, onCreated,
}: {
  userId: UserId;
  userMonsters: UserMonster[];
  onCreated: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlayerSearchResult[]>([]);
  const [target, setTarget] = useState<PlayerSearchResult | null>(null);
  const [theirMonsters, setTheirMonsters] = useState<UserMonster[]>([]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => setResults(await searchPlayers(query)), 250);
    return () => clearTimeout(t);
  }, [query]);

  const selectTarget = async (p: PlayerSearchResult) => {
    setTarget(p);
    setResults([]);
    setQuery('');
    setTheirMonsters(await fetchTradeableMonsters(p.id));
  };

  if (!target) {
    return (
      <div className="max-w-md">
        <label className="text-sm font-bold text-gray-400 block mb-2">Search for a player</label>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Type a name…"
          className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-white text-sm"
        />
        <div className="mt-2 space-y-1">
          {results.map(p => (
            <button
              key={p.id}
              onClick={() => selectTarget(p)}
              className="w-full text-left px-3 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-sm text-gray-200"
            >
              {p.display_name} <span className="text-gray-500">· {p.grade}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-300">Trading with <span className="font-bold text-white">{target.display_name}</span></p>
        <button onClick={() => setTarget(null)} className="text-xs text-gray-500 hover:text-gray-300">Change player</button>
      </div>

      <OfferBuilder
        myMonsters={userMonsters}
        theirMonsters={theirMonsters}
        theirLabel={target.display_name}
        submitLabel="Send Trade Request"
        onSubmit={async (myIds, theirIds, myGold, theirGold) => {
          const { error } = await createTradeRequest({
            recipientId: target.id, myMonsterIds: myIds, theirMonsterIds: theirIds, myGold, theirGold,
          });
          if (error) return error;
          setTarget(null);
          setTheirMonsters([]);
          onCreated();
          return null;
        }}
      />
    </div>
  );
}

// Shared curio/gold picker + fee preview + submit, used by both a fresh
// trade proposal and a counter-offer — the only difference is what
// onSubmit does with the picks (create_trade_request vs counter_trade_request).
function OfferBuilder({
  myMonsters, theirMonsters, theirLabel, submitLabel, onSubmit,
}: {
  myMonsters: UserMonster[];
  theirMonsters: UserMonster[];
  theirLabel: string;
  submitLabel: string;
  onSubmit: (myIds: string[], theirIds: string[], myGold: number, theirGold: number) => Promise<string | null>;
}) {
  const [myPicked, setMyPicked] = useState<Set<string>>(new Set());
  const [theirPicked, setTheirPicked] = useState<Set<string>>(new Set());
  const [myGold, setMyGold] = useState(0);
  const [theirGold, setTheirGold] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (set: Set<string>, setSet: (s: Set<string>) => void, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSet(next);
  };

  const fee = previewFee(myPicked.size, theirPicked.size, myGold);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    const err = await onSubmit(Array.from(myPicked), Array.from(theirPicked), myGold, theirGold);
    setSubmitting(false);
    if (err) { setError(err); return; }
    setMyPicked(new Set());
    setTheirPicked(new Set());
    setMyGold(0);
    setTheirGold(0);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <MonsterPicker title="Your curios" monsters={myMonsters} picked={myPicked} onToggle={id => toggle(myPicked, setMyPicked, id)} />
        <MonsterPicker title={`${theirLabel}'s curios`} monsters={theirMonsters} picked={theirPicked} onToggle={id => toggle(theirPicked, setTheirPicked, id)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold text-gray-400 block mb-1">Add your gold (optional)</label>
          <input
            type="number"
            min={0}
            value={myGold}
            onChange={e => setMyGold(Math.max(0, parseInt(e.target.value, 10) || 0))}
            className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-white text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-400 block mb-1">Request their gold (optional)</label>
          <input
            type="number"
            min={0}
            value={theirGold}
            onChange={e => setTheirGold(Math.max(0, parseInt(e.target.value, 10) || 0))}
            className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-white text-sm"
          />
        </div>
      </div>

      <div className="rounded-lg bg-amber-950/30 border border-amber-900 px-4 py-3 text-sm text-amber-300">
        Estimated fee you'll pay if accepted: <span className="font-bold">{fee} gold</span>
        {' '}(250 per curio moved + 8% of any gold you send, min 1). Final fee is confirmed by the server when the trade is accepted.
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        disabled={submitting || (myPicked.size === 0 && theirPicked.size === 0)}
        onClick={submit}
        className="px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-black font-bold text-sm disabled:opacity-50"
      >
        {submitting ? 'Sending…' : submitLabel}
      </button>
    </div>
  );
}

function MonsterPicker({
  title, monsters, picked, onToggle,
}: {
  title: string;
  monsters: UserMonster[];
  picked: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-bold text-gray-400 mb-2">{title}</p>
      <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
        {monsters.map(m => (
          <button
            key={m.id}
            onClick={() => onToggle(m.id)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg border text-left text-sm ${
              picked.has(m.id) ? 'border-amber-400 bg-amber-900/20 text-amber-200' : 'border-neutral-800 bg-neutral-900 text-gray-300'
            }`}
          >
            <MonsterImage monster={displayDef(m)} className="w-8 h-8" emojiClassName="text-lg" />
            <span>{monsterLabel(m)} <span className="text-gray-500">Lv.{m.monster_level}</span></span>
          </button>
        ))}
        {monsters.length === 0 && <p className="text-xs text-gray-500">No curios available.</p>}
      </div>
    </div>
  );
}
