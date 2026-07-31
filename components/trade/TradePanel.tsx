'use client';
// components/trade/TradePanel.tsx
// Peer-to-peer curio trading UI. Every fee/ownership/gold computation happens
// server-side inside the trading RPCs (lib/trades.ts) — this component only
// ever displays what those RPCs return, same pattern as the rest of the app's
// gold handling (hooks/useWeeklyData.ts:applyGoldDelta).
import { useState, useEffect, useCallback } from 'react';
import { startOfWeek, format } from 'date-fns';
import { UserId } from '@/lib/userSession';
import { ALL_MONSTERS } from '@/lib/monsterConfig';
import { UserMonster } from '@/components/battle/shared';
import { MonsterImage } from '@/components/battle/shared';
import {
  searchPlayers, fetchTradeableMonsters, createTradeRequest, respondToTrade,
  cancelTradeRequest, fetchMyTrades, PlayerSearchResult, TradeWithItems,
} from '@/lib/trades';

interface TradePanelProps {
  userId: UserId;
  userMonsters: UserMonster[];
  onTradeCompleted: () => void;
}

// Curio-for-curio: 250 gold per curio moved, both sides counted, initiator
// pays. Gold sent by either side: 8% on top of what they send, ceiling
// rounded, minimum 1 gold. These mirror respond_to_trade's server-side math
// exactly and are display-only here — the RPC is the source of truth for
// what actually gets charged.
function previewFee(myMonsterCount: number, theirMonsterCount: number, myGold: number, theirGold: number) {
  const curioFee = 250 * (myMonsterCount + theirMonsterCount);
  const myGoldFee = myGold > 0 ? Math.max(1, Math.ceil(myGold * 0.08)) : 0;
  return curioFee + myGoldFee;
}

function monsterLabel(m: UserMonster): string {
  return ALL_MONSTERS[m.monster_id]?.name ?? m.monster_id;
}

const currentSunday = () => format(startOfWeek(new Date()), 'yyyy-MM-dd');

export default function TradePanel({ userId, userMonsters, onTradeCompleted }: TradePanelProps) {
  const [tab, setTab] = useState<'pending' | 'new' | 'history'>('pending');
  const [trades, setTrades] = useState<TradeWithItems[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadTrades = useCallback(async () => {
    setTrades(await fetchMyTrades(userId));
  }, [userId]);

  useEffect(() => { loadTrades(); }, [loadTrades]);

  const incoming = trades.filter(t => t.status === 'pending' && t.recipient_id === userId);
  const outgoing = trades.filter(t => t.status === 'pending' && t.initiator_id === userId);
  const history = trades.filter(t => t.status !== 'pending');

  const handleRespond = async (tradeId: string, accept: boolean) => {
    setBusyId(tradeId);
    await respondToTrade(tradeId, accept, currentSunday());
    setBusyId(null);
    await loadTrades();
    onTradeCompleted();
  };

  const handleCancel = async (tradeId: string) => {
    setBusyId(tradeId);
    await cancelTradeRequest(tradeId);
    setBusyId(null);
    await loadTrades();
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-neutral-800">
        {([
          { id: 'pending', label: `Requests${incoming.length > 0 ? ` (${incoming.length})` : ''}` },
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
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">Incoming</h3>
            {incoming.length === 0 && <p className="text-sm text-gray-500">No incoming trade requests.</p>}
            <div className="space-y-3">
              {incoming.map(t => (
                <TradeRequestCard
                  key={t.id}
                  trade={t}
                  userMonsters={userMonsters}
                  viewerId={userId}
                  busy={busyId === t.id}
                  onAccept={() => handleRespond(t.id, true)}
                  onDecline={() => handleRespond(t.id, false)}
                />
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">Outgoing</h3>
            {outgoing.length === 0 && <p className="text-sm text-gray-500">No outgoing trade requests.</p>}
            <div className="space-y-3">
              {outgoing.map(t => (
                <TradeRequestCard
                  key={t.id}
                  trade={t}
                  userMonsters={userMonsters}
                  viewerId={userId}
                  busy={busyId === t.id}
                  onCancel={() => handleCancel(t.id)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'new' && (
        <NewTradeFlow
          userId={userId}
          userMonsters={userMonsters}
          onCreated={async () => { await loadTrades(); setTab('pending'); }}
        />
      )}

      {tab === 'history' && (
        <div className="space-y-3">
          {history.length === 0 && <p className="text-sm text-gray-500">No completed trades yet.</p>}
          {history.map(t => (
            <TradeRequestCard key={t.id} trade={t} userMonsters={userMonsters} viewerId={userId} readOnly />
          ))}
        </div>
      )}
    </div>
  );
}

function TradeRequestCard({
  trade, viewerId, busy, onAccept, onDecline, onCancel, readOnly,
}: {
  trade: TradeWithItems;
  userMonsters: UserMonster[];
  viewerId: UserId;
  busy?: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
  onCancel?: () => void;
  readOnly?: boolean;
}) {
  const isInitiator = trade.initiator_id === viewerId;
  const myItems = trade.items.filter(i => (isInitiator ? i.side === 'initiator' : i.side === 'recipient'));
  const theirItems = trade.items.filter(i => (isInitiator ? i.side === 'recipient' : i.side === 'initiator'));
  const myGold = isInitiator ? trade.initiator_gold : trade.recipient_gold;
  const theirGold = isInitiator ? trade.recipient_gold : trade.initiator_gold;
  const otherPartyId = isInitiator ? trade.recipient_id : trade.initiator_id;

  return (
    <div className="border border-neutral-800 rounded-xl p-4 bg-neutral-900/50">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-bold text-white">
          {isInitiator ? `To ${otherPartyId}` : `From ${otherPartyId}`}
        </p>
        <span className="text-xs text-gray-500 uppercase">{trade.status}</span>
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
      {trade.status === 'failed' && trade.fail_reason && (
        <p className="text-xs text-red-400 mb-2">{trade.fail_reason}</p>
      )}
      {!readOnly && (onAccept || onCancel) && (
        <div className="flex gap-2">
          {onAccept && (
            <button
              disabled={busy}
              onClick={onAccept}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white disabled:opacity-50"
            >
              Accept
            </button>
          )}
          {onDecline && (
            <button
              disabled={busy}
              onClick={onDecline}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-neutral-800 hover:bg-neutral-700 text-gray-300 disabled:opacity-50"
            >
              Decline
            </button>
          )}
          {onCancel && (
            <button
              disabled={busy}
              onClick={onCancel}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-neutral-800 hover:bg-neutral-700 text-gray-300 disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
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
  const [myPicked, setMyPicked] = useState<Set<string>>(new Set());
  const [theirPicked, setTheirPicked] = useState<Set<string>>(new Set());
  const [myGold, setMyGold] = useState(0);
  const [theirGold, setTheirGold] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const toggle = (set: Set<string>, setSet: (s: Set<string>) => void, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSet(next);
  };

  const fee = previewFee(myPicked.size, theirPicked.size, myGold, theirGold);

  const submit = async () => {
    if (!target) return;
    setSubmitting(true);
    setError(null);
    const { tradeId, error: err } = await createTradeRequest({
      recipientId: target.id,
      myMonsterIds: Array.from(myPicked),
      theirMonsterIds: Array.from(theirPicked),
      myGold,
      theirGold,
    });
    setSubmitting(false);
    if (!tradeId) { setError(err ?? 'Could not create trade request.'); return; }
    setTarget(null);
    setTheirMonsters([]);
    setMyPicked(new Set());
    setTheirPicked(new Set());
    setMyGold(0);
    setTheirGold(0);
    onCreated();
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

      <div className="grid grid-cols-2 gap-4">
        <MonsterPicker title="Your curios" monsters={userMonsters} picked={myPicked} onToggle={id => toggle(myPicked, setMyPicked, id)} />
        <MonsterPicker title={`${target.display_name}'s curios`} monsters={theirMonsters} picked={theirPicked} onToggle={id => toggle(theirPicked, setTheirPicked, id)} />
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
        {submitting ? 'Sending…' : 'Send Trade Request'}
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
            <MonsterImage monster={ALL_MONSTERS[m.monster_id]} className="w-8 h-8" emojiClassName="text-lg" />
            <span>{monsterLabel(m)} <span className="text-gray-500">Lv.{m.monster_level}</span></span>
          </button>
        ))}
        {monsters.length === 0 && <p className="text-xs text-gray-500">No curios available.</p>}
      </div>
    </div>
  );
}
