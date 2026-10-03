'use client';
// Full-screen "first curio claimed" ceremony — fired once from
// StarterSelection right after the chosen starter's insert succeeds.
// A bonding orb charges, flashes, and the starter lands under its element's
// light rays on the shared curio event stage
// (components/curio/CurioEventKit.tsx), with its Level 1 stats underneath.
import { useEffect, useState } from 'react';
import { MonsterDef, getScaledStats } from '@/lib/monsterConfig';
import { playCurioCaught, playPageFlip } from '@/lib/sounds';
import CelebrationOverlay from '@/components/CelebrationOverlay';
import GameButton from '@/components/GameButton';
import { CurioEventFrame, CurioSpotlight, CurioIdentity, ChargeOrb, RevealFlash, StatChanges, ELEMENT_RGB } from '@/components/curio/CurioEventKit';

interface StarterClaimModalProps {
  monster: MonsterDef;
  userId: string;
  onComplete: () => void;
}

type Phase = 'charge' | 'reveal';

export default function StarterClaimModal({ monster, userId, onComplete }: StarterClaimModalProps) {
  const [phase, setPhase] = useState<Phase>('charge');
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setPhase('reveal');
      playCurioCaught();
      setBurst(true);
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  const revealed = phase === 'reveal';
  const done = () => { playPageFlip(); onComplete(); };

  return (
    <>
      <CelebrationOverlay userId={userId} trigger={burst} type="curio" />
      <CurioEventFrame title="Your First Curio" titleColor="#f5c542" onBackdropClick={revealed ? done : undefined}>
        <CurioSpotlight key={phase} def={revealed ? monster : null} size="md" rays={revealed}>
          {!revealed && <ChargeOrb rgb={ELEMENT_RGB[monster.element]} />}
          {revealed && <RevealFlash />}
        </CurioSpotlight>

        {!revealed ? (
          <p className="text-white font-bold text-lg mt-2 ce-hint" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>Sealing the bond...</p>
        ) : (
          <div className="ce-rise space-y-3 mt-1">
            <CurioIdentity def={monster} name={`${monster.name} chose you!`} />
            <StatChanges to={getScaledStats(monster, 1)} />
            <GameButton variant="quest" onClick={onComplete} className="w-full" style={{ fontSize: 15 }}>
              Begin Your Adventure!
            </GameButton>
          </div>
        )}
      </CurioEventFrame>
    </>
  );
}
