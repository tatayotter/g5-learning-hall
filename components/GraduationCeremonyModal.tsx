'use client';
// Full-screen "curio graduated" ceremony — fired from the Compendium's
// Graduate action (see CompendiumPanel.handleGraduate in MonsterGuild.tsx)
// once the graduate_monster RPC has already succeeded. Mirrors
// CurioRevealModal's shell (backdrop/panel/theming/CelebrationOverlay) but
// adds a scripted animation beat (scroll thrown -> caught -> flicker into
// the new form) before the stat comparison reveal.
import { useEffect, useState } from 'react';
import { MonsterDef, getScaledStats } from '@/lib/monsterConfig';
import { QualityTier } from '@/lib/curioQuality';
import { playCurioGraduation } from '@/lib/sounds';
import { MonsterImage } from '@/components/battle/shared';
import CelebrationOverlay from '@/components/CelebrationOverlay';
import GameButton from '@/components/GameButton';

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

const STAT_ROWS: { label: string; key: 'hp' | 'attack' | 'defense' | 'speed' }[] = [
  { label: 'HP', key: 'hp' },
  { label: 'Attack', key: 'attack' },
  { label: 'Defense', key: 'defense' },
  { label: 'Speed', key: 'speed' },
];

export default function GraduationCeremonyModal({ fromDef, toDef, monsterLevel, quality, userId, onGoToCompendium }: GraduationCeremonyModalProps) {
  const isTala = userId === 'tala';
  const [phase, setPhase] = useState<Phase>('throw');
  const [flickerShowNew, setFlickerShowNew] = useState(false);
  const [caught, setCaught] = useState(false);
  const [burst, setBurst] = useState(false);

  useEffect(() => {
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
  }, []);

  const handleBackdropClick = () => {
    if (phase === 'reveal') onGoToCompendium();
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
            isTala ? 'border-pink-500' : 'border-amber-600'
          }`}
          onClick={e => e.stopPropagation()}
        >
          <p className={`font-bold text-sm tracking-wide mb-4 ${isTala ? 'text-pink-700' : 'text-amber-700'}`}>
            🎓 GRADUATION CEREMONY 🎓
          </p>

          <div className="relative w-28 h-28 mx-auto mb-4">
            {phase === 'reveal' && (
              <div
                className={`absolute inset-0 rounded-full graduation-glow-flash ${isTala ? 'bg-pink-400' : 'bg-amber-400'}`}
              />
            )}
            <div className={`relative w-full h-full ${caught ? 'graduation-catch-pulse' : ''}`}>
              {/* MonsterImage's <span> always hardcodes `relative` itself — passing
                  `absolute` into its className fights that (Tailwind's cascade lets
                  `.relative` win), so each sprite is wrapped in its own positioning
                  div instead of relying on MonsterImage's own element for placement. */}
              <div
                className={`absolute inset-0 w-full h-full transition-opacity duration-75 ${phase === 'reveal' ? '' : 'battle-float'} ${flickerShowNew ? 'opacity-0' : 'opacity-100'}`}
              >
                <MonsterImage monster={fromDef} className="w-full h-full" emojiClassName="text-8xl" />
              </div>
              <div
                className={`absolute inset-0 w-full h-full transition-opacity duration-75 ${phase === 'reveal' ? '' : 'battle-float'} ${flickerShowNew ? 'opacity-100' : 'opacity-0'}`}
              >
                <MonsterImage monster={toDef} className="w-full h-full" emojiClassName="text-8xl" />
              </div>
            </div>
            {phase === 'throw' && (
              <img
                src="/items/graduation_scroll.svg"
                alt=""
                className="absolute inset-0 w-1/2 h-1/2 m-auto graduation-scroll-throw"
              />
            )}
          </div>

          {phase !== 'reveal' ? (
            <p className="text-[#2a1505] font-bold text-lg">{flickerShowNew ? toDef.name : fromDef.name}...</p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-[#2a1505] font-bold text-xl">Congratulations!</p>
                <p className="text-sm text-[#6b4820] mt-1">
                  <span className="font-bold text-[#2a1505]">{fromDef.name}</span> graduated into{' '}
                  <span className={`font-bold ${isTala ? 'text-pink-700' : 'text-amber-700'}`}>{toDef.name}</span>!
                </p>
              </div>

              <div className="space-y-1.5 text-left max-w-[200px] mx-auto">
                {(() => {
                  const fromScaled = getScaledStats(fromDef, monsterLevel, quality);
                  const toScaled = getScaledStats(toDef, monsterLevel, quality);
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
                color={isTala ? '#db2777' : '#d97706'}
                onClick={onGoToCompendium}
                className="w-full battle-panel-in"
                style={{ fontSize: 15, animationDelay: `${STAT_ROWS.length * 120}ms`, animationFillMode: 'backwards' }}
              >
                Go To Compendium
              </GameButton>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
