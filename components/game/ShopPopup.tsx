'use client';
// The Shopkeeper's pop-up: talking to him in Inkwell Town opens the Shop over the map, in the
// game's pop-up frame (GamePopup), with the shelves in their phone-first compact layout.
import { useState } from 'react';
import GamePopup from '@/components/game/GamePopup';
import MonsterShop from '@/components/MonsterShop';
import type { UserId } from '@/lib/userSession';
import type { CharacterStats } from '@/hooks/useWeeklyData';

const LINES = [
  'Look, but don\'t lick the potions.',
  'Everything here is the best. I checked.',
  'My shop has the shiniest things in town!',
  'A smart shopper saves gold for what they really want.',
  'New things on the shelf! Take a look.',
];

// The Shopkeeper's idle frame from his map sheet (lib/townNpcs.ts: 78 x 116 frames, 18 walk
// frames, then idle), head and shoulders.
const SHEET = { src: '/npcs/walk/shopkeeper_right.webp', w: 1482, h: 116, fw: 78, frame: 18 };
export function ShopkeeperPortrait({ size = 56 }: { size?: number }) {
  const k = (size * 1.3) / SHEET.fw;
  return (
    <div
      aria-hidden
      className="relative flex-shrink-0"
      style={{
        width: SHEET.fw * k, height: SHEET.h * k, marginTop: 3,
        backgroundImage: `url(${SHEET.src})`, backgroundRepeat: 'no-repeat',
        backgroundSize: `${SHEET.w * k}px ${SHEET.h * k}px`, backgroundPosition: `${-SHEET.frame * SHEET.fw * k}px 0`,
      }}
    />
  );
}

interface Props {
  userId: UserId;
  currentStats: CharacterStats;
  onSpendGold: (stats: CharacterStats) => void;
  onThemeChange: (themeKey: string) => void;
  onClose: () => void;
}

export default function ShopPopup({ userId, currentStats, onSpendGold, onThemeChange, onClose }: Props) {
  const [line] = useState(() => LINES[Math.floor(Math.random() * LINES.length)]);
  return (
    <GamePopup
      title="Shop"
      speaker={{ portrait: <ShopkeeperPortrait />, line }}
      size="lg"
      onClose={onClose}
      testId="shop-popup"
      footer={
        <div className="flex items-center justify-between gap-2 text-sm font-bold text-[#2a1505]">
          <span>Your gold</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#2a1505] bg-[#f5c542] px-3 py-0.5 font-black" data-testid="shop-popup-gold">
            <img src="/icons/rewards/gold_coin.svg" alt="" className="w-4 h-4" /> {currentStats.gold.toLocaleString()}
          </span>
        </div>
      }
    >
      <MonsterShop userId={userId} currentStats={currentStats} onSpendGold={onSpendGold} onThemeChange={onThemeChange} compact />
    </GamePopup>
  );
}
