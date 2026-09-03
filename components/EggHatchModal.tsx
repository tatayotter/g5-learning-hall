'use client';
// Egg hatch reveal ceremony — fired from the Hatchery (or wherever a
// sync_egg_progress call surfaces a freshly-hatched egg) once the RPC has
// already resolved the hatch server-side. Mirrors TutorRollModal's
// charge/reveal beat, but the "charge" is a wobbling egg that splits into
// two shells (CSS-driven, see app/globals.css egg-* keyframes — no
// pre-split shell art exists yet, see docs/curio-egg-mechanism-design.md),
// then the hatchling's quality roll lands with the same tier-glow treatment
// Tutor rolls use, so a lucky hatch reads as exciting the same way.
import { useEffect, useState } from 'react';
import { ALL_MONSTERS, EGG_SPRITE_SRC, Element } from '@/lib/monsterConfig';
import { QUALITY_LABEL, QualityTier, getQualityGlowClass } from '@/lib/curioQuality';
import { MonsterImage } from '@/components/battle/shared';
import { playEggCrack, playCurioCaught, playCurioLevelUp } from '@/lib/sounds';
import CelebrationOverlay from '@/components/CelebrationOverlay';
import GameButton, { questButtonFontFamily, questButtonLetterSpacing, questButtonDropShadow, questTextShadowStyle, questTextStyle } from '@/components/GameButton';
import { woodTextureStyle, Nail } from '@/components/battle/MonsterHpPanel';

interface EggHatchModalProps {
  speciesId: string;
  element: Element;
  quality: QualityTier;
  userId: string;
  onClose: () => void;
}

type Phase = 'wobble' | 'crack' | 'reveal';

export default function EggHatchModal({ speciesId, element, quality, userId, onClose }: EggHatchModalProps) {
  const [phase, setPhase] = useState<Phase>('wobble');
  const [burst, setBurst] = useState(false);
  const def = ALL_MONSTERS[speciesId];
  const eggSrc = EGG_SPRITE_SRC[element];
  const isRareQuality = quality === 'outstanding' || quality === 'perfect';

  useEffect(() => {
    const t1 = setTimeout(() => { setPhase('crack'); playEggCrack(); }, 900);
    const t2 = setTimeout(() => {
      setPhase('reveal');
      playCurioCaught();
      if (isRareQuality) {
        playCurioLevelUp();
        setBurst(true);
      }
    }, 1450);
    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBackdropClick = () => {
    if (phase === 'reveal') onClose();
  };

  if (!def) return null;

  return (
    <>
      {isRareQuality && <CelebrationOverlay userId={userId} trigger={burst} type="levelup" />}
      <div
        className="fixed inset-0 bg-black/85 z-[60] flex items-center justify-center p-4"
        onClick={handleBackdropClick}
      >
        <div
          className="relative border-2 border-[#4a2f18] rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center battle-panel-in"
          style={{ boxShadow: `0 0 0 3px #d4a017, ${questButtonDropShadow}`, ...woodTextureStyle }}
          onClick={e => e.stopPropagation()}
        >
          {/* Same wood-plank + gold trim + corner-nail frame as the battle
              screen's MonsterHpPanel/PostBattleSummary, reusing its exported
              style pieces rather than re-deriving them. */}
          <Nail className="top-2 left-2" />
          <Nail className="top-2 right-2" />
          <Nail className="bottom-2 left-2" />
          <Nail className="bottom-2 right-2" />
          <p
            className="text-sm tracking-wide mb-4"
            style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing }}
          >
            <span style={{ position: 'relative', display: 'inline-block' }}>
              <span aria-hidden style={questTextShadowStyle}>The Hatchery</span>
              <span style={{ ...questTextStyle, color: '#67e8f9' }}>The Hatchery</span>
            </span>
          </p>

          <div className="relative w-28 h-28 mx-auto mb-2 flex items-center justify-center">
            {phase !== 'reveal' && (
              <>
                <img
                  src={eggSrc}
                  alt=""
                  className={`absolute inset-0 w-full h-full object-contain ${phase === 'wobble' ? 'egg-wobble' : 'egg-crack-top'}`}
                  style={phase === 'crack' ? { clipPath: 'inset(0 0 50% 0)' } : undefined}
                />
                {phase === 'crack' && (
                  <img
                    src={eggSrc}
                    alt=""
                    className="absolute inset-0 w-full h-full object-contain egg-crack-bottom"
                    style={{ clipPath: 'inset(50% 0 0 0)' }}
                  />
                )}
              </>
            )}
            {phase === 'reveal' && (
              <div className={`relative w-20 h-20 egg-hatchling-in ${getQualityGlowClass(quality)}`}>
                <MonsterImage monster={def} className="w-full h-full" emojiClassName="text-6xl" />
              </div>
            )}
          </div>

          {phase !== 'reveal' ? (
            <p className="text-white font-bold text-lg" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
              Your egg is hatching...
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-[#f5f0e8] text-xs mb-1" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>Your egg hatched into</p>
                <p className="text-white font-bold text-xl" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>{def.name}!</p>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-600/30 border border-cyan-400 text-cyan-200 mt-2">
                  {QUALITY_LABEL[quality]}
                </span>
                <p className="text-[#e8d0a0] text-xs mt-2">Added to your team, benched, at Level 1.</p>
              </div>
              <GameButton variant="quest" color="#0891b2" onClick={onClose} className="w-full" style={{ fontSize: 15 }}>
                Welcome it home!
              </GameButton>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
