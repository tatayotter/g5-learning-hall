'use client';
// Full-screen "Growth Pill consumed" ceremony — fired from TeamPanel's
// Growth Pill action once the use_growth_pill RPC has already succeeded.
// Same ritual as GraduationCeremonyModal: the pill is thrown and caught, the
// curio surges with light (no form change, so it glows instead of
// flickering between two sprites), then it lands under its element's rays
// on the shared curio event stage (components/curio/CurioEventKit.tsx) with
// the level jump and stat comparison underneath.
import { useEffect, useState } from 'react';
import { MonsterDef, getScaledStats } from '@/lib/monsterConfig';
import { QualityTier } from '@/lib/curioQuality';
import { playGrowthPillGulp, playCurioLevelUp, playPageFlip } from '@/lib/sounds';
import CelebrationOverlay from '@/components/CelebrationOverlay';
import GameButton from '@/components/GameButton';
import { CurioEventFrame, CurioSpotlight, CurioIdentity, ChargeOrb, RevealFlash, StatChanges } from '@/components/curio/CurioEventKit';

interface GrowthPillCeremonyModalProps {
  def: MonsterDef;
  fromLevel: number;
  toLevel: number; // fromLevel + 5, clamped to MONSTER_LEVEL_CAP by the RPC
  quality: QualityTier;
  userId: string;
  onDismiss: () => void;
}

type Phase = 'throw' | 'surge' | 'reveal';

const PILL_RGB = '192,132,252';

export default function GrowthPillCeremonyModal({ def, fromLevel, toLevel, quality, userId, onDismiss }: GrowthPillCeremonyModalProps) {
  const [phase, setPhase] = useState<Phase>('throw');
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    playGrowthPillGulp();
    timers.push(setTimeout(() => setPhase('surge'), 700));
    timers.push(setTimeout(() => {
      setPhase('reveal');
      playCurioLevelUp();
      setBurst(true);
    }, 1750));
    return () => timers.forEach(clearTimeout);
  }, []);

  const revealed = phase === 'reveal';
  const close = () => { playPageFlip(); onDismiss(); };

  return (
    <>
      <CelebrationOverlay userId={userId} trigger={burst} type="curio" />
      <CurioEventFrame title="Growth Surge" titleColor="#d8b4fe" onBackdropClick={revealed ? close : undefined}>
        <CurioSpotlight
          key={revealed ? 'reveal' : 'pre'}
          def={def}
          size="md"
          rays={revealed}
          land={revealed}
          curioClassName={phase === 'surge' ? 'ce-surge' : ''}
          curioStyle={{ ['--ce-surge' as string]: `rgb(${PILL_RGB})` }}
        >
          {phase === 'throw' && (
            <span className="graduation-scroll-throw block">
              <ChargeOrb rgb={PILL_RGB} className="w-14 h-14" />
            </span>
          )}
          {revealed && <RevealFlash />}
        </CurioSpotlight>

        {!revealed ? (
          <p className="text-white font-bold text-lg mt-2" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
            {def.name}...
          </p>
        ) : (
          <div className="ce-rise space-y-3 mt-1">
            <CurioIdentity
              def={def}
              lead="A Growth Pill powered up"
              quality={quality}
              lore={false}
              extraPill={
                <span className="inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full border bg-purple-600/30 border-purple-400 text-purple-100">
                  Lv.{fromLevel} &rarr; Lv.{toLevel}
                </span>
              }
            />
            <StatChanges from={getScaledStats(def, fromLevel, quality)} to={getScaledStats(def, toLevel, quality)} />
            <GameButton variant="quest" color="#9333ea" onClick={onDismiss} className="w-full" style={{ fontSize: 15 }}>
              Continue
            </GameButton>
          </div>
        )}
      </CurioEventFrame>
    </>
  );
}
