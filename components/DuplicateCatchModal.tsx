'use client';
import GameButton, { questButtonFontFamily, questButtonLetterSpacing, questButtonDropShadow, questTextShadowStyle, questTextStyle } from '@/components/GameButton';
import { woodTextureStyle, Nail } from '@/components/battle/MonsterHpPanel';
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
        className="relative border-2 border-[#4a2f18] rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center battle-panel-in"
        style={{ boxShadow: `0 0 0 3px #d4a017, ${questButtonDropShadow}`, ...woodTextureStyle }}
      >
        {/* Same wood-plank + gold trim + corner-nail frame as the battle
            screen's MonsterHpPanel/PostBattleSummary, reusing its exported
            style pieces rather than re-deriving them. */}
        <Nail className="top-2 left-2" />
        <Nail className="top-2 right-2" />
        <Nail className="bottom-2 left-2" />
        <Nail className="bottom-2 right-2" />
        <p
          className="text-sm tracking-wide mb-4"
          style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing }}
        >
          <span style={{ position: 'relative', display: 'inline-block' }}>
            <span aria-hidden style={questTextShadowStyle}>DUPLICATE CATCH</span>
            <span style={{ ...questTextStyle, color: isTala ? '#f9a8d4' : '#f5c542' }}>DUPLICATE CATCH</span>
          </span>
        </p>
        <p className="text-white font-bold text-lg mb-1" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>You already have {monsterName}!</p>
        <p className="text-[#e8d0a0] text-xs mb-6">
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
