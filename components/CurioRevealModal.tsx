'use client';
// Full-screen "you got a new curio" reveal — fired the first time a species
// is ever added to a player's collection (wild catch, guild companion grant,
// or event reward), never for a duplicate/already-owned species.
// A face-down card lands and flips over to show the new curio's card
// (components/curio/NewCardReveal.tsx), then it's introduced.
import { useEffect, useState } from 'react';
import { MonsterDef } from '@/lib/monsterConfig';
import { QualityTier } from '@/lib/curioQuality';
import { playCurioCaught, playPageFlip } from '@/lib/sounds';
import CelebrationOverlay from '@/components/CelebrationOverlay';
import GameButton from '@/components/GameButton';
import { CurioEventFrame, CurioIdentity, TEXT_SHADOW } from '@/components/curio/CurioEventKit';
import NewCardReveal from '@/components/curio/NewCardReveal';

interface CurioRevealModalProps {
  monster: MonsterDef;
  userId: string;
  level?: number;           // a wild catch's level and quality, for its card
  quality?: QualityTier;
  onClose: () => void;
}

export default function CurioRevealModal({ monster, userId, level, quality, onClose }: CurioRevealModalProps) {
  const [burst, setBurst] = useState(false);

  const [flipped, setFlipped] = useState(false);

  useEffect(() => { playCurioCaught(); }, []);

  const close = () => { playPageFlip(); onClose(); };

  return (
    <>
      <CelebrationOverlay userId={userId} trigger={burst} type="curio" />
      <CurioEventFrame title="New Curio!" zClass="z-[95]" onBackdropClick={close}>
        {/* Confetti as the card turns over, not before. */}
        <NewCardReveal def={monster} level={level} quality={quality} onFlip={() => { setBurst(true); setFlipped(true); }} />
        <div className={`space-y-3 mt-1 ${flipped ? 'ce-rise' : 'invisible'}`}>
          <CurioIdentity def={monster} lead="You found" quality={quality} />
          <p className="text-[#f5f0e8] text-xs leading-snug" style={TEXT_SHADOW}>
            It&apos;s in your collection now. Put it in your team to train it in battles.
          </p>
          <GameButton variant="quest" onClick={onClose} className="w-full" style={{ fontSize: 15 }}>
            Awesome!
          </GameButton>
        </div>
      </CurioEventFrame>
    </>
  );
}
