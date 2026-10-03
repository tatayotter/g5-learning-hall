'use client';
// Egg hatch reveal ceremony — fired wherever a sync_egg_progress call surfaces
// a freshly-hatched egg (the hatch itself is already resolved server-side).
// The kid hatches it: three taps, each adding a crack and a wobble, then the
// shell bursts and the hatchling lands big, with light rays that settle down
// and the same quality treatment as Tutor rolls, so a lucky hatch still reads
// as exciting. The reveal then introduces it (element, quality, a line of
// lore) and says what to do next. A Keeper's Egg (lib/intro/keeperEgg.ts)
// also gets the Lorekeeper closing the three-day promise.
// The frame/stage/pills live in components/curio/CurioEventKit.tsx, shared
// with the other curio event modals.
import { useEffect, useState } from 'react';
import { ALL_MONSTERS, EGG_SPRITE_SRC, Element } from '@/lib/monsterConfig';
import { QualityTier } from '@/lib/curioQuality';
import { playEggCrack, playCurioCaught, playCurioLevelUp } from '@/lib/sounds';
import CelebrationOverlay from '@/components/CelebrationOverlay';
import GameButton from '@/components/GameButton';
import VoiceCaptions from '@/components/intro/VoiceCaptions';
import { HATCH_LINE } from '@/lib/intro/keeperEgg';
import { CurioEventFrame, CurioSpotlight, CurioIdentity, RevealFlash, ELEMENT_RGB, TEXT_SHADOW } from '@/components/curio/CurioEventKit';

interface EggHatchModalProps {
  speciesId: string;
  element: Element;
  quality: QualityTier;
  userId: string;
  // 'keeper' = the Keeper's Egg gift; anything else is a graduation egg.
  kind?: 'graduation' | 'keeper';
  onClose: () => void;
  // Opens the Curio tab's team view (the hatchling starts on the bench).
  onViewTeam?: () => void;
}

const TAPS_TO_HATCH = 3;

type Phase = 'tapping' | 'burst' | 'reveal';

// Egg-only motion (the shared stage motion is in CURIO_EVENT_CSS).
const EGG_CSS = `
@keyframes eh-wobble { 0%,100% { transform: rotate(0); } 25% { transform: rotate(-10deg); } 75% { transform: rotate(10deg); } }
.eh-wobble { animation: eh-wobble .4s ease-in-out; transform-origin: 50% 90%; }
@keyframes eh-idle { 0%,100% { transform: rotate(-2deg); } 50% { transform: rotate(2deg); } }
.eh-idle { animation: eh-idle 2.2s ease-in-out infinite; transform-origin: 50% 90%; }
@keyframes eh-shell-l { to { transform: translate(-70px, 40px) rotate(-55deg); opacity: 0; } }
@keyframes eh-shell-r { to { transform: translate(70px, 40px) rotate(55deg); opacity: 0; } }
.eh-shell-l { animation: eh-shell-l .6s ease-in forwards; }
.eh-shell-r { animation: eh-shell-r .6s ease-in forwards; }
@media (prefers-reduced-motion: reduce) {
  .eh-wobble, .eh-idle { animation: none; }
}
`;

// Cracks drawn over the egg sprite, one more set per tap (viewBox 0-100).
const CRACKS = [
  'M50 34 L46 42 L53 47 L48 55',
  'M48 55 L41 60 L45 66 M53 47 L61 50 L58 58 L64 63',
  'M46 42 L38 44 L35 51 M58 58 L52 64 L55 71 M41 60 L36 67',
];

export default function EggHatchModal({ speciesId, element, quality, userId, kind, onClose, onViewTeam }: EggHatchModalProps) {
  const [phase, setPhase] = useState<Phase>('tapping');
  const [taps, setTaps] = useState(0);
  const [wobbleKey, setWobbleKey] = useState(0);
  const [burst, setBurst] = useState(false);
  const def = ALL_MONSTERS[speciesId];
  const eggSrc = EGG_SPRITE_SRC[element];
  const isRareQuality = quality === 'outstanding' || quality === 'perfect';
  const isKeeper = kind === 'keeper';

  const tap = () => {
    if (phase !== 'tapping') return;
    const next = taps + 1;
    setTaps(next);
    setWobbleKey(k => k + 1);
    playEggCrack();
    if (next >= TAPS_TO_HATCH) setPhase('burst');
  };

  useEffect(() => {
    if (phase !== 'burst') return;
    const t = setTimeout(() => {
      setPhase('reveal');
      playCurioCaught();
      if (isRareQuality) {
        playCurioLevelUp();
        setBurst(true);
      }
    }, 450);
    return () => clearTimeout(t);
  }, [phase, isRareQuality]);

  if (!def) return null;

  const revealed = phase === 'reveal';

  return (
    <>
      <style>{EGG_CSS}</style>
      {isRareQuality && <CelebrationOverlay userId={userId} trigger={burst} type="levelup" />}
      <CurioEventFrame title={isKeeper ? "Keeper's Egg" : 'The Hatchery'}>
        {/* Stage: the egg while tapping, the hatchling after. */}
        <CurioSpotlight def={revealed ? def : null} rays={revealed} raysRgb={ELEMENT_RGB[def.element] ?? ELEMENT_RGB[element]}>
          {!revealed && (
            <button
              type="button"
              onClick={tap}
              disabled={phase !== 'tapping'}
              aria-label="Tap the egg to hatch it"
              className="relative h-44 sm:h-52 aspect-square cursor-pointer disabled:cursor-default"
            >
              {phase === 'tapping' ? (
                <span key={wobbleKey} className={`absolute inset-0 ${wobbleKey > 0 ? 'eh-wobble' : 'eh-idle'}`}>
                  <img src={eggSrc} alt="" className="absolute inset-0 w-full h-full object-contain drop-shadow-[0_6px_14px_rgba(0,0,0,0.8)]" style={{ imageRendering: 'pixelated' }} />
                  <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" aria-hidden>
                    {CRACKS.slice(0, taps).map((d, i) => (
                      <g key={i}>
                        <path d={d} fill="none" stroke="#fff6d8" strokeWidth={3.4} strokeLinejoin="miter" opacity={0.85} />
                        <path d={d} fill="none" stroke="#2a1505" strokeWidth={1.8} strokeLinejoin="miter" />
                      </g>
                    ))}
                  </svg>
                </span>
              ) : (
                <>
                  <img src={eggSrc} alt="" className="eh-shell-l absolute inset-0 w-full h-full object-contain" style={{ clipPath: 'polygon(0 0, 50% 0, 44% 50%, 52% 100%, 0 100%)', imageRendering: 'pixelated' }} />
                  <img src={eggSrc} alt="" className="eh-shell-r absolute inset-0 w-full h-full object-contain" style={{ clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 52% 100%, 44% 50%)', imageRendering: 'pixelated' }} />
                  <RevealFlash />
                </>
              )}
            </button>
          )}
        </CurioSpotlight>

        {!revealed ? (
          <p className={`text-white font-bold text-lg mt-2 ${phase === 'tapping' ? 'ce-hint' : ''}`} style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
            {phase === 'tapping'
              ? `Tap the egg to hatch it! (${taps}/${TAPS_TO_HATCH})`
              : 'Here it comes...'}
          </p>
        ) : (
          <div className="ce-rise space-y-3 mt-1">
            <CurioIdentity def={def} lead="Your egg hatched into" quality={quality} />

            {isKeeper && (
              <div className="text-left">
                <VoiceCaptions lines={[HATCH_LINE]} startDelayMs={700} onDone={() => {}} />
              </div>
            )}

            <p className="text-[#f5f0e8] text-xs leading-snug" style={TEXT_SHADOW}>
              It starts at Level 1, resting on your bench. Put it in your team to train it in battles.
            </p>
            <div className="flex gap-2">
              <GameButton
                variant="quest"
                color="#dc2626"
                onClick={onClose}
                className="flex-1"
                style={{ fontSize: 15 }}
              >
                Close
              </GameButton>
              {onViewTeam && (
                <GameButton
                  variant="quest"
                  onClick={() => { onClose(); onViewTeam(); }}
                  className="flex-1"
                  style={{ fontSize: 15 }}
                >
                  See my team
                </GameButton>
              )}
            </div>
          </div>
        )}
      </CurioEventFrame>
    </>
  );
}
