'use client';
// Full-screen "curio graduated" ceremony — fired from the Compendium's
// Graduate action (see CompendiumPanel.handleGraduate in MonsterGuild.tsx)
// once the graduate_monster RPC has already succeeded. Scripted beat: a
// scroll is thrown and caught, the curio flickers between its old and new
// form, then the new form lands under its element's light rays (the shared
// curio event stage, components/curio/CurioEventKit.tsx) with the stat
// comparison underneath.
import { useEffect, useState } from 'react';
import { MonsterDef, getScaledStats } from '@/lib/monsterConfig';
import { QualityTier } from '@/lib/curioQuality';
import { playCurioGraduation, playPageFlip } from '@/lib/sounds';
import CelebrationOverlay from '@/components/CelebrationOverlay';
import GameButton from '@/components/GameButton';
import { CurioEventFrame, CurioSpotlight, CurioIdentity, RevealFlash, StatChanges } from '@/components/curio/CurioEventKit';

interface GraduationCeremonyModalProps {
  fromDef: MonsterDef; // pre-graduation display def (old stats + old sprite)
  toDef: MonsterDef;   // post-graduation display def (grown stats + new sprite)
  monsterLevel: number; // the actual monster's current level — stats shown are its real in-battle numbers, not level-1 base stats
  quality: QualityTier; // unchanged by graduation, but factors into the before/after stat comparison shown here
  userId: string;
  onGoToCompendium: () => void;
}

type Phase = 'throw' | 'flicker' | 'reveal';

// Toggle points (ms after entering the flicker phase) alternating which
// sprite is shown — shrinking gaps early, then settling on the new form.
const FLICKER_TOGGLES = [0, 130, 250, 360, 460, 550, 630, 700];

export default function GraduationCeremonyModal({ fromDef, toDef, monsterLevel, quality, userId, onGoToCompendium }: GraduationCeremonyModalProps) {
  const [phase, setPhase] = useState<Phase>('throw');
  const [flickerShowNew, setFlickerShowNew] = useState(false);
  const [caught, setCaught] = useState(false);
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    // Warm the new form's art so the first flicker frame isn't blank.
    const img = new Image();
    img.src = `/monsters/${toDef.spriteId ?? toDef.id}.webp`;

    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(setTimeout(() => setCaught(true), 700));
    timers.push(setTimeout(() => setPhase('flicker'), 900));

    FLICKER_TOGGLES.forEach((t, i) => {
      timers.push(setTimeout(() => setFlickerShowNew(i % 2 === 1), 900 + t));
    });

    timers.push(setTimeout(() => {
      setFlickerShowNew(true);
      setPhase('reveal');
      playCurioGraduation();
      setBurst(true);
    }, 900 + FLICKER_TOGGLES[FLICKER_TOGGLES.length - 1] + 150));

    return () => timers.forEach(clearTimeout);
  }, [toDef]);

  const revealed = phase === 'reveal';
  const close = () => { playPageFlip(); onGoToCompendium(); };

  return (
    <>
      <CelebrationOverlay userId={userId} trigger={burst} type="curio" />
      <CurioEventFrame title="Graduation" titleColor="#f5c542" onBackdropClick={revealed ? close : undefined}>
        <CurioSpotlight
          // Remount on reveal so the new form plays the landing hop.
          key={revealed ? 'reveal' : 'pre'}
          def={flickerShowNew ? toDef : fromDef}
          size="md"
          rays={revealed}
          land={revealed}
          curioClassName={caught && !revealed ? 'graduation-catch-pulse' : ''}
        >
          {phase === 'throw' && (
            <img src="/items/graduation_scroll.svg" alt="" className="w-16 h-16 graduation-scroll-throw" />
          )}
          {revealed && <RevealFlash />}
        </CurioSpotlight>

        {!revealed ? (
          <p className="text-white font-bold text-lg mt-2" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
            {flickerShowNew ? toDef.name : fromDef.name}...
          </p>
        ) : (
          <div className="ce-rise space-y-3 mt-1">
            <CurioIdentity def={toDef} lead={<><span className="font-bold text-white">{fromDef.name}</span> graduated into</>} quality={quality} />
            <StatChanges from={getScaledStats(fromDef, monsterLevel, quality)} to={getScaledStats(toDef, monsterLevel, quality)} />
            <GameButton variant="quest" onClick={onGoToCompendium} className="w-full" style={{ fontSize: 15 }}>
              Go To Compendium
            </GameButton>
          </div>
        )}
      </CurioEventFrame>
    </>
  );
}
