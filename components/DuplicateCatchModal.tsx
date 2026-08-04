'use client';
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
        className={`relative bg-neutral-900 border-2 rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center battle-panel-in ${
          isTala ? 'border-pink-500' : 'border-amber-500'
        }`}
      >
        <p className={`font-bold text-sm tracking-wide mb-4 ${isTala ? 'text-pink-400' : 'text-amber-400'}`}>
          ✨ DUPLICATE CATCH ✨
        </p>
        <p className="text-white font-bold text-lg mb-1">You already have {monsterName}!</p>
        <p className="text-gray-400 text-xs mb-6">
          Keep it as a spare in your Catch Inbox (a fresh Normal-quality copy you can promote or Tutor later), or convert it to gold right now.
        </p>
        <div className="space-y-2">
          <button
            onClick={onKeep}
            className="w-full py-3 rounded-xl font-bold text-white btn-tactile bg-neutral-700 hover:bg-neutral-600"
          >
            Keep It
          </button>
          <button
            onClick={onConvert}
            className={`w-full py-3 rounded-xl font-bold text-white btn-tactile ${isTala ? 'bg-pink-600 hover:bg-pink-500' : 'bg-amber-600 hover:bg-amber-500'}`}
          >
            Convert to {goldValue} Gold
          </button>
        </div>
      </div>
    </div>
  );
}
