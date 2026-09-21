'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { UserId, USERS } from '@/lib/userSession';
import {
  SHOP_CATALOG,
  fetchInventory,
  spendGoldAndGrantItem,
  claimDailyItems,
  InventoryMap,
} from '@/lib/inventory';
import { SCROLL_CATALOG, ScrollItem } from '@/lib/skillScrolls';
import { USERPIC_CATALOG, userpicPath } from '@/lib/userpicShop';
import { TOME_CATALOG } from '@/lib/tomeShop';
import { Element, ELEMENT_ICON_SRC, SkillEffect } from '@/lib/monsterConfig';
import { CharacterStats } from '@/hooks/useWeeklyData';
import { logAction } from '@/lib/playerlog';
import { trackEvent } from '@/lib/analytics';
import { playShopPurchase } from '@/lib/sounds';
import { hasSeenTabTutorial, markTabTutorialSeen } from '@/lib/tutorial';
import { useTutorialSequence, TutorialStep } from '@/hooks/useTutorialSequence';
import TutorialSpotlight from '@/components/TutorialSpotlight';
import GameButton, { questButtonFontFamily, questButtonLetterSpacing, questTextShadowStyle, questTextStyle, questButtonDropShadow } from '@/components/GameButton';
import { woodTextureStyle, Nail } from '@/components/battle/MonsterHpPanel';
import VoucherRedeemPanel from '@/components/VoucherRedeemPanel';

const SCROLL_CATEGORY_LABELS: Record<ScrollItem['category'], string> = {
  unlearn: 'Unlearn',
  base: 'Base Kit',
  alt: 'Alt Skills',
  universal: 'Fighting Skills',
};

const ELEMENTS: Element[] = ['fire', 'water', 'leaf', 'storm', 'shadow', 'light'];

// A normalized shape for the detail popup — every catalog (consumables,
// scrolls, tomes, userpics) has a slightly different item shape (userpics
// have no `desc`/`icon`, e.g.), so each click site maps its own item into
// this before opening the popup rather than forcing one type on all four
// catalogs (2026-08-29).
interface ShopDetailItem {
  key: string;
  name: string;
  icon: string;
  desc?: string;
  cost: number;
  // One-time cosmetic unlocks (userpics) show "Owned"/nothing instead of a
  // repeatable Buy button once purchased.
  ownedOnly?: boolean;
  // Skill Scrolls only — lets the popup show tier/element/category plus a
  // damage comparison against a base element attack (every element's tier-1
  // "base" skill is exactly 1.0x, so that's the fixed yardstick). Undefined
  // for every other catalog (consumables, tomes, userpics).
  element?: Element | null;
  tier?: 1 | 2 | 3 | null;
  category?: ScrollItem['category'];
  baseDamageMultiplier?: number;
  effects?: SkillEffect[];
}

// Human-readable line for one SkillEffect — covers every `kind` the game
// currently has (see SkillEffect in lib/monsterConfig.ts). Fighting Skills
// (universal category) are effect-only with 0 direct damage, so this is the
// only place their mechanics show up at all; Alt skills show it alongside
// their damage comparison.
function formatSkillEffect(effect: SkillEffect): string {
  const pct = effect.magnitude !== undefined ? Math.round(Math.abs(effect.magnitude) * 100) : undefined;
  const sign = (effect.magnitude ?? 0) >= 0 ? '+' : '-';
  const when = effect.duration === 'battle' ? 'for the rest of the battle'
    : effect.duration === 'instant' ? ''
    : effect.duration ? `for ${effect.duration} turn${effect.duration === 1 ? '' : 's'}`
    : '';
  switch (effect.kind) {
    case 'self_atk_up':      return `${sign}${pct}% own Attack ${when}`.trim();
    case 'self_def_up':      return `${sign}${pct}% own Defense ${when}`.trim();
    case 'self_speed_up':    return `${sign}${pct}% own Speed ${when}`.trim();
    case 'enemy_atk_down':   return `-${pct}% enemy Attack ${when}`.trim();
    case 'enemy_def_down':   return `-${pct}% enemy Defense ${when}`.trim();
    case 'lifesteal':        return `Heals ${pct}% of damage dealt`;
    case 'accuracy_soften':  return `Softens partial-credit damage loss by ${pct}% ${when}`.trim();
    case 'flat_heal':        return `Instantly heals ${pct}% HP`;
    case 'cleanse':          return 'Instantly cleanses all status effects';
    default:                 return '';
  }
}

interface Props {
  userId: UserId;
  currentStats: CharacterStats;
  onSpendGold: (newStats: CharacterStats) => void;
  onThemeChange: (themeKey: string) => void;
}

// ---------------------------------------------------------------------------
// Shared item tile — used by every shop section so the layout stays in sync.
// Deliberately compact (icon + name + a corner badge, nothing else): cost and
// description used to live on the card itself and made every section a tall
// scroll. Now they only show in the detail popup opened on click (same
// pattern as the "My Inventory" tiles above) — see ShopDetailPopup below
// (2026-08-29).
// ---------------------------------------------------------------------------

const SHOP_CSS = `
  .scard { position:relative; display:flex; flex-direction:column; align-items:center; gap:6px; padding:10px 8px 10px; cursor:pointer;
    background:linear-gradient(180deg,#fffdf7 0%,#fbf3df 100%); border:2px solid #8b5e2a; border-radius:16px;
    box-shadow:0 4px 0 #8b5e2a, 0 8px 12px rgba(42,21,5,.2); transition:transform .1s, box-shadow .1s; }
  .scard::before { content:''; position:absolute; inset:4px; border:1px dashed #c9a87a; border-radius:11px; pointer-events:none; }
  .scard:hover { transform:translateY(-2px); box-shadow:0 6px 0 #8b5e2a, 0 11px 14px rgba(42,21,5,.26); }
  .scard:active { transform:translateY(3px); box-shadow:0 1px 0 #8b5e2a; }
  .scard-art { position:relative; width:100%; aspect-ratio:1; display:flex; align-items:center; justify-content:center; padding:8px;
    border-radius:12px; background:radial-gradient(circle,#fff6d6 0%,#f0ddb8 85%); border:1px solid #e0c790; }
  .scard-name { position:relative; width:100%; text-align:center; font-weight:800; font-size:12px; line-height:1.2; color:#2a1505;
    min-height:2.4em; display:flex; align-items:center; justify-content:center; }
  .sprice { position:relative; display:inline-flex; align-items:center; gap:4px; padding:2px 10px; border-radius:999px; font-weight:900; font-size:12px;
    border:2px solid #000; box-shadow:inset 0 -2px 0 rgba(0,0,0,.25); }
  .sprice-ok { background:#f5c542; color:#2a1505; }
  .sprice-no { background:#d6d3d1; color:#78716c; border-color:#78716c; }
  .sbadge { position:absolute; z-index:2; font-size:10px; font-weight:900; min-width:20px; text-align:center; padding:1px 6px; border-radius:999px; }
  .sselect { width:100%; appearance:none; cursor:pointer; padding:10px 36px 10px 14px; font-weight:800; font-size:14px; color:#2a1505;
    background:linear-gradient(180deg,#fffdf7 0%,#f0ddb8 100%); border:2px solid #8b5e2a; border-radius:12px; box-shadow:0 3px 0 #8b5e2a; outline:none; }
  .sselect:focus { box-shadow:0 3px 0 #8b5e2a, 0 0 0 3px rgba(245,201,92,.55); }
  .schip { font-size:12px; font-weight:800; padding:5px 14px; border-radius:999px; color:#6b4820; cursor:pointer;
    background:linear-gradient(180deg,#fffdf7 0%,#f0ddb8 100%); border:2px solid #8b5e2a; box-shadow:0 3px 0 #8b5e2a; transition:transform .1s, box-shadow .1s; }
  .schip:hover { transform:translateY(-1px); box-shadow:0 4px 0 #8b5e2a; }
  .schip:active { transform:translateY(2px); box-shadow:0 1px 0 #8b5e2a; }
  .schip-on { color:#2a1505; background:linear-gradient(180deg,#ffe9a8 0%,#f5c95c 100%); border-color:#c9781a; box-shadow:0 3px 0 #c9781a, 0 0 0 3px rgba(245,201,92,.5); }
  .spop { position:relative; padding:24px; background:linear-gradient(180deg,#fffdf7 0%,#fbf3df 100%); border:2px solid #8b5e2a; border-radius:20px;
    box-shadow:0 6px 0 #8b5e2a, 0 16px 30px rgba(0,0,0,.4); }
  .spop::before { content:''; position:absolute; inset:6px; border:1px dashed #c9a87a; border-radius:14px; pointer-events:none; }
  .spop > * { position:relative; }
  .shead { font-family:var(--font-cinzel), serif; font-weight:800; font-size:20px; color:#7a4a0f; }
`;

interface ShopCardProps {
  icon: string;
  name: string;
  cost: number;
  inBag?: number;
  affordable: boolean;
  owned?: boolean;
  imageSize?: string;
  onClick: () => void;
}

function ShopCard({
  icon, name, cost, inBag = 0,
  affordable, owned = false,
  imageSize = 'w-full h-full', onClick,
}: ShopCardProps) {
  return (
    <button onClick={onClick} className="scard">
      <div className="scard-art">
        <img src={icon} alt={name} className={`${imageSize} object-contain drop-shadow-[0_2px_2px_rgba(42,21,5,0.35)]`} />
        {owned ? (
          <span className="sbadge bottom-1 right-1 bg-green-600 text-white border-2 border-green-900">✓</span>
        ) : inBag > 0 && (
          <span className="sbadge bottom-1 right-1 bg-[#7a4a0f] text-white border-2 border-[#3a2610]">×{inBag}</span>
        )}
      </div>
      <p className="scard-name">{name}</p>
      {owned ? (
        <span className="sprice sprice-ok" style={{ background: '#86efac', borderColor: '#14532d' }}>Owned</span>
      ) : (
        <span className={`sprice ${affordable ? 'sprice-ok' : 'sprice-no'}`}>
          <img src="/icons/rewards/gold_coin.svg" alt="" className="w-3.5 h-3.5" /> {cost}
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------

export default function MonsterShop({ userId, currentStats, onSpendGold }: Props) {
  const [inventory, setInventory] = useState<InventoryMap>({});
  const [loading, setLoading] = useState(true);
  const [claimedToday, setClaimedToday] = useState(false);
  const [buyingKey, setBuyingKey] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ShopDetailItem | null>(null);
  const [scrollCategory, setScrollCategory] = useState<ScrollItem['category'] | 'all'>('all');
  const [scrollElement, setScrollElement] = useState<Element | 'all'>('all');
  const [activeSection, setActiveSection] = useState<'all' | 'items' | 'scrolls' | 'tomes' | 'sprites'>('all');
  const buyBusyRef = useRef(false);
  const isFamily = USERS[userId].isFamily;

  // First-visit tutorial for this tab — same mount-once pattern as
  // MonsterGuild's (this component unmounts when leaving the vault tab, so
  // a fresh mount already IS the "just switched here" signal). Step 2's
  // real action is switching shop sections rather than an actual purchase —
  // spending gold is the tab's whole point, but gating the tutorial on a
  // real currency spend felt like too heavy a first touch; browsing what's
  // on offer is the safer, reversible equivalent.
  const [shopTutorialActive, setShopTutorialActive] = useState(() => !hasSeenTabTutorial('vault', userId));
  const shopTutorialSteps: TutorialStep[] = useMemo(() => [
    {
      id: 'vault-welcome',
      title: 'Rewards Vault',
      body: 'Spend the Gold you earn here on real rewards and in-game items.',
    },
    {
      id: 'vault-sections',
      title: 'Browse the Shop',
      body: 'Use the dropdown to filter by Curio Battle Items, Curio Battle Skills, Tomes, or Trainer Sprites.',
      waitFor: activeSection !== 'all',
    },
  ], [activeSection]);
  const shopTutorial = useTutorialSequence({
    tabKey: 'vault',
    active: shopTutorialActive,
    steps: shopTutorialSteps,
    onDone: () => {
      markTabTutorialSeen('vault', userId);
      setShopTutorialActive(false);
    },
  });

  const loadInventory = async () => {
    const inv = await fetchInventory(userId);
    setInventory(inv);
    setLoading(false);
  };

  const handleDailyClaim = async () => {
    const claimed = await claimDailyItems(userId);
    if (claimed) {
      setClaimedToday(true);
      await loadInventory();
    } else {
      setClaimedToday(true); // already claimed
    }
  };

  useEffect(() => {
    loadInventory();
    if (isFamily) handleDailyClaim(); // eslint-disable-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleBuy = async (key: string, cost: number, name: string) => {
    // Guards against a rapid double-click firing two purchases before
    // `currentStats` (a prop from the parent) re-renders with the deducted
    // gold — both clicks would otherwise read the same pre-purchase balance
    // and both pass the affordability check, buying two items for one click.
    if (buyBusyRef.current) return;
    if (currentStats.gold < cost) {
      alert(`❌ Not enough Gold! You need 🪙 ${cost - currentStats.gold} more.`);
      trackEvent('shop_purchase_blocked_insufficient_gold', { item_key: key, cost, short_by: cost - currentStats.gold });
      return;
    }
    buyBusyRef.current = true;
    setBuyingKey(key);
    try {
      const newStats = await spendGoldAndGrantItem(userId, key, 1);
      if (!newStats) {
        alert('❌ Purchase failed — you may not have enough Gold anymore.');
        trackEvent('shop_purchase_attempt', { item_key: key, cost, success: false });
        return;
      }
      onSpendGold(newStats);
      await loadInventory();
      logAction(userId, new Date().toISOString().split('T')[0], 'purchase', `Bought ${name} from Curio Arena Shop`, 0, -cost);
      trackEvent('shop_purchase_attempt', { item_key: key, cost, success: true });
      playShopPurchase();
    } finally {
      buyBusyRef.current = false;
      setBuyingKey(null);
    }
  };

  if (loading) return <p className="text-stone-500 animate-pulse">Loading shop…</p>;

  return (
    <div>
      <style>{SHOP_CSS}</style>
      {shopTutorial.step && (
        <TutorialSpotlight
          key={shopTutorial.step.id}
          step={shopTutorial.step}
          stepIndex={shopTutorial.stepIndex}
          totalSteps={shopTutorial.totalSteps}
          isLast={shopTutorial.isLast}
          onNext={shopTutorial.next}
          onSkip={shopTutorial.skip}
          waitingForAction={shopTutorial.step.waitFor !== undefined}
        />
      )}

      {/* Header — same Bungee/stroke/shadow text treatment as the quest
          GameButton's label (2026-08-29), in quest gold instead of the
          button's white. */}
      <div className="mb-2" data-tutorial-id="vault-welcome">
        <h1 className="text-2xl lg:text-3xl" style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing }}>
          <span style={{ position: 'relative', display: 'inline-block' }}>
            <span aria-hidden style={questTextShadowStyle}>Curio Arena Shop</span>
            <span style={{ ...questTextStyle, color: '#f5c542' }}>Curio Arena Shop</span>
          </span>
        </h1>
      </div>
      <p className="text-[#6b4820] text-sm mb-6 font-semibold">
        Buy consumable items to use in Curio Arena battles.
        {isFamily && ' As a family member, you receive free daily supplies!'}
      </p>

      <VoucherRedeemPanel
        userId={userId}
        onRedeemed={result => {
          if (result.stats) onSpendGold(result.stats);
          loadInventory();
        }}
      />

      {/* Daily claim banner for family */}
      {isFamily && (
        <div className={`mb-6 p-4 rounded-xl border ${claimedToday ? 'bg-green-50 border-green-300' : 'bg-amber-50 border-amber-300'}`}>
          {claimedToday ? (
            <p className="text-green-700 text-sm font-bold">✅ Daily supply claimed! 3× Health Potion + 1× Iron Shield added to your inventory.</p>
          ) : (
            <p className="text-amber-700 text-sm font-bold">
              <img src="/icons/rewards/gift.svg" alt="Gift" className="inline w-4 h-4 align-[-2px]" /> Claiming your daily supply…
            </p>
          )}
        </div>
      )}

      {/* Inventory — same wood-plank + gold-ring + corner-nail frame as the
          battle screen's MonsterHpPanel, reusing its exported style pieces
          rather than re-deriving them (2026-08-29). */}
      <div
        className="relative border-2 border-[#4a2f18] rounded-xl p-5 mb-8"
        style={{ boxShadow: `0 0 0 3px #d4a017, ${questButtonDropShadow}`, ...woodTextureStyle }}
      >
        <Nail className="top-2 left-2" />
        <Nail className="top-2 right-2" />
        <Nail className="bottom-2 left-2" />
        <Nail className="bottom-2 right-2" />
        <h2 className="text-sm font-bold text-[#fde68a] uppercase tracking-widest mb-3" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>My Inventory</h2>
        {Object.keys(inventory).length === 0 ? (
          <p className="text-[#f0ddb8] text-sm italic" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>No items yet. Buy some below!</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-8 xl:grid-cols-10 gap-3">
            {SHOP_CATALOG.map(item => {
              const qty = inventory[item.key] || 0;
              if (qty === 0) return null;
              return (
                <button
                  key={item.key}
                  onClick={() => setSelectedItem(item)}
                  className="scard !p-1.5"
                  title={item.name}
                >
                  <div className="scard-art">
                    <img src={item.icon} alt={item.name} className="w-full h-full object-contain drop-shadow-[0_2px_2px_rgba(42,21,5,0.35)]" />
                    <span className="sbadge bottom-1 right-1 bg-[#7a4a0f] text-white border-2 border-[#3a2610]">×{qty}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Category filter — a dropdown instead of tabs so it reads as
          filtering by game-use rather than switching screens (2026-08-29). */}
      <div className="mb-6" data-tutorial-id="vault-sections">
        <label className="text-xs font-extrabold text-[#6b4820] uppercase tracking-widest block mb-2">Filter by category</label>
        <div className="relative max-w-xs">
          <select
            value={activeSection}
            onChange={e => setActiveSection(e.target.value as typeof activeSection)}
            className="sselect"
          >
            <option value="all">All Items</option>
            <option value="items">Curio Battle Items</option>
            <option value="scrolls">Curio Battle Skills</option>
            <option value="tomes">Tomes of Knowledge</option>
            <option value="sprites">Trainer Sprites</option>
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#7a4a0f] text-xs">▼</span>
        </div>
      </div>

      {/* Curio Battle Items — consumables */}
      {(activeSection === 'all' || activeSection === 'items') && (
        <div className="mb-8">
          {activeSection === 'all' && <h2 className="shead mb-3">⚔️ Curio Battle Items</h2>}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
            {SHOP_CATALOG.map(item => (
              <ShopCard
                key={item.key}
                icon={item.icon}
                name={item.name}
                cost={item.cost}
                inBag={inventory[item.key] || 0}
                affordable={currentStats.gold >= item.cost}
                onClick={() => setSelectedItem(item)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Curio Battle Skills (Skill Scrolls) — the actual gold sink for the
          skill loadout system. Purchase-only here; scrolls sit in inventory
          until spent teaching or unlearning a monster's skill in the
          Compendium. Category/element filters only shown when this section
          is viewed on its own — "All Items" lists every scroll unfiltered to
          stay a plain overview. */}
      {(activeSection === 'all' || activeSection === 'scrolls') && (
        <div className="mb-8">
          {activeSection === 'all' ? (
            <h2 className="shead mb-3">📜 Curio Battle Skills</h2>
          ) : (
            <p className="text-stone-500 text-sm mb-4">
              Buy an Unlearn Scroll to open a monster&apos;s skill slot in the Compendium, then a
              named scroll to teach it something new.
            </p>
          )}

          {activeSection === 'scrolls' && (
            <>
              {/* Category filter */}
              <div className="flex flex-wrap gap-2 mb-3">
                {(['all', 'unlearn', 'base', 'alt', 'universal'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setScrollCategory(cat)}
                    className={`schip ${scrollCategory === cat ? 'schip-on' : ''}`}
                  >
                    {cat === 'all' ? 'All' : SCROLL_CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>

              {/* Element filter */}
              {(scrollCategory === 'all' || scrollCategory === 'base' || scrollCategory === 'alt') && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {(['all', ...ELEMENTS] as const).map(el => (
                    <button
                      key={el}
                      onClick={() => setScrollElement(el)}
                      className={`schip capitalize ${scrollElement === el ? 'schip-on' : ''}`}
                    >
                      {el}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
            {SCROLL_CATALOG
              .filter(item => activeSection === 'all' || scrollCategory === 'all' || item.category === scrollCategory)
              .filter(item => activeSection === 'all' || scrollElement === 'all' || item.element === scrollElement || item.category === 'unlearn' || item.category === 'universal')
              .map(item => (
                <ShopCard
                  key={item.key}
                  icon={item.icon}
                  name={item.name}
                  cost={item.cost}
                  inBag={inventory[item.key] || 0}
                  affordable={currentStats.gold >= item.cost}
                  onClick={() => setSelectedItem(item)}
                />
              ))}
          </div>
        </div>
      )}

      {/* Tomes of Knowledge — one-shot boosters for the Tutor reroll system
          in the Compendium (see lib/curioQuality.ts / lib/tutorCurio.ts).
          Each tome only boosts a roll made from its matching curio quality
          tier; consumed atomically inside the tutor_curio RPC. */}
      {(activeSection === 'all' || activeSection === 'tomes') && (
        <div className="mb-8">
          {activeSection === 'all' ? (
            <h2 className="shead mb-3">📚 Tomes of Knowledge</h2>
          ) : (
            <p className="text-stone-500 text-sm mb-4">
              Boost the odds of a single Tutor roll in the Compendium. Each tome only helps a curio
              currently at its matching quality tier.
            </p>
          )}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
            {TOME_CATALOG.map(item => (
              <ShopCard
                key={item.key}
                icon={item.icon}
                name={item.name}
                cost={item.cost}
                inBag={inventory[item.key] || 0}
                affordable={currentStats.gold >= item.cost}
                onClick={() => setSelectedItem(item)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Trainer Sprites — cosmetic gold sink. One-time unlocks stored as
          qty-1 player_inventory rows; equip them from the avatar picker on
          the Hero Profile card once owned. Not one of the 4 categories named
          in the filter's design brief, but kept reachable rather than
          dropped from the shop entirely. */}
      {(activeSection === 'all' || activeSection === 'sprites') && (
        <div>
          {activeSection === 'all' ? (
            <h2 className="shead mb-3">🖼️ Trainer Sprites</h2>
          ) : (
            <p className="text-stone-500 text-sm mb-4">
              Unlock premium portraits for your Hero Profile. Once purchased, equip them anytime from your avatar picker.
            </p>
          )}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
            {USERPIC_CATALOG.map(item => (
              <ShopCard
                key={item.key}
                icon={userpicPath(item.file)}
                name={item.name}
                cost={item.cost}
                affordable={currentStats.gold >= item.cost}
                owned={(inventory[item.key] || 0) > 0}
                onClick={() => setSelectedItem({
                  key: item.key,
                  name: item.name,
                  icon: userpicPath(item.file),
                  desc: 'A premium portrait for your Hero Profile — equip it anytime from your avatar picker once owned.',
                  cost: item.cost,
                  ownedOnly: true,
                })}
              />
            ))}
          </div>
        </div>
      )}

      {/* Inventory item detail popup — tapping a tile in "My Inventory" opens
          this instead of showing name/qty inline on the tile itself
          (2026-08-29). */}
      {selectedItem && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="spop max-w-sm w-full text-center battle-panel-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 w-28 h-28 p-3 rounded-full flex items-center justify-center" style={{ background: 'radial-gradient(circle,#fff6d6 0%,#f0ddb8 85%)', border: '2px solid #c9a87a' }}>
              <img src={selectedItem.icon} alt={selectedItem.name} className="w-full h-full object-contain" />
            </div>
            <h3 className="font-display text-2xl font-extrabold text-[#7a4a0f] mb-1">{selectedItem.name}</h3>
            <p className="text-sm font-semibold text-[#6b4820] mb-4">{selectedItem.desc}</p>

            {/* Skill Scrolls only — tier/element/category plus a damage
                comparison against a base element attack (every element's
                tier-1 "base" skill is exactly 1.0x, so it's a fixed
                yardstick every scroll can be measured against) (2026-08-29). */}
            {selectedItem.baseDamageMultiplier !== undefined && (
              <div className="bg-[#f5ecd6] border-2 border-[#c9a87a] rounded-xl p-3 mb-4 text-left">
                <div className="flex items-center justify-center flex-wrap gap-2 mb-3">
                  {selectedItem.element && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wide bg-white border-2 border-[#8b5e2a] rounded-full px-2.5 py-0.5 text-[#7a4a0f] capitalize">
                      <img src={ELEMENT_ICON_SRC[selectedItem.element]} alt="" className="w-3 h-3" /> {selectedItem.element}
                    </span>
                  )}
                  {selectedItem.tier && (
                    <span className="text-xs font-bold" title={`Tier ${selectedItem.tier}`}>
                      <span className="text-[#c9781a]">{'★'.repeat(selectedItem.tier)}</span>
                      <span className="text-[#d6c3a0]">{'★'.repeat(3 - selectedItem.tier)}</span>
                    </span>
                  )}
                  {selectedItem.category && (
                    <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#6b4820]">
                      {SCROLL_CATEGORY_LABELS[selectedItem.category]}
                    </span>
                  )}
                </div>

                {selectedItem.baseDamageMultiplier > 0 ? (() => {
                  const pct = Math.round((selectedItem.baseDamageMultiplier! - 1) * 100);
                  const compareLabel = pct === 0
                    ? 'Same damage as a base attack'
                    : pct > 0
                      ? `+${pct}% damage vs. base attack`
                      : `${pct}% damage vs. base attack — trades power for its effect`;
                  const compareColor = pct > 0 ? 'text-green-700' : pct < 0 ? 'text-amber-700' : 'text-stone-600';
                  return (
                    <div className="space-y-1.5">
                      <div>
                        <div className="flex justify-between text-[10px] font-bold text-[#6b4820] mb-0.5">
                          <span>Base Attack</span><span>1.0x</span>
                        </div>
                        <div className="h-2.5 bg-[#e8d0a0] border border-[#c9a87a] rounded-full overflow-hidden">
                          <div className="h-full bg-[#a08560] rounded-full" style={{ width: `${Math.min(100, (1 / 2) * 100)}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] text-[#7a4a0f] font-extrabold mb-0.5">
                          <span>{selectedItem.name}</span><span>{selectedItem.baseDamageMultiplier}x</span>
                        </div>
                        <div className="h-2.5 bg-[#e8d0a0] border border-[#c9a87a] rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-[#f5c542] to-[#c9781a] rounded-full" style={{ width: `${Math.min(100, (selectedItem.baseDamageMultiplier! / 2) * 100)}%` }} />
                        </div>
                      </div>
                      <p className={`text-[11px] text-center font-bold pt-1 ${compareColor}`}>{compareLabel}</p>
                    </div>
                  );
                })() : (
                  <p className="text-[11px] text-[#6b4820] text-center italic mb-2">No direct damage — a utility/support skill.</p>
                )}

                {/* Effects — the whole reason a Fighting Skill (0 damage) is
                    worth teaching at all, and what an Alt skill trades some
                    of its damage for. */}
                {selectedItem.effects && selectedItem.effects.length > 0 && (
                  <div className={selectedItem.baseDamageMultiplier > 0 ? 'mt-2 pt-2 border-t-2 border-[#c9a87a]' : ''}>
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#6b4820] mb-1">
                      {selectedItem.effects.length > 1 ? 'Effects' : 'Effect'}
                    </p>
                    <ul className="space-y-0.5">
                      {selectedItem.effects.map((effect, i) => (
                        <li key={i} className="text-[11px] text-[#2a1505] font-bold flex items-center gap-1.5">
                          <span className="text-[#c9781a]">✦</span> {formatSkillEffect(effect)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {(() => {
              const owned = (inventory[selectedItem.key] || 0) > 0;
              const alreadyOwned = selectedItem.ownedOnly && owned;
              return (
                <>
                  {!selectedItem.ownedOnly && (
                    <p className="mb-4"><span className="inline-block text-xs font-extrabold text-[#7a4a0f] bg-[#f0ddb8] border border-[#c9a87a] rounded-full px-3 py-0.5">In bag: ×{inventory[selectedItem.key] || 0}</span></p>
                  )}
                  {alreadyOwned ? (
                    <div className="flex gap-2">
                      <div className="flex-1 bg-[#dcfce7] border-2 border-[#15803d] text-[#166534] font-extrabold uppercase tracking-wide text-xs py-2.5 rounded-xl text-center flex items-center justify-center">
                        ✓ Owned
                      </div>
                      <GameButton variant="quest" color="#57534e" onClick={() => setSelectedItem(null)} className="flex-1" style={{ fontSize: 14 }}>
                        Close
                      </GameButton>
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-4">
                      <GameButton variant="quest" color="#57534e" onClick={() => setSelectedItem(null)} className="flex-1" style={{ fontSize: 14 }}>
                        Close
                      </GameButton>
                      <GameButton
                        variant="quest"
                        color={currentStats.gold >= selectedItem.cost ? '#d97706' : '#57534e'}
                        disabled={currentStats.gold < selectedItem.cost || buyingKey === selectedItem.key}
                        onClick={() => handleBuy(selectedItem.key, selectedItem.cost, selectedItem.name)}
                        className="flex-1"
                        style={{ fontSize: 14 }}
                      >
                        {buyingKey === selectedItem.key ? 'Buying…' : (
                          <span className="inline-flex items-center gap-1">
                            Buy {selectedItem.cost} <img src="/icons/rewards/gold_coin.svg" alt="" className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </GameButton>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
