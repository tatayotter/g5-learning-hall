'use client';
// Full-screen "Tutor roll" ceremony — fired from CompendiumPanel once the
// tutor_curio RPC has already resolved. A charging orb, then the reveal
// branches on success/fail: a success lands the curio under rays in the NEW
// tier's glow color with a CelebrationOverlay; a fail stays muted (no rays,
// no burst), since it's the common outcome (68.8%+ base chance) and
// shouldn't feel punishing for a Grade 5 audience with no pity system.
// Stage/frame: components/curio/CurioEventKit.tsx.
import { useEffect, useState } from 'react';
import { QUALITY_LABEL, getQualityGlowClass } from '@/lib/curioQuality';
import { TutorOutcome } from '@/lib/tutorCurio';
import { MonsterDef, getScaledStats } from '@/lib/monsterConfig';
import { playRerollSpin, playCurioLevelUp, playMiss, playPageFlip } from '@/lib/sounds';
import CelebrationOverlay from '@/components/CelebrationOverlay';
import GameButton from '@/components/GameButton';
import { CurioEventFrame, CurioSpotlight, CurioIdentity, ChargeOrb, RevealFlash, StatChanges, QUALITY_RGB, TEXT_SHADOW } from '@/components/curio/CurioEventKit';

interface TutorRollModalProps {
  outcome: TutorOutcome;
  monsterName: string;
  def: MonsterDef;
  monsterLevel: number;
  userId: string;
  onClose: () => void;
}

type Phase = 'charge' | 'reveal';

const RING_COLOR = { good: '#16a34a', outstanding: '#06b6d4', perfect: '#f97316' } as const;

export default function TutorRollModal({ outcome, monsterName, def, monsterLevel, userId, onClose }: TutorRollModalProps) {
  const [phase, setPhase] = useState<Phase>('charge');
  const [burst, setBurst] = useState(false);

  const success = outcome.success && outcome.new_quality;
  // The quality shown on the curio here — its NEW quality on a success, its
  // unchanged current quality on a fail (never blank), so the reveal always
  // shows the real, present state of the actual curio.
  const displayedQuality = success ? outcome.new_quality! : outcome.previous_quality!;
  const beforeStats = getScaledStats(def, monsterLevel, outcome.previous_quality);
  const afterStats = success ? getScaledStats(def, monsterLevel, outcome.new_quality) : null;

  useEffect(() => {
    playRerollSpin();
    const t = setTimeout(() => {
      setPhase('reveal');
      if (success) {
        playCurioLevelUp();
        setBurst(true);
      } else {
        playMiss();
      }
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const revealed = phase === 'reveal';
  const close = () => { playPageFlip(); onClose(); };
  // Ring color signals the outcome: the new tier's color, or muted stone.
  const ringColor = revealed && success ? RING_COLOR[outcome.new_quality as keyof typeof RING_COLOR] ?? '#d4a017' : revealed ? '#a8a29e' : '#d4a017';

  return (
    <>
      {success && <CelebrationOverlay userId={userId} trigger={burst} type="levelup" />}
      <CurioEventFrame title="Curio Tutoring" ringColor={ringColor} onBackdropClick={revealed ? close : undefined}>
        <CurioSpotlight
          key={revealed ? 'reveal' : 'charge'}
          def={revealed ? def : null}
          size="md"
          rays={revealed && !!success}
          raysRgb={QUALITY_RGB[displayedQuality]}
          land={revealed && !!success}
          curioClassName={getQualityGlowClass(displayedQuality)}
        >
          {!revealed && <ChargeOrb rgb="129,140,248" />}
          {revealed && success && <RevealFlash />}
        </CurioSpotlight>

        {!revealed ? (
          <p className="text-white font-bold text-lg mt-2 ce-hint" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
            Consulting the tutor...
          </p>
        ) : success ? (
          <div className="ce-rise space-y-3 mt-1">
            <CurioIdentity def={def} name={`${monsterName} is now ${QUALITY_LABEL[outcome.new_quality!]}!`} lead="Tutoring worked" quality={outcome.new_quality!} lore={false} />
            {afterStats && <StatChanges from={beforeStats} to={afterStats} keys={['hp', 'attack']} />}
            <p className="text-[#e8d0a0] text-xs" style={TEXT_SHADOW}>HP and Attack went up for good.</p>
            <GameButton variant="quest" onClick={onClose} className="w-full" style={{ fontSize: 15 }}>
              Awesome!
            </GameButton>
          </div>
        ) : (
          <div className="ce-rise space-y-3 mt-1">
            <CurioIdentity def={def} name="No change this time" quality={displayedQuality} lore={false} />
            <p className="text-[#e8d0a0] text-xs" style={TEXT_SHADOW}>
              {monsterName} stays {QUALITY_LABEL[outcome.previous_quality!]}. Try again anytime.
            </p>
            <GameButton variant="quest" color="#78716c" onClick={onClose} className="w-full" style={{ fontSize: 15 }}>
              Okay
            </GameButton>
          </div>
        )}
      </CurioEventFrame>
    </>
  );
}
