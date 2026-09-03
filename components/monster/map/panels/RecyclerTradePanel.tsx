'use client';
// Recycler NPC trade panel — shown by TrainingMap.tsx when the player steps
// within 1 tile of the recycler (pendingRecyclerTrade). Pure presentation;
// TrainingMap owns the trade itself (useTrashItems.tradeAll, the gold-earned
// flash, and the achievement-stats RPC) and passes the finished onTradeAll
// callback down.
import { TRASH_DEFS, TRASH_ORDER } from '@/lib/trashConfig';
import type { TrashInventory } from '@/hooks/useTrashItems';
import GameButton, { questButtonFontFamily, questButtonLetterSpacing, questTextShadowStyle, questTextStyle } from '@/components/GameButton';

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
    <div className="w-full max-w-sm bg-[#f0ddb8] border-2 border-[#c9a87a] rounded-2xl p-4 battle-panel-in">
      <div className="flex items-start gap-3 mb-4">
        <img
          src="/npcs/recycler.png"
          alt="Recycler"
          className="w-14 h-14 flex-shrink-0 object-contain object-bottom rounded-lg bg-white/70 border border-[#c9a87a]"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <div className="min-w-0">
          <p
            className="text-sm leading-tight"
            style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing }}
          >
            <span style={{ position: 'relative', display: 'inline-block' }}>
              <span aria-hidden style={questTextShadowStyle}>Recycler</span>
              <span style={{ ...questTextStyle, color: '#16a34a' }}>Recycler</span>
            </span>
          </p>
          <p className="text-[#6b4820] text-sm italic mt-1 leading-snug">
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
                complete ? 'bg-green-100 border-green-600' : 'bg-white/70 border-[#c9a87a]'
              }`}
            >
              <img
                src={`/trash/${type}.png`}
                alt={def.label}
                className="w-6 h-6 object-contain flex-shrink-0"
                style={{ imageRendering: 'auto' }}
              />
              <span className="flex-1 text-[10px] text-[#3a2610] leading-none">{def.label}</span>
              <span className="text-[10px] text-[#6b4820] leading-none">{def.bundleSize}=1g</span>
              <span className={`text-[11px] font-bold leading-none w-5 text-right ${count > 0 ? 'text-[#2a1505]' : 'text-[#a89c86]'}`}>
                {count}
              </span>
            </div>
          );
        })}
        {/* 6th slot empty */}
        <div className="rounded-md border border-[#c9a87a] bg-white/40 h-8" />
      </div>

      {canTrade && (
        <p className="text-center text-xs text-green-700 font-bold mb-3">
          Ready to trade →{' '}
          <span className="text-[#c9781a] inline-flex items-center gap-0.5">
            +{pendingTradeGold}g
            <img src="/icons/rewards/gold_coin.svg" alt="gold" className="w-3.5 h-3.5 object-contain inline" />
          </span>
        </p>
      )}
      {!canTrade && (
        <p className="text-center text-xs text-[#6b4820] mb-3">
          Collect more trash to make a bundle.
        </p>
      )}

      <div className="flex gap-2" style={{ fontSize: 14 }}>
        <GameButton
          variant="quest"
          color="#d97706"
          disabled={!canTrade}
          onClick={onTradeAll}
          className="flex-1"
        >
          Trade All
        </GameButton>
        <GameButton
          variant="quest"
          color="#57534e"
          onClick={onDismiss}
          className="flex-1"
        >
          Maybe Later
        </GameButton>
      </div>
    </div>
  );
}
