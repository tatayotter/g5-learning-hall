'use client';

import { useEffect, useState } from 'react';
import { UserId, USERS } from '@/lib/userSession';
import {
  SHOP_CATALOG,
  fetchInventory,
  addInventoryItem,
  claimDailyItems,
  InventoryMap,
  ItemKey,
} from '@/lib/inventory';
import { CharacterStats } from '@/hooks/useWeeklyData';
import { logAction } from '@/lib/playerlog';

interface Props {
  userId: UserId;
  currentStats: CharacterStats;
  onSpendGold: (newStats: CharacterStats) => void;
}

export default function MonsterShop({ userId, currentStats, onSpendGold }: Props) {
  const [inventory, setInventory] = useState<InventoryMap>({});
  const [loading, setLoading] = useState(true);
  const [claimedToday, setClaimedToday] = useState(false);
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
  }, [userId]);

  const handleBuy = async (key: ItemKey, cost: number) => {
    if (currentStats.gold < cost) {
      alert(`❌ Not enough Gold! You need 🪙 ${cost - currentStats.gold} more.`);
      return;
    }
    const item = SHOP_CATALOG.find(i => i.key === key);
    const newStats = { ...currentStats, gold: currentStats.gold - cost };
    onSpendGold(newStats);
    await addInventoryItem(userId, key, 1);
    await loadInventory();
    logAction(userId, new Date().toISOString().split('T')[0], 'purchase', `Bought ${item?.name ?? key} from Monster Arena Shop`, 0, -cost);
  };

  if (loading) return <p className="text-gray-500 animate-pulse">Loading shop...</p>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2 font-display">⚔️ Monster Arena Shop</h1>
      <p className="text-gray-400 text-sm mb-6">
        Buy consumable items to use in Monster Arena battles.
        {isFamily && ' As a family member, you receive free daily supplies!'}
      </p>

      {/* Daily claim banner for family */}
      {isFamily && (
        <div className={`mb-6 p-4 rounded-xl border ${claimedToday ? 'bg-green-900/20 border-green-800' : 'bg-yellow-900/20 border-yellow-700'}`}>
          {claimedToday ? (
            <p className="text-green-400 text-sm font-bold">✅ Daily supply claimed! 3x Health Potion + 1x Iron Shield added to your inventory.</p>
          ) : (
            <p className="text-yellow-400 text-sm font-bold">🎁 Claiming your daily supply...</p>
          )}
        </div>
      )}

      {/* Inventory */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-8">
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
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-white text-sm font-bold">{item.name}</span>
                  <span className="bg-neutral-700 text-yellow-400 text-xs font-bold px-2 py-0.5 rounded-full">x{qty}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Shop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SHOP_CATALOG.map(item => (
          <div key={item.key} className="bg-[#111] border border-[#333] p-5 rounded-xl flex flex-col justify-between">
            <div>
              <div className="text-3xl mb-2">{item.icon}</div>
              <h3 className="text-white font-bold mb-1">{item.name}</h3>
              <p className="text-yellow-400 text-sm font-bold mb-2">🪙 {item.cost} Gold</p>
              <p className="text-gray-400 text-xs mb-4">{item.desc}</p>
              {(inventory[item.key] || 0) > 0 && (
                <p className="text-green-400 text-xs mb-2 font-bold">In bag: x{inventory[item.key]}</p>
              )}
            </div>
            <button
              onClick={() => handleBuy(item.key, item.cost)}
              disabled={currentStats.gold < item.cost}
              className="w-full bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-2 rounded-lg transition-colors text-sm"
            >
              {currentStats.gold >= item.cost ? 'Buy' : 'Not Enough Gold'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}