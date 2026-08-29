'use client';
// Full-screen "Growth Pill consumed" ceremony — fired from TeamPanel's
// Growth Pill action once the use_growth_pill RPC has already succeeded.
// Deliberately mirrors GraduationCeremonyModal.tsx's shell and phase
// structure beat-for-beat (backdrop/panel/theming/CelebrationOverlay, a
// scripted animation before the stat reveal) per "just like graduation" —
// the one real difference is there's no sprite/form change here, so the
// flicker phase pulses a glow on the same sprite instead of alternating
// between two different monster images.
import { useEffect, useState } from 'react';
import { MonsterDef, getScaledStats } from '@/lib/monsterConfig';
import { QualityTier } from '@/lib/curioQuality';
import { playCurioLevelUp } from '@/lib/sounds';
import { MonsterImage } from '@/components/battle/shared';
import CelebrationOverlay from '@/components/CelebrationOverlay';
import GameButton from '@/components/GameButton';

interface GrowthPillCeremonyModalProps {
  def: MonsterDef;
  fromLevel: number;
  toLevel: number; // fromLevel + 5, clamped to MONSTER_LEVEL_CAP by the RPC
  quality: QualityTier;
  userId: string;
  onDismiss: () => void;
}

type Phase = 'throw' | 'flicker' | 'reveal';

// Toggle points (ms after entering the flicker phase) alternating the glow
// on/off — same cadence as GraduationCeremonyModal's FLICKER_TOGGLES so the
// two ceremonies feel like the same ritual.
const FLICKER_TOGGLES = [0, 130, 250, 360, 460, 550, 630, 700];

const STAT_ROWS: { label: string; key: 'hp' | 'attack' | 'defense' | 'speed' }[] = [
  { label: 'HP', key: 'hp' },
  { label: 'Attack', key: 'attack' },
  { label: 'Defense', key: 'defense' },
  { label: 'Speed', key: 'speed' },
];

export default function GrowthPillCeremonyModal({ def, fromLevel, toLevel, quality, userId, onDismiss }: GrowthPillCeremonyModalProps) {
  const isTala = userId === 'tala';
  const [phase, setPhase] = useState<Phase>('throw');
  const [glowOn, setGlowOn] = useState(false);
  const [caught, setCaught] = useState(false);
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(setTimeout(() => setCaught(true), 700));
    timers.push(setTimeout(() => setPhase('flicker'), 900));

    FLICKER_TOGGLES.forEach((t, i) => {
      timers.push(setTimeout(() => setGlowOn(i % 2 === 1), 900 + t));
    });

    timers.push(setTimeout(() => {
      setGlowOn(false);
      setPhase('reveal');
      playCurioLevelUp();
      setBurst(true);
    }, 900 + FLICKER_TOGGLES[FLICKER_TOGGLES.length - 1] + 150));

    return () => timers.forEach(clearTimeout);
  }, []);

  const handleBackdropClick = () => {
    if (phase === 'reveal') onDismiss();
  };

  return (
    <>
      <CelebrationOverlay userId={userId} trigger={burst} type="curio" />
      <div
        className="fixed inset-0 bg-black/85 z-[60] flex items-center justify-center p-4"
        onClick={handleBackdropClick}
      >
        <div
          className={`relative bg-[#f0ddb8] border-2 rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center battle-panel-in ${
            isTala ? 'border-pink-500' : 'border-purple-600'
          }`}
          onClick={e => e.stopPropagation()}
        >
          <p className={`font-bold text-sm tracking-wide mb-4 ${isTala ? 'text-pink-700' : 'text-purple-700'}`}>
            💊 GROWTH SURGE 💊
          </p>

          <div className="relative w-28 h-28 mx-auto mb-4">
            {(phase === 'reveal' || glowOn) && (
              <div
                className={`absolute inset-0 rounded-full graduation-glow-flash ${isTala ? 'bg-pink-400' : 'bg-purple-400'}`}
              />
            )}
            <div className={`relative w-full h-full ${caught ? 'graduation-catch-pulse' : ''}`}>
              <div className={`absolute inset-0 w-full h-full ${phase === 'reveal' ? '' : 'battle-float'}`}>
                <MonsterImage monster={def} className="w-full h-full" emojiClassName="text-8xl" />
              </div>
            </div>
            {phase === 'throw' && (
              <span
                aria-hidden="true"
                className="absolute inset-0 w-1/2 h-1/2 m-auto graduation-scroll-throw text-4xl flex items-center justify-center"
              >
                💊
              </span>
            )}
          </div>

          {phase !== 'reveal' ? (
            <p className="text-[#2a1505] font-bold text-lg">{def.name}...</p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-[#2a1505] font-bold text-xl">Congratulations!</p>
                <p className="text-sm text-[#6b4820] mt-1">
                  <span className="font-bold text-[#2a1505]">{def.name}</span> surged from Lv.{fromLevel} to{' '}
                  <span className={`font-bold ${isTala ? 'text-pink-700' : 'text-purple-700'}`}>Lv.{toLevel}</span>!
                </p>
              </div>

              <div className="space-y-1.5 text-left max-w-[200px] mx-auto">
                {(() => {
                  const fromScaled = getScaledStats(def, fromLevel, quality);
                  const toScaled = getScaledStats(def, toLevel, quality);
                  return STAT_ROWS.map((row, i) => {
                    const from = fromScaled[row.key];
                    const to = toScaled[row.key];
                    return (
                      <div
                        key={row.key}
                        className="flex items-center justify-between text-xs battle-panel-in"
                        style={{ animationDelay: `${i * 120}ms`, animationFillMode: 'backwards' }}
                      >
                        <span className="text-[#6b4820]">{row.label}</span>
                        <span className="text-[#3a2610]">
                          {from} <span className="text-[#a89c86]">→</span>{' '}
                          <span className="text-green-700 font-bold">{to}</span>{' '}
                          <span className="text-green-700 text-[10px]">(+{to - from})</span>
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>

              <GameButton
                variant="quest"
                color={isTala ? '#db2777' : '#9333ea'}
                onClick={onDismiss}
                className="w-full battle-panel-in"
                style={{ fontSize: 15, animationDelay: `${STAT_ROWS.length * 120}ms`, animationFillMode: 'backwards' }}
              >
                Continue
              </GameButton>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
