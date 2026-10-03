'use client';
// Full-screen "you got a new curio" reveal — fired the first time a species
// is ever added to a player's collection (wild catch, guild companion grant,
// or event reward), never for a duplicate/already-owned species.
// Same stage as the egg hatch (components/curio/CurioEventKit.tsx): a flash,
// then the curio lands under its element's light rays.
import { useEffect, useState } from 'react';
import { MonsterDef } from '@/lib/monsterConfig';
import { playCurioCaught, playPageFlip } from '@/lib/sounds';
import CelebrationOverlay from '@/components/CelebrationOverlay';
import GameButton from '@/components/GameButton';
import { CurioEventFrame, CurioSpotlight, CurioIdentity, RevealFlash, TEXT_SHADOW } from '@/components/curio/CurioEventKit';

interface CurioRevealModalProps {
  monster: MonsterDef;
  userId: string;
  onClose: () => void;
}

export default function CurioRevealModal({ monster, userId, onClose }: CurioRevealModalProps) {
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    playCurioCaught();
    // Confetti as the curio lands, not before it appears.
    const t = setTimeout(() => setBurst(true), 300);
    return () => clearTimeout(t);
  }, []);

  const close = () => { playPageFlip(); onClose(); };

  return (
    <>
      <CelebrationOverlay userId={userId} trigger={burst} type="curio" />
      <CurioEventFrame title="New Curio!" zClass="z-[95]" onBackdropClick={close}>
        <CurioSpotlight def={monster} rays>
          <RevealFlash />
        </CurioSpotlight>
        <div className="ce-rise space-y-3 mt-1" style={{ animationDelay: '250ms' }}>
          <CurioIdentity def={monster} lead="You found" />
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
