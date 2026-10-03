'use client';
// Fired from MonsterGuild.handleBattleEnd when a wild-encounter win catches a
// species the player already owns (active team or catch inbox). Used to
// silently auto-convert to gold (see DUPLICATE_CATCH_GOLD) — now a player
// choice, so a kept duplicate can also be Tutored later (see
// lib/curioQuality.ts). This is a decision, not a reward: the curio stands
// on the shared stage (components/curio/CurioEventKit.tsx) without the
// landing hop or light rays.
import { MonsterDef } from '@/lib/monsterConfig';
import { QUALITY_LABEL, QualityTier } from '@/lib/curioQuality';
import GameButton from '@/components/GameButton';
import { CurioEventFrame, CurioSpotlight, CurioIdentity, TEXT_SHADOW } from '@/components/curio/CurioEventKit';

interface DuplicateCatchModalProps {
  monster?: MonsterDef;
  quality?: QualityTier; // the quality the player beat; a kept spare keeps it
  monsterName: string;
  goldValue: number;
  userId: string;
  onKeep: () => void;
  onConvert: () => void;
}

export default function DuplicateCatchModal({ monster, quality = 'normal', monsterName, goldValue, onKeep, onConvert }: DuplicateCatchModalProps) {
  return (
    <CurioEventFrame title="Duplicate Catch" titleColor="#f5c542" zClass="z-[95]">
      {monster && <CurioSpotlight def={monster} size="md" land={false} />}
      <div className="space-y-3 mt-1">
        {monster
          ? <CurioIdentity def={monster} lead="You already have" name={`${monsterName}!`} quality={quality} lore={false} />
          : <p className="text-white font-bold text-lg" style={TEXT_SHADOW}>You already have {monsterName}!</p>}
        <p className="text-[#e8d0a0] text-xs leading-snug" style={TEXT_SHADOW}>
          Keep it as a spare in your Catch Inbox (at {QUALITY_LABEL[quality]} quality, ready to promote or Tutor later), or turn it into gold right now.
        </p>
        <div className="flex gap-2">
          <GameButton variant="quest" color="#57534e" onClick={onKeep} className="flex-1" style={{ fontSize: 15 }}>
            Keep It
          </GameButton>
          <GameButton
            variant="quest"
            color="#eab308"
            onClick={onConvert}
            className="flex-1"
            style={{ fontSize: 15 }}
          >
            <span className="inline-flex items-center gap-1.5">
              <img src="/icons/rewards/gold_coin.svg" alt="" className="w-4 h-4" /> {goldValue} Gold
            </span>
          </GameButton>
        </div>
      </div>
    </CurioEventFrame>
  );
}
