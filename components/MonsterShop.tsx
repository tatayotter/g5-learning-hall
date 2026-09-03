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
    <button
      onClick={onClick}
      className="relative bg-[#fdf6e3] border border-amber-200 rounded-xl p-2 aspect-square flex flex-col items-center justify-center hover:border-amber-400 hover:shadow-md transition-all"
    >
      <div className="w-2/3 h-2/3 flex items-center justify-center">
        <img src={icon} alt={name} className={`${imageSize} object-contain`} />
      </div>
      <p className="text-[10px] font-bold text-amber-900 text-center leading-tight mt-1 truncate w-full px-1">{name}</p>
      <span className={`absolute top-1 left-1 inline-flex items-center gap-0.5 border border-black text-[8px] font-extrabold px-1 py-0.5 rounded-full ${(affordable || owned) ? 'bg-amber-400 text-black' : 'bg-stone-200 text-stone-400'}`}>
        <img src="/icons/rewards/gold_coin.svg" alt="" className="w-2 h-2" /> {cost}
      </span>
      {owned ? (
        <span className="absolute bottom-1 right-1 bg-green-600 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-green-800">✓</span>
      ) : inBag > 0 && (
        <span className="absolute bottom-1 right-1 bg-amber-800 text-white text-[9px] font-bold min-w-[16px] px-1 rounded-full border border-amber-900 text-center leading-[14px]">
          ×{inBag}
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
      <p className="text-gray-500 text-sm mb-6">
        Buy consumable items to use in Curio Arena battles.
        {isFamily && ' As a family member, you receive free daily supplies!'}
      </p>

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
          <div className="grid grid-cols-5 gap-3">
            {SHOP_CATALOG.map(item => {
              const qty = inventory[item.key] || 0;
              if (qty === 0) return null;
              return (
                <button
                  key={item.key}
                  onClick={() => setSelectedItem(item)}
                  className="relative bg-white border border-amber-200 rounded-lg aspect-square p-2 flex items-center justify-center hover:border-amber-400 hover:shadow-md transition-all"
                >
                  <img src={item.icon} alt={item.name} className="w-full h-full object-contain" />
                  <span className="absolute bottom-1 right-1 bg-amber-800 text-white text-[10px] font-bold min-w-[18px] px-1 py-0.5 rounded-full leading-none border border-amber-900 text-center">
                    ×{qty}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Category filter — a dropdown instead of tabs so it reads as
          filtering by game-use rather than switching screens (2026-08-29). */}
      <div className="mb-6" data-tutorial-id="vault-sections">
        <label className="text-xs font-bold text-stone-500 uppercase tracking-widest block mb-1.5">Filter by category</label>
        <div className="relative max-w-xs">
          <select
            value={activeSection}
            onChange={e => setActiveSection(e.target.value as typeof activeSection)}
            className="w-full appearance-none bg-white border-2 border-amber-300 rounded-lg pl-3 pr-9 py-2.5 font-bold text-sm text-amber-900 cursor-pointer"
          >
            <option value="all">All Items</option>
            <option value="items">Curio Battle Items</option>
            <option value="scrolls">Curio Battle Skills</option>
            <option value="tomes">Tomes of Knowledge</option>
            <option value="sprites">Trainer Sprites</option>
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-amber-600 text-xs">▼</span>
        </div>
      </div>

      {/* Curio Battle Items — consumables */}
      {(activeSection === 'all' || activeSection === 'items') && (
        <div className="mb-8">
          {activeSection === 'all' && <h2 className="text-sm font-bold text-amber-800 uppercase tracking-widest mb-3">⚔️ Curio Battle Items</h2>}
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
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
            <h2 className="text-sm font-bold text-amber-800 uppercase tracking-widest mb-3">📜 Curio Battle Skills</h2>
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
                    className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
                      scrollCategory === cat ? 'bg-amber-500 text-white shadow-sm' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
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
                      className={`text-xs font-bold px-3 py-1 rounded-full capitalize transition-colors ${
                        scrollElement === el ? 'bg-amber-800 text-white' : 'bg-white border border-amber-200 text-stone-500 hover:text-stone-700'
                      }`}
                    >
                      {el}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
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
            <h2 className="text-sm font-bold text-amber-800 uppercase tracking-widest mb-3">📚 Tomes of Knowledge</h2>
          ) : (
            <p className="text-stone-500 text-sm mb-4">
              Boost the odds of a single Tutor roll in the Compendium. Each tome only helps a curio
              currently at its matching quality tier.
            </p>
          )}
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
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
            <h2 className="text-sm font-bold text-amber-800 uppercase tracking-widest mb-3">🖼️ Trainer Sprites</h2>
          ) : (
            <p className="text-stone-500 text-sm mb-4">
              Unlock premium portraits for your Hero Profile. Once purchased, equip them anytime from your avatar picker.
            </p>
          )}
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
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
            className="bg-white border border-[#c9a87a] rounded-2xl p-6 max-w-sm w-full text-center battle-panel-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-20 h-20 mx-auto mb-3">
              <img src={selectedItem.icon} alt={selectedItem.name} className="w-full h-full object-contain" />
            </div>
            <h3 className="text-lg font-bold text-[#2a1505] mb-1">{selectedItem.name}</h3>
            <p className="text-sm text-[#6b4820] mb-3">{selectedItem.desc}</p>

            {/* Skill Scrolls only — tier/element/category plus a damage
                comparison against a base element attack (every element's
                tier-1 "base" skill is exactly 1.0x, so it's a fixed
                yardstick every scroll can be measured against) (2026-08-29). */}
            {selectedItem.baseDamageMultiplier !== undefined && (
              <div className="bg-[#fdf6e3] border border-amber-200 rounded-xl p-3 mb-4 text-left">
                <div className="flex items-center justify-center flex-wrap gap-2 mb-3">
                  {selectedItem.element && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-white border border-amber-200 rounded-full px-2 py-0.5 text-amber-800 capitalize">
                      <img src={ELEMENT_ICON_SRC[selectedItem.element]} alt="" className="w-3 h-3" /> {selectedItem.element}
                    </span>
                  )}
                  {selectedItem.tier && (
                    <span className="text-xs font-bold" title={`Tier ${selectedItem.tier}`}>
                      <span className="text-amber-500">{'★'.repeat(selectedItem.tier)}</span>
                      <span className="text-stone-300">{'★'.repeat(3 - selectedItem.tier)}</span>
                    </span>
                  )}
                  {selectedItem.category && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
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
                        <div className="flex justify-between text-[10px] text-stone-500 mb-0.5">
                          <span>Base Attack</span><span>1.0x</span>
                        </div>
                        <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
                          <div className="h-full bg-stone-400 rounded-full" style={{ width: `${Math.min(100, (1 / 2) * 100)}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] text-amber-800 font-bold mb-0.5">
                          <span>{selectedItem.name}</span><span>{selectedItem.baseDamageMultiplier}x</span>
                        </div>
                        <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, (selectedItem.baseDamageMultiplier! / 2) * 100)}%` }} />
                        </div>
                      </div>
                      <p className={`text-[11px] text-center font-bold pt-1 ${compareColor}`}>{compareLabel}</p>
                    </div>
                  );
                })() : (
                  <p className="text-[11px] text-stone-500 text-center italic mb-2">No direct damage — a utility/support skill.</p>
                )}

                {/* Effects — the whole reason a Fighting Skill (0 damage) is
                    worth teaching at all, and what an Alt skill trades some
                    of its damage for. */}
                {selectedItem.effects && selectedItem.effects.length > 0 && (
                  <div className={selectedItem.baseDamageMultiplier > 0 ? 'mt-2 pt-2 border-t border-amber-200' : ''}>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500 mb-1">
                      {selectedItem.effects.length > 1 ? 'Effects' : 'Effect'}
                    </p>
                    <ul className="space-y-0.5">
                      {selectedItem.effects.map((effect, i) => (
                        <li key={i} className="text-[11px] text-amber-900 font-bold flex items-center gap-1.5">
                          <span className="text-amber-500">✦</span> {formatSkillEffect(effect)}
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
                    <p className="text-xs text-[#8b5e2a] font-bold mb-4">In bag: ×{inventory[selectedItem.key] || 0}</p>
                  )}
                  {alreadyOwned ? (
                    <div className="flex gap-2">
                      <div className="flex-1 bg-stone-100 border-2 border-stone-300 text-stone-500 font-extrabold uppercase tracking-wide text-xs py-2.5 rounded-lg text-center">
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
