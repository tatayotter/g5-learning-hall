'use client';

import { useEffect, useRef, useState } from 'react';
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
import { THEME_CATALOG } from '@/lib/themeShop';
import { Element } from '@/lib/monsterConfig';
import { CharacterStats } from '@/hooks/useWeeklyData';
import { logAction } from '@/lib/playerlog';
import { trackEvent } from '@/lib/analytics';
import { playShopPurchase } from '@/lib/sounds';

const SCROLL_CATEGORY_LABELS: Record<ScrollItem['category'], string> = {
  unlearn: 'Unlearn',
  base: 'Base Kit',
  alt: 'Alt Skills',
  universal: 'Fighting Skills',
};

const ELEMENTS: Element[] = ['fire', 'water', 'leaf', 'storm', 'shadow', 'light'];

interface Props {
  userId: UserId;
  currentStats: CharacterStats;
  weekStartingDate: string;
  onSpendGold: (newStats: CharacterStats) => void;
  onThemeChange: (themeKey: string) => void;
}

export default function MonsterShop({ userId, currentStats, weekStartingDate, onSpendGold, onThemeChange }: Props) {
  const [inventory, setInventory] = useState<InventoryMap>({});
  const [loading, setLoading] = useState(true);
  const [claimedToday, setClaimedToday] = useState(false);
  const [buyingKey, setBuyingKey] = useState<string | null>(null);
  const [scrollCategory, setScrollCategory] = useState<ScrollItem['category'] | 'all'>('all');
  const [scrollElement, setScrollElement] = useState<Element | 'all'>('all');
  const [activeSection, setActiveSection] = useState<'items' | 'scrolls' | 'sprites' | 'themes'>('items');
  const [equippedTheme, setEquippedTheme] = useState(USERS[userId].theme);
  const buyBusyRef = useRef(false);
  const isFamily = USERS[userId].isFamily;

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
    if (isFamily) handleDailyClaim();
    setEquippedTheme(USERS[userId].theme);
  }, [userId]);

  const handleEquipTheme = (themeKey: string) => {
    setEquippedTheme(themeKey);
    onThemeChange(themeKey);
  };

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
      const newStats = await spendGoldAndGrantItem(userId, weekStartingDate, key, 1);
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

  if (loading) return <p className="text-gray-500 animate-pulse">Loading shop...</p>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2 font-display">Curio Arena Shop</h1>
      <p className="text-gray-400 text-sm mb-6">
        Buy consumable items to use in Curio Arena battles.
        {isFamily && ' As a family member, you receive free daily supplies!'}
      </p>

      {/* Daily claim banner for family */}
      {isFamily && (
        <div className={`mb-6 p-4 rounded-xl border ${claimedToday ? 'bg-green-900/20 border-green-800' : 'bg-yellow-900/20 border-yellow-700'}`}>
          {claimedToday ? (
            <p className="text-green-400 text-sm font-bold">✅ Daily supply claimed! 3x Health Potion + 1x Iron Shield added to your inventory.</p>
          ) : (
            <p className="text-yellow-400 text-sm font-bold"><img src="/icons/rewards/gift.svg" alt="Gift" className="inline w-4 h-4 align-[-2px]" /> Claiming your daily supply...</p>
          )}
        </div>
      )}

      {/* Inventory */}
      <div className="bg-[#111] border border-[#333] p-6 rounded-xl shadow-2xl mb-8">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">My Inventory</h2>
        {Object.keys(inventory).length === 0 ? (
          <p className="text-gray-500 text-sm italic">No items yet. Buy some below!</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {SHOP_CATALOG.map(item => {
              const qty = inventory[item.key] || 0;
              if (qty === 0) return null;
              return (
                <div key={item.key} className="bg-neutral-800 rounded-lg px-3 py-2 flex items-center gap-2">
                  <img src={item.icon} alt={item.name} className="w-6 h-6 object-contain" />
                  <span className="text-white text-sm font-bold">{item.name}</span>
                  <span className="bg-neutral-700 text-yellow-400 text-xs font-bold px-2 py-0.5 rounded-full">x{qty}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section tabs */}
      <div className="flex border-b border-neutral-800 mb-6 space-x-2">
        {([
          { id: 'items',   label: '⚔️ Curio Arena Shop' },
          { id: 'scrolls', label: '📜 Skill Scrolls' },
          { id: 'sprites', label: '🖼️ Trainer Sprites' },
          { id: 'themes',  label: '🎨 Themes' },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`px-4 py-2.5 font-bold text-sm whitespace-nowrap transition-colors ${
              activeSection === tab.id
                ? 'border-b-2 border-indigo-500 text-indigo-400'
                : 'text-gray-500 hover:text-gray-300 hover:bg-neutral-900 rounded-t'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Curio Arena Shop — consumables */}
      {activeSection === 'items' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {SHOP_CATALOG.map(item => {
            const affordable = currentStats.gold >= item.cost;
            return (
              <div key={item.key} className="bg-[#161010] border-2 border-[#000000] rounded-2xl p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.08)] flex flex-col justify-between">
                <div>
                  <img src={item.icon} alt={item.name} className="w-12 h-12 object-contain mb-2" />
                  <h3 className="text-white font-bold mb-2">{item.name}</h3>
                  <div className="mb-3">
                    <span className={`inline-flex items-center gap-1 border-2 border-[#000000] text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full ${affordable ? 'bg-[#47982a] text-black shadow-[2px_2px_0_0_#000]' : 'bg-neutral-800 text-gray-400'}`}>
                      <img src="/icons/rewards/gold_coin.svg" alt="" className="w-3 h-3" /> {item.cost} GOLD
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs mb-4">{item.desc}</p>
                  {(inventory[item.key] || 0) > 0 && (
                    <p className="text-green-400 text-xs mb-2 font-bold">In bag: x{inventory[item.key]}</p>
                  )}
                </div>
                <button
                  onClick={() => handleBuy(item.key, item.cost, item.name)}
                  disabled={!affordable || buyingKey === item.key}
                  className="w-full py-2.5 rounded-lg font-extrabold text-sm uppercase tracking-wide text-white bg-indigo-600 hover:bg-indigo-500 border-2 border-[#000000] shadow-[3px_3px_0_0_#000] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] disabled:bg-neutral-700 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed disabled:active:translate-x-0 disabled:active:translate-y-0 transition-all"
                >
                  {buyingKey === item.key ? 'Buying...' : affordable ? 'Buy' : 'Not Enough Gold'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Skill Scrolls — the actual gold sink for the skill loadout system.
          Purchase-only here; scrolls sit in inventory until spent teaching or
          unlearning a monster's skill in the Compendium. */}
      {activeSection === 'scrolls' && (
        <div>
          <p className="text-gray-400 text-sm mb-4">
            Buy an Unlearn Scroll to open a monster&apos;s skill slot in the Compendium, then a
            named scroll to teach it something new.
          </p>

          <div className="flex flex-wrap gap-2 mb-3">
            {(['all', 'unlearn', 'base', 'alt', 'universal'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setScrollCategory(cat)}
                className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
                  scrollCategory === cat ? 'bg-indigo-700 text-white' : 'bg-neutral-800 text-gray-400 hover:bg-neutral-700'
                }`}
              >
                {cat === 'all' ? 'All' : SCROLL_CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          {(scrollCategory === 'all' || scrollCategory === 'base' || scrollCategory === 'alt') && (
            <div className="flex flex-wrap gap-2 mb-4">
              {(['all', ...ELEMENTS] as const).map(el => (
                <button
                  key={el}
                  onClick={() => setScrollElement(el)}
                  className={`text-xs font-bold px-3 py-1 rounded-full capitalize transition-colors ${
                    scrollElement === el ? 'bg-neutral-700 text-white' : 'bg-neutral-900 border border-neutral-800 text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {el}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {SCROLL_CATALOG
              .filter(item => scrollCategory === 'all' || item.category === scrollCategory)
              .filter(item => scrollElement === 'all' || item.element === scrollElement || item.category === 'unlearn' || item.category === 'universal')
              .map(item => {
                const affordable = currentStats.gold >= item.cost;
                return (
                  <div key={item.key} className="bg-[#161010] border-2 border-[#000000] rounded-2xl p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.08)] flex flex-col justify-between">
                    <div>
                      <img src={item.icon} alt={item.name} className="w-12 h-12 object-contain mb-2" />
                      <h3 className="text-white font-bold mb-2">{item.name}</h3>
                      <div className="mb-3">
                        <span className={`inline-flex items-center gap-1 border-2 border-[#000000] text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full ${affordable ? 'bg-[#47982a] text-black shadow-[2px_2px_0_0_#000]' : 'bg-neutral-800 text-gray-400'}`}>
                          <img src="/icons/rewards/gold_coin.svg" alt="" className="w-3 h-3" /> {item.cost} GOLD
                        </span>
                      </div>
                      <p className="text-gray-400 text-xs mb-4">{item.desc}</p>
                      {(inventory[item.key] || 0) > 0 && (
                        <p className="text-green-400 text-xs mb-2 font-bold">In bag: x{inventory[item.key]}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleBuy(item.key, item.cost, item.name)}
                      disabled={!affordable || buyingKey === item.key}
                      className="w-full py-2.5 rounded-lg font-extrabold text-sm uppercase tracking-wide text-white bg-indigo-600 hover:bg-indigo-500 border-2 border-[#000000] shadow-[3px_3px_0_0_#000] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] disabled:bg-neutral-700 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed disabled:active:translate-x-0 disabled:active:translate-y-0 transition-all"
                    >
                      {buyingKey === item.key ? 'Buying...' : affordable ? 'Buy' : 'Not Enough Gold'}
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Trainer Sprites — cosmetic gold sink. One-time unlocks stored as
          qty-1 player_inventory rows; equip them from the avatar picker on
          the Hero Profile card once owned. */}
      {activeSection === 'sprites' && (
        <div>
          <p className="text-gray-400 text-sm mb-4">
            Unlock premium portraits for your Hero Profile. Once purchased, equip them anytime from your avatar picker.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {USERPIC_CATALOG.map(item => {
              const owned = (inventory[item.key] || 0) > 0;
              const affordable = currentStats.gold >= item.cost;
              return (
                <div key={item.key} className="bg-[#161010] border-2 border-[#000000] rounded-2xl p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.08)] flex flex-col justify-between">
                  <div>
                    <img src={userpicPath(item.file)} alt={item.name} className="w-16 h-16 object-contain mb-2 rounded-lg bg-neutral-950" />
                    <h3 className="text-white font-bold mb-2">{item.name}</h3>
                    <div className="mb-3">
                      <span className={`inline-flex items-center gap-1 border-2 border-[#000000] text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full ${affordable || owned ? 'bg-[#47982a] text-black shadow-[2px_2px_0_0_#000]' : 'bg-neutral-800 text-gray-400'}`}>
                        <img src="/icons/rewards/gold_coin.svg" alt="" className="w-3 h-3" /> {item.cost} GOLD
                      </span>
                    </div>
                  </div>
                  {owned ? (
                    <div className="w-full bg-neutral-800 border-2 border-[#000000] text-gray-300 font-extrabold uppercase tracking-wide text-sm py-2.5 rounded-lg text-center">
                      ✓ Owned
                    </div>
                  ) : (
                    <button
                      onClick={() => handleBuy(item.key, item.cost, item.name)}
                      disabled={!affordable || buyingKey === item.key}
                      className="w-full py-2.5 rounded-lg font-extrabold text-sm uppercase tracking-wide text-white bg-indigo-600 hover:bg-indigo-500 border-2 border-[#000000] shadow-[3px_3px_0_0_#000] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] disabled:bg-neutral-700 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed disabled:active:translate-x-0 disabled:active:translate-y-0 transition-all"
                    >
                      {buyingKey === item.key ? 'Buying...' : affordable ? 'Buy' : 'Not Enough Gold'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Themes — cosmetic gold sink, same one-time player_inventory unlock
          as Trainer Sprites above, except equipping happens right here
          instead of a separate picker (there's no big built-in-free gallery
          to browse, just the catalog itself). theme_default is always free
          and always "owned" — it's the app's base styling with no item row. */}
      {activeSection === 'themes' && (
        <div>
          <p className="text-gray-400 text-sm mb-4">
            Unlock new color themes for the whole app. Once purchased, equip any theme you own anytime.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {THEME_CATALOG.map(item => {
              const isDefault = item.key === 'theme_default';
              const owned = isDefault || (inventory[item.key] || 0) > 0;
              const affordable = currentStats.gold >= item.cost;
              const isEquipped = equippedTheme === item.key;
              return (
                <div key={item.key} className="bg-[#161010] border-2 border-[#000000] rounded-2xl p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.08)] flex flex-col justify-between">
                  <div>
                    <div className="w-16 h-16 mb-2 rounded-lg overflow-hidden grid grid-cols-2 grid-rows-2 border border-neutral-800">
                      {item.swatch.slice(0, 4).map((color, i) => (
                        <div key={i} style={{ backgroundColor: color }} />
                      ))}
                    </div>
                    <h3 className="text-white font-bold mb-2">{item.name}</h3>
                    <div className="mb-3">
                      <span className={`inline-flex items-center gap-1 border-2 border-[#000000] text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full ${affordable || owned ? 'bg-[#47982a] text-black shadow-[2px_2px_0_0_#000]' : 'bg-neutral-800 text-gray-400'}`}>
                        {isDefault ? 'FREE' : (<><img src="/icons/rewards/gold_coin.svg" alt="" className="w-3 h-3" /> {item.cost} GOLD</>)}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs mb-4">{item.description}</p>
                  </div>
                  {isEquipped ? (
                    <div className="w-full bg-amber-600 border-2 border-[#000000] text-white font-extrabold uppercase tracking-wide text-sm py-2.5 rounded-lg text-center">
                      ✓ Equipped
                    </div>
                  ) : owned ? (
                    <button
                      onClick={() => handleEquipTheme(item.key)}
                      className="w-full py-2.5 rounded-lg font-extrabold text-sm uppercase tracking-wide text-white bg-neutral-700 hover:bg-neutral-600 border-2 border-[#000000] shadow-[3px_3px_0_0_#000] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all"
                    >
                      Equip
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBuy(item.key, item.cost, item.name)}
                      disabled={!affordable || buyingKey === item.key}
                      className="w-full py-2.5 rounded-lg font-extrabold text-sm uppercase tracking-wide text-white bg-indigo-600 hover:bg-indigo-500 border-2 border-[#000000] shadow-[3px_3px_0_0_#000] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] disabled:bg-neutral-700 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed disabled:active:translate-x-0 disabled:active:translate-y-0 transition-all"
                    >
                      {buyingKey === item.key ? 'Buying...' : affordable ? 'Buy' : 'Not Enough Gold'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}