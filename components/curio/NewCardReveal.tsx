'use client';
// "New card!" moment for a curio joining the collection (wild catch, guild or
// event reward, egg hatch): a face-down Learning Hall card lands under the
// element's light rays, then flips over to show the curio's card (the same
// MiniCurioCard the team and Compendium use). Tapping the card flips it early.
// Lives inside a CurioEventFrame, which provides the ce-* stage motion.
import { useEffect, useEffectEvent, useState } from 'react';
import { MonsterDef, getScaledStats } from '@/lib/monsterConfig';
import { QualityTier } from '@/lib/curioQuality';
import { playPageFlip } from '@/lib/sounds';
import MiniCurioCard from '@/components/monster/MiniCurioCard';
import { LEGENDARY_FRAME, QUALITY_FRAME } from '@/components/monster/CurioCard';
import { ELEMENT_RGB } from '@/components/curio/CurioEventKit';
import { questButtonFontFamily, questButtonLetterSpacing } from '@/components/GameButton';

const NCR_CSS = `
@keyframes ncr-drop { 0% { transform: translateY(-40px) scale(.6) rotate(-8deg); opacity: 0; } 60% { transform: translateY(0) scale(1.05) rotate(2deg); opacity: 1; } 100% { transform: none; opacity: 1; } }
.ncr-drop { animation: ncr-drop .55s cubic-bezier(.2,.8,.3,1) both; }
.ncr-flipper { position: relative; transform-style: preserve-3d; transition: transform .75s cubic-bezier(.3,1.4,.5,1); }
.ncr-flipper.is-flipped { transform: rotateY(180deg); }
.ncr-face { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
.ncr-front { transform: rotateY(180deg); }
@keyframes ncr-shine { 0% { transform: translateX(-120%) skewX(-18deg); } 100% { transform: translateX(220%) skewX(-18deg); } }
.ncr-shine { animation: ncr-shine .9s ease-out .55s both; }
@keyframes ncr-tag { 0% { transform: translate(-50%, 8px) scale(.4); opacity: 0; } 70% { transform: translate(-50%, 0) scale(1.15); opacity: 1; } 100% { transform: translate(-50%, 0) scale(1); opacity: 1; } }
.ncr-tag { animation: ncr-tag .45s cubic-bezier(.2,.8,.3,1) .45s both; }
@keyframes ncr-wiggle { 0%,100% { transform: rotate(0); } 25% { transform: rotate(-2.5deg); } 75% { transform: rotate(2.5deg); } }
.ncr-wiggle { animation: ncr-wiggle .5s ease-in-out .6s 2; }
@media (prefers-reduced-motion: reduce) {
  .ncr-drop, .ncr-shine, .ncr-tag, .ncr-wiggle { animation: none; }
  .ncr-flipper { transition: none; }
}
`;

export default function NewCardReveal({ def, level, quality, flipAfterMs = 1100, onFlip }: {
  def: MonsterDef;
  level?: number;            // left out when unknown (a guild or event reward)
  quality?: QualityTier;
  flipAfterMs?: number;
  onFlip?: () => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const flip = () => setFlipped(true);
  useEffect(() => {
    const t = setTimeout(() => setFlipped(true), flipAfterMs);
    return () => clearTimeout(t);
  }, [flipAfterMs]);
  const announceFlip = useEffectEvent(() => { playPageFlip(); onFlip?.(); });
  useEffect(() => { if (flipped) announceFlip(); }, [flipped]);

  const frame = def.isLegendary ? LEGENDARY_FRAME : QUALITY_FRAME[quality ?? 'normal'];
  const rgb = ELEMENT_RGB[def.element] ?? '253,224,71';

  return (
    <div className="relative w-full flex justify-center pt-8 pb-2" data-testid="new-card-reveal" data-flipped={flipped}>
      <style>{NCR_CSS}</style>
      <div
        aria-hidden
        className="ce-rays absolute left-1/2 top-1/2 -ml-40 -mt-40 w-80 h-80 pointer-events-none"
        style={{
          background: `repeating-conic-gradient(rgba(${rgb},${flipped ? 0.4 : 0.15}) 0deg 9deg, transparent 9deg 24deg)`,
          WebkitMaskImage: 'radial-gradient(closest-side, black 25%, transparent 100%)',
          maskImage: 'radial-gradient(closest-side, black 25%, transparent 100%)',
          transition: 'background .4s',
        }}
      />
      <button
        type="button"
        onClick={flip}
        disabled={flipped}
        aria-label={flipped ? `${def.name} card` : 'Tap to flip your new card'}
        className="ncr-drop relative w-40 sm:w-44 cursor-pointer disabled:cursor-default text-left"
        style={{ perspective: 900 }}
      >
        {flipped && (
          <span
            className="ncr-tag absolute -top-8 left-1/2 z-20 whitespace-nowrap px-3 py-0.5 rounded-full text-[13px] text-white border-2 border-[#2a1505] shadow-lg"
            style={{ background: '#dc2626', fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing }}
          >
            New card!
          </span>
        )}
        <div className={`ncr-flipper ${flipped ? 'is-flipped' : ''}`}>
          {/* Both faces stacked in one grid cell, so the face-down side takes
              the card's exact size. The frame already hints at the quality. */}
          <div className="grid [transform-style:preserve-3d]">
            <div
              className="ncr-face [grid-area:1/1] rounded-[11px] p-[4px] flex"
              style={{ background: frame, boxShadow: '0 0 0 1.5px #4a2f18, 0 8px 18px rgba(0,0,0,0.5)' }}
              data-testid="new-card-back"
            >
              <div
                className={`flex-1 rounded-[8px] flex flex-col items-center justify-center gap-2 ${flipped ? '' : 'ncr-wiggle'}`}
                style={{
                  background: 'radial-gradient(circle at 50% 45%, #3b2a6b 0%, #1e1640 60%, #120d29 100%)',
                  boxShadow: 'inset 0 0 0 2px #c9a24a, inset 0 0 0 4px #4a2f18',
                }}
              >
                <span
                  className="w-16 h-16 rounded-full flex items-center justify-center text-4xl text-[#fde68a]"
                  style={{ background: 'radial-gradient(circle, #6d4bd1 0%, #2a1c5c 70%)', boxShadow: '0 0 0 3px #c9a24a, 0 0 18px rgba(253,230,138,0.55)', fontFamily: questButtonFontFamily }}
                >
                  ?
                </span>
                <span className="text-[11px] text-[#fde68a] tracking-wider" style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing }}>
                  Learning Hall
                </span>
                {!flipped && <span className="text-[10px] font-bold text-[#e9d5ff]/80 ce-hint">Tap to flip!</span>}
              </div>
            </div>
            <div className="ncr-face ncr-front [grid-area:1/1] relative rounded-[11px] overflow-hidden" data-testid="new-card-front">
              <MiniCurioCard def={def} level={level} quality={quality} hp={getScaledStats(def, level ?? 1, quality ?? 'normal').hp} />
              {flipped && (
                <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[11px]">
                  <span className="ncr-shine absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent" />
                </span>
              )}
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}
