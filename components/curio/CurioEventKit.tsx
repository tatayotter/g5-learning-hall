'use client';
// Shared look for event modals that put a curio center stage (egg hatch, new
// curio, starter claim, graduation, Growth Pill, Tutor, duplicate catch).
// Born in EggHatchModal: wood + gold-trim + nail frame, a stage where the
// curio lands big under slow-spinning light rays in its element's color,
// then idles like it does in battle (grounded curios breathe from the feet,
// floaters bob over a shrinking shadow), with element/quality pills and a
// line of lore under it.
import { CSSProperties, ReactNode } from 'react';
import { ELEMENT_ICON_SRC, Element, MonsterDef } from '@/lib/monsterConfig';
import { QUALITY_LABEL, QualityTier } from '@/lib/curioQuality';
import { MonsterImage } from '@/components/battle/shared';
import { questButtonFontFamily, questButtonLetterSpacing, questButtonDropShadow, questTextShadowStyle, questTextStyle } from '@/components/GameButton';
import { woodTextureStyle, Nail } from '@/components/battle/MonsterHpPanel';
import { FLOAT_BOB_PX, FLOAT_LIFT_PX } from '@/lib/curioBody';

// Pill colors per quality, matching the quality glow colors in globals.css.
export const QUALITY_PILL: Record<QualityTier, string> = {
  normal: 'bg-[#f5f0e8]/15 border-[#e8d0a0]/60 text-[#f5f0e8]',
  good: 'bg-green-600/30 border-green-400 text-green-200',
  outstanding: 'bg-cyan-600/30 border-cyan-400 text-cyan-200',
  perfect: 'bg-orange-600/30 border-orange-400 text-orange-200',
};

// "r,g,b" so callers can pick their own alpha.
export const ELEMENT_RGB: Record<Element, string> = {
  fire: '251,146,60', water: '56,189,248', leaf: '74,222,128',
  storm: '250,204,21', shadow: '192,132,252', light: '253,224,71',
};

export const QUALITY_RGB: Record<QualityTier, string> = {
  normal: '245,240,232', good: '74,222,128', outstanding: '34,211,238', perfect: '251,146,60',
};

export const TEXT_SHADOW = { textShadow: '0 1px 2px rgba(0,0,0,0.9)' };

export const CURIO_EVENT_CSS = `
@keyframes ce-flash { 0% { opacity: 0; } 30% { opacity: .95; } 100% { opacity: 0; } }
.ce-flash { animation: ce-flash .55s ease-out forwards; }
@keyframes ce-land { 0% { transform: translateY(-28px) scale(.4); opacity: 0; } 55% { transform: translateY(0) scale(1.08); opacity: 1; } 75% { transform: translateY(-10px) scale(1); } 100% { transform: translateY(0) scale(1); } }
.ce-land { animation: ce-land .8s cubic-bezier(.2,.8,.3,1) both; }
@keyframes ce-rays-in { from { opacity: 0; transform: scale(.4) rotate(0); } to { opacity: 1; transform: scale(1) rotate(25deg); } }
@keyframes ce-rays-spin { from { transform: rotate(25deg); } to { transform: rotate(385deg); } }
.ce-rays { animation: ce-rays-in .7s ease-out both, ce-rays-spin 24s linear .7s infinite; }
@keyframes ce-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.ce-rise { animation: ce-rise .45s ease-out both; }
@keyframes ce-hint { 0%,100% { opacity: .65; } 50% { opacity: 1; } }
.ce-hint { animation: ce-hint 1.4s ease-in-out infinite; }
@keyframes ce-breathe { from { transform: scale(1, 1); } to { transform: scale(0.988, 1.03); } }
.ce-breathe { transform-origin: 50% 100%; animation: ce-breathe 1.1s ease-in-out .8s infinite alternate; }
@keyframes ce-float { from { transform: translateY(0); } to { transform: translateY(-${FLOAT_BOB_PX}px); } }
.ce-float { animation: ce-float 1.4s ease-in-out .8s infinite alternate; }
@keyframes ce-float-shadow { from { transform: scale(1); opacity: 1; } to { transform: scale(.85); opacity: .7; } }
.ce-float-shadow { animation: ce-float-shadow 1.4s ease-in-out .8s infinite alternate; }
@keyframes ce-orb { 0%,100% { transform: scale(.85); opacity: .75; } 50% { transform: scale(1.1); opacity: 1; } }
.ce-orb { animation: ce-orb 1s ease-in-out infinite; }
@keyframes ce-surge { 0%,100% { filter: brightness(1) drop-shadow(0 0 0 transparent); } 50% { filter: brightness(1.45) drop-shadow(0 0 18px var(--ce-surge)); } }
.ce-surge { animation: ce-surge .35s ease-in-out 3; }
@media (prefers-reduced-motion: reduce) {
  .ce-land, .ce-rays, .ce-rise, .ce-hint, .ce-breathe, .ce-float, .ce-float-shadow, .ce-orb, .ce-surge { animation: none; }
}
`;

// First sentence of the lore, so a reveal stays short for young readers.
export const firstSentence = (text: string) => {
  const m = text.match(/^.*?[.!?](\s|$)/);
  return (m ? m[0] : text).trim();
};

export function QuestTitle({ children, color = '#67e8f9', className = 'text-sm mb-2' }: { children: string; color?: string; className?: string }) {
  return (
    <p className={`tracking-wide ${className}`} style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing }}>
      <span style={{ position: 'relative', display: 'inline-block' }}>
        <span aria-hidden style={questTextShadowStyle}>{children}</span>
        <span style={{ ...questTextStyle, color }}>{children}</span>
      </span>
    </p>
  );
}

// Backdrop + wood panel with gold trim and corner nails. `zClass` matters:
// anything that can open over the fullscreen map (z-[78]) needs z-[95].
export function CurioEventFrame({ title, titleColor, ringColor = '#d4a017', zClass = 'z-[60]', onBackdropClick, children }: {
  title: string;
  titleColor?: string;
  ringColor?: string;
  zClass?: string;
  onBackdropClick?: () => void;
  children: ReactNode;
}) {
  return (
    <>
      <style>{CURIO_EVENT_CSS}</style>
      <div className={`fixed inset-0 bg-black/85 ${zClass} flex items-center justify-center p-4 select-none overflow-y-auto`} onClick={onBackdropClick}>
        <div
          className="relative border-2 border-[#4a2f18] rounded-2xl p-5 sm:p-7 max-w-md w-full text-center battle-panel-in my-auto"
          style={{ boxShadow: `0 0 0 3px ${ringColor}, ${questButtonDropShadow}`, ...woodTextureStyle }}
          onClick={e => e.stopPropagation()}
        >
          {/* Same wood-plank + gold trim + corner-nail frame as the battle
              screen's MonsterHpPanel/PostBattleSummary. */}
          <Nail className="top-2 left-2" />
          <Nail className="top-2 right-2" />
          <Nail className="bottom-2 left-2" />
          <Nail className="bottom-2 right-2" />
          <QuestTitle color={titleColor}>{title}</QuestTitle>
          {children}
        </div>
      </div>
    </>
  );
}

const STAGE_SIZE = {
  lg: { stage: 'h-52 sm:h-60', body: 'h-44 sm:h-52 w-56 sm:w-64', rays: '-ml-40 -mt-40 w-80 h-80' },
  md: { stage: 'h-40 sm:h-48', body: 'h-32 sm:h-40 w-44 sm:w-52', rays: '-ml-32 -mt-32 w-64 h-64' },
  // For modals that also carry a quiz (wild encounter), so the question fits a phone.
  sm: { stage: 'h-32 sm:h-40', body: 'h-24 sm:h-32 w-36 sm:w-44', rays: '-ml-24 -mt-24 w-48 h-48' },
};

export type StageSize = keyof typeof STAGE_SIZE;

// The stage: rays behind, the curio standing on its ground shadow. Pass
// `def={null}` to keep the stage's height while something else (an egg, an
// orb) is shown via `children`, which renders centered over the stage.
export function CurioSpotlight({ def, size = 'lg', rays, raysRgb, land = true, curioClassName = '', curioStyle, children }: {
  def: MonsterDef | null;
  size?: StageSize;
  rays?: boolean;
  raysRgb?: string; // defaults to the curio's element color
  land?: boolean;
  curioClassName?: string; // e.g. a quality glow class
  curioStyle?: CSSProperties;
  children?: ReactNode;
}) {
  const s = STAGE_SIZE[size];
  const rgb = raysRgb ?? (def ? ELEMENT_RGB[def.element] : '253,224,71');
  return (
    <div className={`relative w-full ${s.stage} mx-auto flex items-end justify-center overflow-visible`}>
      {rays && (
        <div
          aria-hidden
          className={`ce-rays absolute left-1/2 top-1/2 ${s.rays} pointer-events-none`}
          style={{
            background: `repeating-conic-gradient(rgba(${rgb},0.32) 0deg 9deg, transparent 9deg 24deg)`,
            WebkitMaskImage: 'radial-gradient(closest-side, black 25%, transparent 100%)',
            maskImage: 'radial-gradient(closest-side, black 25%, transparent 100%)',
          }}
        />
      )}
      {def && (
        <div className="relative flex flex-col items-center">
          <div className={`${land ? 'ce-land' : ''} relative ${s.body}`} style={def.floats ? { marginBottom: FLOAT_LIFT_PX } : undefined}>
            {/* Same idle as on the battle stage (BattleStageScene.startIdle),
                on an inner layer so it doesn't fight the landing hop. */}
            <div className={`w-full h-full ${def.floats ? 'ce-float' : 'ce-breathe'}`}>
              <div className={`w-full h-full ${curioClassName}`} style={curioStyle}>
                <MonsterImage monster={def} className="w-full h-full [&>img]:object-bottom drop-shadow-[0_8px_10px_rgba(0,0,0,0.55)]" emojiClassName="text-8xl" />
              </div>
            </div>
          </div>
          {/* Ground shadow: the art is cropped edge to edge, so its feet
              sit on this; a floater's shadow shrinks as it rises. */}
          <span aria-hidden className={`block h-3 w-32 -mt-2 rounded-[50%] bg-black/45 blur-[2px] ${def.floats ? 'ce-float-shadow' : ''}`} />
        </div>
      )}
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  );
}

// A pulsing orb of light: the "something is happening" beat before a reveal.
export function ChargeOrb({ rgb, className = 'w-28 h-28' }: { rgb: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={`ce-orb block rounded-full ${className}`}
      style={{ background: `radial-gradient(circle, rgba(255,251,230,0.95) 0%, rgba(${rgb},0.8) 40%, rgba(${rgb},0) 72%)` }}
    />
  );
}

// White burst laid over the stage at the moment of reveal.
export function RevealFlash() {
  return <span aria-hidden className="ce-flash absolute -inset-8 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, #fffbe6 0%, rgba(255,251,230,0) 70%)' }} />;
}

export function ElementPill({ element }: { element: Element }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-black/35 border border-[#e8d0a0]/50 text-[#f5f0e8] capitalize">
      <img src={ELEMENT_ICON_SRC[element]} alt="" className="w-4 h-4 object-contain" />
      {element}
    </span>
  );
}

export function QualityPill({ quality }: { quality: QualityTier }) {
  return (
    <span className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full border ${QUALITY_PILL[quality]}`}>
      {QUALITY_LABEL[quality]}
    </span>
  );
}

// Name block under the stage: small lead-in, big name, pills, a line of lore.
export function CurioIdentity({ def, lead, name, quality, extraPill, lore = true }: {
  def: MonsterDef;
  lead?: ReactNode;
  name?: ReactNode; // defaults to `${def.name}!`
  quality?: QualityTier;
  extraPill?: ReactNode;
  lore?: boolean;
}) {
  return (
    <div>
      {lead && <p className="text-[#f5f0e8] text-xs" style={TEXT_SHADOW}>{lead}</p>}
      <p className="text-white font-bold text-2xl" style={TEXT_SHADOW}>{name ?? `${def.name}!`}</p>
      <div className="flex items-center justify-center gap-2 mt-1.5">
        <ElementPill element={def.element} />
        {quality && <QualityPill quality={quality} />}
        {extraPill}
      </div>
      {lore && def.description && (
        <p className="text-[#e8d0a0] text-sm mt-2 leading-snug" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
          {firstSentence(def.description)}
        </p>
      )}
    </div>
  );
}

// Before -> after stat rows (graduation, Growth Pill, Tutor), or plain values
// when `from` is omitted (starter claim).
const STAT_ICON: Record<'hp' | 'attack' | 'defense' | 'speed', { label: string; icon: string }> = {
  hp: { label: 'HP', icon: '/icons/stats/hp.svg' },
  attack: { label: 'Attack', icon: '/icons/stats/atk.svg' },
  defense: { label: 'Defense', icon: '/icons/stats/def.svg' },
  speed: { label: 'Speed', icon: '/icons/stats/spd.svg' },
};

type StatBlock = { hp: number; attack: number; defense: number; speed: number };

export function StatChanges({ to, from, keys = ['hp', 'attack', 'defense', 'speed'] }: {
  to: StatBlock;
  from?: StatBlock;
  keys?: (keyof StatBlock)[];
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5 max-w-[260px] mx-auto">
      {keys.map((key, i) => (
        <div
          key={key}
          className="ce-rise flex items-center justify-between gap-2 text-xs rounded-lg bg-black/30 border border-[#e8d0a0]/25 px-2 py-1"
          style={{ animationDelay: `${300 + i * 110}ms` }}
        >
          <span className="text-[#e8d0a0] flex items-center gap-1">
            <img src={STAT_ICON[key].icon} alt="" className="w-3.5 h-3.5 object-contain" /> {STAT_ICON[key].label}
          </span>
          <span className="text-white font-bold tabular-nums" style={TEXT_SHADOW}>
            {from && from[key] !== to[key] ? (
              <>
                <span className="text-[#c9a87a] font-normal">{from[key]}</span>
                <span className="text-[#c9a87a] font-normal"> &rarr; </span>
                <span className={to[key] > from[key] ? 'text-green-400' : 'text-red-300'}>{to[key]}</span>
              </>
            ) : to[key]}
          </span>
        </div>
      ))}
    </div>
  );
}
