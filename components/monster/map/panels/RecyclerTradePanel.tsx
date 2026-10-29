'use client';
// Recycler NPC trade panel — shown by TrainingMap.tsx when the player steps
// within 1 tile of the recycler (pendingRecyclerTrade). Pure presentation;
// TrainingMap owns the trade itself (useTrashItems.tradeAll, the gold-earned
// flash, and the achievement-stats RPC) and passes the finished onTradeAll
// callback down. With the garden on, the Recycler also buys veggies and wood
// (onSellVeggies, hooks/useGarden.ts). Uses the in-game pop-up frame (components/game/GamePopup.tsx).
import { TRASH_DEFS, TRASH_ORDER } from '@/lib/trashConfig';
import type { TrashInventory } from '@/hooks/useTrashItems';
import { FIND_SELL_PRICE, GARDEN_KEYS, RARES, RARE_ORDER, RARE_SELL_PRICE, VEGGIES, VEGGIE_ORDER, VEGGIE_SELL_PRICE, gardenItemIcon, gardenItemLabel, gardenSellPrice, gardenSellable, veggieKey, type GardenBag } from '@/lib/gardenConfig';
import GameButton from '@/components/GameButton';
import GamePopup from '@/components/game/GamePopup';

interface RecyclerTradePanelProps {
  trashInventory: TrashInventory;
  canTrade: boolean;
  /** Gold the player will earn if they trade all complete bundles right now. */
  pendingTradeGold: number;
  onTradeAll: () => void;
  onDismiss: () => void;
  // Garden on: the bag's veggies and wood, and selling them all (online only).
  gardenBag?: GardenBag;
  onSellVeggies?: () => void;
  sellingVeggies?: boolean;
  offline?: boolean;
}

export default function RecyclerTradePanel({
  trashInventory, canTrade, pendingTradeGold, onTradeAll, onDismiss, gardenBag, onSellVeggies, sellingVeggies, offline,
}: RecyclerTradePanelProps) {
  const forSale = gardenBag ? GARDEN_KEYS.filter(k => gardenSellable(k) && (gardenBag[k] ?? 0) > 0) : [];
  const saleCount = forSale.reduce((sum, k) => sum + (gardenBag?.[k] ?? 0), 0);
  const wood = forSale.filter(k => k.startsWith('wood_')).reduce((sum, k) => sum + (gardenBag?.[k] ?? 0), 0);
  // Finds (shells, crystals...) by name, every grown veggie together as "veggies".
  const finds = VEGGIE_ORDER.filter(v => VEGGIES[v].found && (gardenBag?.[veggieKey(v)] ?? 0) > 0)
    .map(v => ({ n: gardenBag?.[veggieKey(v)] ?? 0, noun: VEGGIES[v].found!.noun }));
  const rares = RARE_ORDER.filter(r => (gardenBag?.[RARES[r].key] ?? 0) > 0)
    .map(r => ({ n: gardenBag?.[RARES[r].key] ?? 0, noun: RARES[r].label }));
  const veggieCount = saleCount - wood - [...finds, ...rares].reduce((sum, f) => sum + f.n, 0);
  const saleGold = forSale.reduce((sum, k) => sum + (gardenBag?.[k] ?? 0) * gardenSellPrice(k), 0);
  const saleWords = [
    veggieCount > 0 && `${veggieCount} veggie${veggieCount === 1 ? '' : 's'}`,
    ...finds.map(f => `${f.n} ${f.noun}${f.n === 1 ? '' : 's'}`),
    ...rares.map(f => `${f.n} ${f.noun}${f.n === 1 ? '' : 's'}`),
    wood > 0 && `${wood} wood`,
  ].filter(Boolean).join(', ').replace(/, ([^,]*)$/, ' and $1');
  return (
    <GamePopup
      inline
      title="Recycler"
      speaker={{
        portrait: (
          <img
            src="/npcs/recycler.png"
            alt=""
            className="w-14 h-14 object-contain object-top"
            onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
          />
        ),
        line: "Got trash? I'll give you gold for it!",
      }}
      onClose={onDismiss}
      testId="recycler-panel"
      footer={
        <GameButton variant="quest" color="#d97706" disabled={!canTrade} onClick={onTradeAll} className="w-full" style={{ fontSize: 15 }}>
          Trade All
        </GameButton>
      }
    >
      {/* What the kid has of each kind of trash */}
      <div className="flex flex-col gap-1 mb-4">
        {TRASH_ORDER.map(type => {
          const def = TRASH_DEFS[type];
          const count = trashInventory[type];
          const complete = count >= def.bundleSize;
          return (
            <div
              key={type}
              className={`flex items-center gap-2 rounded-md border px-2 py-1 ${
                complete ? 'bg-green-100 border-green-600' : 'bg-[#fffdf7] border-[#c9a87a]'
              }`}
            >
              <img
                src={`/trash/${type}.png`}
                alt={def.label}
                className="w-6 h-6 object-contain flex-shrink-0"
                style={{ imageRendering: 'auto' }}
              />
              <span className="flex-1 text-[12px] font-semibold text-[#3a2610] leading-none">{def.label}</span>
              <span className="text-[11px] text-[#6b4820] leading-none">{def.bundleSize} = 1 gold</span>
              <span className={`text-[13px] font-bold leading-none w-6 text-right ${count > 0 ? 'text-[#2a1505]' : 'text-[#a89c86]'}`}>
                {count}
              </span>
            </div>
          );
        })}
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

      {onSellVeggies && (
        <div className="bg-[#e3f1cf] border border-[#7a9a4a] rounded-xl p-2 mb-3" data-testid="sell-veggies">
          <p className="text-xs font-bold text-[#2f4a12] mb-1.5">
            I buy veggies, shells and wood too! {VEGGIE_SELL_PRICE} gold each. Crystals, pearls and petals {FIND_SELL_PRICE} gold. Rare finds {RARE_SELL_PRICE} gold!
          </p>
          {forSale.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {forSale.map(k => (
                  <span key={k} className="flex items-center gap-1 bg-white/80 border border-[#a8c486] rounded-md pl-0.5 pr-1.5 py-0.5 text-[11px] font-bold text-[#2a1505]">
                    <img src={gardenItemIcon(k)} alt={gardenItemLabel(k)} className="w-5 h-5 object-contain" style={{ imageRendering: 'pixelated' }} />
                    {gardenBag?.[k]}
                  </span>
                ))}
              </div>
              <GameButton
                variant="quest"
                color="#4d7c0f"
                disabled={sellingVeggies || offline}
                onClick={onSellVeggies}
                className="w-full"
                style={{ fontSize: 13 }}
                data-testid="sell-veggies-button"
              >
                {offline ? 'Selling needs internet' : `Sell ${saleWords} (+${saleGold}g)`}
              </GameButton>
            </>
          ) : (
            <p className="text-[11px] text-[#3f5a1f]">Pick veggies, find shells or chop trees on the map and bring them here.</p>
          )}
        </div>
      )}

    </GamePopup>
  );
}
