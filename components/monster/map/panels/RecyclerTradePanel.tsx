'use client';
// Recycler NPC trade panel — shown by TrainingMap.tsx when the player steps
// within 1 tile of the recycler (pendingRecyclerTrade). Pure presentation;
// TrainingMap owns the trade itself (useTrashItems.tradeAll, the gold-earned
// flash, and the achievement-stats RPC) and passes the finished onTradeAll
// callback down.
import { TRASH_DEFS, TRASH_ORDER } from '@/lib/trashConfig';
import type { TrashInventory } from '@/hooks/useTrashItems';

interface RecyclerTradePanelProps {
  trashInventory: TrashInventory;
  canTrade: boolean;
  /** Gold the player will earn if they trade all complete bundles right now. */
  pendingTradeGold: number;
  onTradeAll: () => void;
  onDismiss: () => void;
}

export default function RecyclerTradePanel({ trashInventory, canTrade, pendingTradeGold, onTradeAll, onDismiss }: RecyclerTradePanelProps) {
  return (
    <div className="w-full max-w-sm bg-neutral-900 border border-green-700 rounded-2xl p-4 battle-panel-in">
      <div className="flex items-start gap-3 mb-4">
        <img
          src="/npcs/recycler.png"
          alt="Recycler"
          className="w-14 h-14 flex-shrink-0 object-contain object-bottom rounded-lg bg-neutral-800"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <div className="min-w-0">
          <p className="font-bold text-green-300 text-sm leading-tight">♻️ Recycler</p>
          <p className="text-gray-300 text-sm italic mt-1 leading-snug">
            "Got trash? I'll give you gold for it!"
          </p>
        </div>
      </div>

      {/* 1×6 inventory list */}
      <div className="flex flex-col gap-1 mb-4">
        {TRASH_ORDER.map(type => {
          const def = TRASH_DEFS[type];
          const count = trashInventory[type];
          const complete = count >= def.bundleSize;
          return (
            <div
              key={type}
              className={`flex items-center gap-2 rounded-md border px-2 py-1 ${
                complete ? 'bg-green-900/30 border-green-700' : 'bg-neutral-800 border-neutral-700'
              }`}
            >
              <img
                src={`/trash/${type}.png`}
                alt={def.label}
                className="w-6 h-6 object-contain flex-shrink-0"
                style={{ imageRendering: 'auto' }}
              />
              <span className="flex-1 text-[10px] text-gray-300 leading-none">{def.label}</span>
              <span className="text-[10px] text-gray-500 leading-none">{def.bundleSize}=1g</span>
              <span className={`text-[11px] font-bold leading-none w-5 text-right ${count > 0 ? 'text-white' : 'text-neutral-600'}`}>
                {count}
              </span>
            </div>
          );
        })}
        {/* 6th slot empty */}
        <div className="rounded-md border border-neutral-800 bg-neutral-900/40 h-8" />
      </div>

      {canTrade && (
        <p className="text-center text-xs text-green-400 font-bold mb-3">
          Ready to trade →{' '}
          <span className="text-amber-300 inline-flex items-center gap-0.5">
            +{pendingTradeGold}g
            <img src="/icons/rewards/gold_coin.svg" alt="gold" className="w-3.5 h-3.5 object-contain inline" />
          </span>
        </p>
      )}
      {!canTrade && (
        <p className="text-center text-xs text-gray-500 mb-3">
          Collect more trash to make a bundle.
        </p>
      )}

      <div className="flex gap-2">
        <button
          disabled={!canTrade}
          className="flex-1 bg-green-700 hover:bg-green-600 active:bg-green-800 disabled:opacity-40
                     text-white font-bold text-sm py-2.5 rounded-xl transition-colors"
          onClick={onTradeAll}
        >
          ♻️ Trade All
        </button>
        <button
          className="flex-1 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-900
                     text-gray-400 font-bold text-sm py-2.5 rounded-xl border border-neutral-700
                     transition-colors"
          onClick={onDismiss}
        >
          Maybe Later
        </button>
      </div>
    </div>
  );
}
