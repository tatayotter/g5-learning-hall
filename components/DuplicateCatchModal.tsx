'use client';
import GameButton from '@/components/GameButton';
// Fired from MonsterGuild.handleBattleEnd when a wild-encounter win catches a
// species the player already owns (active team or catch inbox). Used to
// silently auto-convert to gold (see DUPLICATE_CATCH_GOLD) — now a player
// choice, so a kept duplicate can also be Tutored later (see
// lib/curioQuality.ts). No charge/reveal ceremony beat here, unlike
// DailyBonusModal/CurioRevealModal — this is a decision, not a reward.
interface DuplicateCatchModalProps {
  monsterName: string;
  goldValue: number;
  userId: string;
  onKeep: () => void;
  onConvert: () => void;
}

export default function DuplicateCatchModal({ monsterName, goldValue, userId, onKeep, onConvert }: DuplicateCatchModalProps) {
  const isTala = userId === 'tala';
  return (
    <div className="fixed inset-0 bg-black/85 z-[60] flex items-center justify-center p-4">
      <div
        className={`relative bg-[#f0ddb8] border-2 rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center battle-panel-in ${
          isTala ? 'border-pink-500' : 'border-amber-600'
        }`}
      >
        <p className={`font-bold text-sm tracking-wide mb-4 ${isTala ? 'text-pink-700' : 'text-amber-700'}`}>
          ✨ DUPLICATE CATCH ✨
        </p>
        <p className="text-[#2a1505] font-bold text-lg mb-1">You already have {monsterName}!</p>
        <p className="text-[#6b4820] text-xs mb-6">
          Keep it as a spare in your Catch Inbox (a fresh Normal-quality copy you can promote or Tutor later), or convert it to gold right now.
        </p>
        <div className="space-y-2" style={{ fontSize: 15 }}>
          <GameButton variant="quest" color="#57534e" onClick={onKeep} className="w-full">
            Keep It
          </GameButton>
          <GameButton variant="quest" color={isTala ? '#db2777' : '#eab308'} onClick={onConvert} className="w-full">
            Convert to {goldValue} Gold
          </GameButton>
        </div>
      </div>
    </div>
  );
}
