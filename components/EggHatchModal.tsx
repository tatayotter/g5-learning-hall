'use client';
// Egg hatch reveal ceremony — fired wherever a sync_egg_progress call surfaces
// a freshly-hatched egg (the hatch itself is already resolved server-side).
// The kid hatches it: three taps, each adding a crack and a wobble, then the
// shell bursts and the hatchling lands big, with light rays that settle down
// and the same quality treatment as Tutor rolls, so a lucky hatch still reads
// as exciting. The reveal then introduces it (element, quality, a line of
// lore) and says what to do next. A Keeper's Egg (lib/intro/keeperEgg.ts)
// also gets the Lorekeeper closing the three-day promise.
import { useEffect, useState } from 'react';
import { ALL_MONSTERS, EGG_SPRITE_SRC, ELEMENT_ICON_SRC, Element } from '@/lib/monsterConfig';
import { QUALITY_LABEL, QualityTier } from '@/lib/curioQuality';
import { MonsterImage } from '@/components/battle/shared';
import { playEggCrack, playCurioCaught, playCurioLevelUp, playPageFlip } from '@/lib/sounds';
import CelebrationOverlay from '@/components/CelebrationOverlay';
import GameButton, { questButtonFontFamily, questButtonLetterSpacing, questButtonDropShadow, questTextShadowStyle, questTextStyle } from '@/components/GameButton';
import { woodTextureStyle, Nail } from '@/components/battle/MonsterHpPanel';
import VoiceCaptions from '@/components/intro/VoiceCaptions';
import { HATCH_LINE } from '@/lib/intro/keeperEgg';
import { FLOAT_BOB_PX, FLOAT_LIFT_PX } from '@/lib/curioBody';

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

// Pill colors per quality, matching the quality glow colors in globals.css.
const QUALITY_PILL: Record<QualityTier, string> = {
  normal: 'bg-[#f5f0e8]/15 border-[#e8d0a0]/60 text-[#f5f0e8]',
  good: 'bg-green-600/30 border-green-400 text-green-200',
  outstanding: 'bg-cyan-600/30 border-cyan-400 text-cyan-200',
  perfect: 'bg-orange-600/30 border-orange-400 text-orange-200',
};

const RAY_COLOR: Record<Element, string> = {
  fire: '251,146,60', water: '56,189,248', leaf: '74,222,128',
  storm: '250,204,21', shadow: '192,132,252', light: '253,224,71',
};

const HATCH_CSS = `
@keyframes eh-wobble { 0%,100% { transform: rotate(0); } 25% { transform: rotate(-10deg); } 75% { transform: rotate(10deg); } }
.eh-wobble { animation: eh-wobble .4s ease-in-out; transform-origin: 50% 90%; }
@keyframes eh-idle { 0%,100% { transform: rotate(-2deg); } 50% { transform: rotate(2deg); } }
.eh-idle { animation: eh-idle 2.2s ease-in-out infinite; transform-origin: 50% 90%; }
@keyframes eh-flash { 0% { opacity: 0; } 30% { opacity: .95; } 100% { opacity: 0; } }
.eh-flash { animation: eh-flash .55s ease-out forwards; }
@keyframes eh-shell-l { to { transform: translate(-70px, 40px) rotate(-55deg); opacity: 0; } }
@keyframes eh-shell-r { to { transform: translate(70px, 40px) rotate(55deg); opacity: 0; } }
.eh-shell-l { animation: eh-shell-l .6s ease-in forwards; }
.eh-shell-r { animation: eh-shell-r .6s ease-in forwards; }
@keyframes eh-land { 0% { transform: translateY(-28px) scale(.4); opacity: 0; } 55% { transform: translateY(0) scale(1.08); opacity: 1; } 75% { transform: translateY(-10px) scale(1); } 100% { transform: translateY(0) scale(1); } }
.eh-land { animation: eh-land .8s cubic-bezier(.2,.8,.3,1) both; }
@keyframes eh-rays-in { from { opacity: 0; transform: scale(.4) rotate(0); } to { opacity: 1; transform: scale(1) rotate(25deg); } }
@keyframes eh-rays-spin { from { transform: rotate(25deg); } to { transform: rotate(385deg); } }
.eh-rays { animation: eh-rays-in .7s ease-out both, eh-rays-spin 24s linear .7s infinite; }
@keyframes eh-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.eh-rise { animation: eh-rise .45s ease-out both; }
@keyframes eh-hint { 0%,100% { opacity: .65; } 50% { opacity: 1; } }
.eh-hint { animation: eh-hint 1.4s ease-in-out infinite; }
@keyframes eh-breathe { from { transform: scale(1, 1); } to { transform: scale(0.988, 1.03); } }
.eh-breathe { transform-origin: 50% 100%; animation: eh-breathe 1.1s ease-in-out .8s infinite alternate; }
@keyframes eh-float { from { transform: translateY(0); } to { transform: translateY(-${FLOAT_BOB_PX}px); } }
.eh-float { animation: eh-float 1.4s ease-in-out .8s infinite alternate; }
@keyframes eh-float-shadow { from { transform: scale(1); opacity: 1; } to { transform: scale(.85); opacity: .7; } }
.eh-float-shadow { animation: eh-float-shadow 1.4s ease-in-out .8s infinite alternate; }
@media (prefers-reduced-motion: reduce) {
  .eh-wobble, .eh-idle, .eh-land, .eh-rays, .eh-rise, .eh-hint, .eh-breathe, .eh-float, .eh-float-shadow { animation: none; }
}
`;

// Cracks drawn over the egg sprite, one more set per tap (viewBox 0-100).
const CRACKS = [
  'M50 34 L46 42 L53 47 L48 55',
  'M48 55 L41 60 L45 66 M53 47 L61 50 L58 58 L64 63',
  'M46 42 L38 44 L35 51 M58 58 L52 64 L55 71 M41 60 L36 67',
];

// First sentence of the lore, so the reveal stays short for young readers.
const firstSentence = (text: string) => {
  const m = text.match(/^.*?[.!?](\s|$)/);
  return (m ? m[0] : text).trim();
};

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

  const title = isKeeper ? "Keeper's Egg" : 'The Hatchery';
  const rays = RAY_COLOR[def.element] ?? RAY_COLOR[element];

  return (
    <>
      <style>{HATCH_CSS}</style>
      {isRareQuality && <CelebrationOverlay userId={userId} trigger={burst} type="levelup" />}
      <div className="fixed inset-0 bg-black/85 z-[60] flex items-center justify-center p-4 select-none">
        <div
          className="relative border-2 border-[#4a2f18] rounded-2xl p-5 sm:p-7 max-w-md w-full text-center battle-panel-in"
          style={{ boxShadow: `0 0 0 3px #d4a017, ${questButtonDropShadow}`, ...woodTextureStyle }}
        >
          {/* Same wood-plank + gold trim + corner-nail frame as the battle
              screen's MonsterHpPanel/PostBattleSummary. */}
          <Nail className="top-2 left-2" />
          <Nail className="top-2 right-2" />
          <Nail className="bottom-2 left-2" />
          <Nail className="bottom-2 right-2" />
          <p
            className="text-sm tracking-wide mb-2"
            style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing }}
          >
            <span style={{ position: 'relative', display: 'inline-block' }}>
              <span aria-hidden style={questTextShadowStyle}>{title}</span>
              <span style={{ ...questTextStyle, color: '#67e8f9' }}>{title}</span>
            </span>
          </p>

          {/* Stage: the egg while tapping, the hatchling after. */}
          <div className="relative h-52 sm:h-60 mx-auto flex items-end justify-center overflow-visible">
            {phase === 'reveal' && (
              <div
                aria-hidden
                className="eh-rays absolute left-1/2 top-1/2 -ml-40 -mt-40 w-80 h-80 pointer-events-none"
                style={{
                  background: `repeating-conic-gradient(rgba(${rays},0.32) 0deg 9deg, transparent 9deg 24deg)`,
                  WebkitMaskImage: 'radial-gradient(closest-side, black 25%, transparent 100%)',
                  maskImage: 'radial-gradient(closest-side, black 25%, transparent 100%)',
                }}
              />
            )}

            {phase !== 'reveal' && (
              <button
                type="button"
                onClick={tap}
                disabled={phase !== 'tapping'}
                aria-label="Tap the egg to hatch it"
                className="relative h-44 sm:h-52 aspect-square mb-2 cursor-pointer disabled:cursor-default"
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
                    <span aria-hidden className="eh-flash absolute -inset-8 rounded-full" style={{ background: 'radial-gradient(circle, #fffbe6 0%, rgba(255,251,230,0) 70%)' }} />
                  </>
                )}
              </button>
            )}

            {phase === 'reveal' && (
              <div className="relative flex flex-col items-center">
                <div className="eh-land relative h-44 sm:h-52 w-56 sm:w-64" style={def.floats ? { marginBottom: FLOAT_LIFT_PX } : undefined}>
                  {/* Same idle as on the battle stage (BattleStageScene.startIdle):
                      floaters bob, grounded curios breathe from the feet. Kept
                      on an inner layer so it doesn't fight the landing hop. */}
                  <div className={`w-full h-full ${def.floats ? 'eh-float' : 'eh-breathe'}`}>
                    <MonsterImage monster={def} className="w-full h-full [&>img]:object-bottom drop-shadow-[0_8px_10px_rgba(0,0,0,0.55)]" emojiClassName="text-8xl" />
                  </div>
                </div>
                {/* Ground shadow: the art is cropped edge to edge, so its feet
                    sit on this; a floater's shadow shrinks as it rises. */}
                <span aria-hidden className={`block h-3 w-32 -mt-2 rounded-[50%] bg-black/45 blur-[2px] ${def.floats ? 'eh-float-shadow' : ''}`} />
              </div>
            )}
          </div>

          {phase !== 'reveal' ? (
            <p className={`text-white font-bold text-lg mt-2 ${phase === 'tapping' ? 'eh-hint' : ''}`} style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
              {phase === 'tapping'
                ? `Tap the egg to hatch it! (${taps}/${TAPS_TO_HATCH})`
                : 'Here it comes...'}
            </p>
          ) : (
            <div className="eh-rise space-y-3 mt-1">
              <div>
                <p className="text-[#f5f0e8] text-xs" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>Your egg hatched into</p>
                <p className="text-white font-bold text-2xl" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>{def.name}!</p>
                <div className="flex items-center justify-center gap-2 mt-1.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-black/35 border border-[#e8d0a0]/50 text-[#f5f0e8] capitalize">
                    <img src={ELEMENT_ICON_SRC[def.element]} alt="" className="w-4 h-4 object-contain" />
                    {def.element}
                  </span>
                  <span className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full border ${QUALITY_PILL[quality]}`}>
                    {QUALITY_LABEL[quality]}
                  </span>
                </div>
                {def.description && (
                  <p className="text-[#e8d0a0] text-sm mt-2 leading-snug" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                    {firstSentence(def.description)}
                  </p>
                )}
              </div>

              {isKeeper && (
                <div className="text-left">
                  <VoiceCaptions lines={[HATCH_LINE]} startDelayMs={700} onDone={() => {}} />
                </div>
              )}

              <p className="text-[#f5f0e8] text-xs leading-snug" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>
                It starts at Level 1, resting on your bench. Put it in your team to train it in battles.
              </p>
              <div className="flex gap-2">
                <GameButton
                  variant="quest"
                  color="#dc2626"
                  onClick={() => { playPageFlip(); onClose(); }}
                  className="flex-1"
                  style={{ fontSize: 15 }}
                >
                  Close
                </GameButton>
                {onViewTeam && (
                  <GameButton
                    variant="quest"
                    onClick={() => { playPageFlip(); onClose(); onViewTeam(); }}
                    className="flex-1"
                    style={{ fontSize: 15 }}
                  >
                    See my team
                  </GameButton>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
