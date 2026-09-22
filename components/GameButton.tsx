// components/GameButton.tsx
import { motion, HTMLMotionProps } from 'framer-motion';
import { ReactNode } from 'react';

interface GameButtonProps extends HTMLMotionProps<'button'> {
  // 'plain' (default): unstyled — caller supplies the full look via
  // className, same as this component always worked. Every existing call
  // site (Dashboard's ghost "back" links, QuestModule, the 5 guild
  // mini-games) relies on that — don't change the default.
  //
  // 'quest': the gold "START QUEST" pill design, built from the actual
  // Photoshop layer styles (Stroke, two Inner Shadows, Drop Shadow — both
  // the shape's and the text's) rather than eyeballed. Opt in per call site
  // instead of baking into the default, so it doesn't silently reskin every
  // existing GameButton usage above.
  variant?: 'plain' | 'quest';
  // Base fill color for the 'quest' variant — defaults to the reference's
  // gold. The white-top/black-bottom inner-shadow banding and drop shadow
  // work over any base hue unchanged, so e.g. a completed/disabled state
  // can reuse the exact same shape by passing a gray here instead of
  // needing a whole separate style.
  color?: string;
  // For compact icon+label tiles (e.g. battle action tiles) rather than a
  // single big centered CTA label: icon on the left, `children` as the bold
  // title (still gets the outline+shadow treatment) stacked over `sub`, a
  // plain small caption. Omit both to get the original centered-label quest
  // button.
  icon?: ReactNode;
  sub?: ReactNode;
}

// All measurements are em-relative to font-size (63px = the text layer's
// point size in the source PSD, on a 1920x1080 canvas) so the whole button
// scales as one unit at any font-size an instance sets:
//   Stroke (shape):  3px, Outside, black, 100%        -> 0.0476em border
//   Inner Shadow (white): 75%, distance 10px, hard edge -> inset 0 0.1587em 0 0 white/75%
//   Inner Shadow (black): 30%, distance 15px, hard edge -> inset 0 -0.2381em 0 0 black/30%
//   Drop Shadow (shape): 75%, distance 8px, size 3px, spread 100%
//     -> blur = size*(1-spread) = 0, css-spread = size*spread = 0.0476em
//   Stroke (text):   3px, Outside, black, 100% (doubled per request -> 0.0952em)
//   Drop Shadow (text): 100%, distance 4px, size 3px, spread 100% -> blur 0
// No separate "skirt" color exists in the source file — the darker band
// near the bottom is just the black Inner Shadow blending into the gold
// fill, not a distinct layer.
const QUEST_DEFAULT_COLOR = '#f5c542';

const questButtonStyle: React.CSSProperties = {
  fontFamily: "var(--font-bungee), sans-serif",
  letterSpacing: '0.016em',
  border: '0.0476em solid #000',
  borderRadius: '0.508em',
  padding: '0.317em 0.889em',
  position: 'relative',
  overflow: 'hidden',
  boxShadow:
    'inset 0 0.1587em 0 0 rgba(255,255,255,0.75), ' +
    'inset 0 -0.2381em 0 0 rgba(0,0,0,0.30), ' +
    '0 0.1270em 0 0.0476em rgba(0,0,0,0.75)',
};

const questHighlightStyle: React.CSSProperties = {
  position: 'absolute',
  top: '0.22em', // clear of the 0.1587em top inner-shadow band
  right: '0.15em',
  width: '0.5em',
  height: '0.22em',
  background: 'rgba(255,255,255,0.75)',
  borderRadius: '50%',
  transform: 'rotate(10deg)',
};

const questTextShadowStyle: React.CSSProperties = {
  position: 'absolute',
  top: '0.09em',
  left: 0,
  right: 0,
  color: '#000',
  WebkitTextStroke: '0.0952em #000',
};

const questTextStyle: React.CSSProperties = {
  position: 'relative',
  color: '#fff',
  WebkitTextStroke: '0.0952em #000',
  paintOrder: 'stroke fill',
  textTransform: 'uppercase',
};

// Exported so any other Bungee-outlined-text spot (e.g. the battle HP card's
// curio name) can reuse the exact same stroke/shadow treatment as the quest
// button's label instead of re-deriving the em-ratios by eye.
export const questButtonFontFamily = questButtonStyle.fontFamily;
export const questButtonLetterSpacing = questButtonStyle.letterSpacing;
export const questButtonBoxShadow = questButtonStyle.boxShadow;
// Just the outer drop shadow layer, without the two inner-shadow banding
// layers — for spots (e.g. the battle HP card) that want the button's
// "sitting above the scene" lift but not its inner-glow/bevel look.
export const questButtonDropShadow = '0 0.1270em 0 0.0476em rgba(0,0,0,0.75)';
export { questTextShadowStyle, questTextStyle };

// Shared "quest card" quiz-option look, lifted verbatim from QuestModule.tsx
// (the reference implementation docs/STYLE_GUIDE.md points to) so every
// other multiple-choice surface — guild mini-games, MTAP quiz/trainer,
// battle's question modal, wild encounters — renders options identically
// instead of each keeping its own flat/stock-Tailwind approximation.
// Inject once per screen via `<style>{QUIZ_OPTION_STYLES}</style>`, then use
// `qopt qopt-${state}` on each option button with a `qopt-badge`/`qopt-text`
// child structure (see QuestModule.tsx for the reference markup). `state` is
// one of: '' (idle/default), 'selected' (picked, not yet resolved),
// 'correct', 'wrong', 'dim' (shown-but-not-picked once resolved).
export const QUIZ_OPTION_STYLES = `
  .qopt { display:flex; align-items:center; gap:12px; width:100%; text-align:left; padding:10px 14px;
    font-weight:700; font-size:15px; color:#2a1505; border-radius:14px; border:2px solid #8b5e2a;
    background:linear-gradient(180deg,#fff8e6 0%,#f0ddb8 100%); box-shadow:0 4px 0 #8b5e2a, 0 6px 8px rgba(42,21,5,.25);
    transition:transform .1s, box-shadow .1s, background .15s; cursor:pointer; position:relative; }
  .qopt:not(:disabled):hover { transform:translateY(-2px); box-shadow:0 6px 0 #8b5e2a, 0 9px 12px rgba(42,21,5,.3);
    background:linear-gradient(180deg,#fffdf2 0%,#f7e6c2 100%); }
  .qopt:not(:disabled):active { transform:translateY(3px); box-shadow:0 1px 0 #8b5e2a; }
  .qopt-badge { flex:none; width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center;
    font-weight:900; font-size:14px; color:#fff; background:radial-gradient(circle at 30% 25%,#e8a13a,#b5651a);
    border:2px solid #7a4a0f; box-shadow:inset 0 -2px 0 rgba(0,0,0,.25); text-shadow:0 1px 1px rgba(0,0,0,.4); }
  .qopt-text { flex:1; min-width:0; }
  .qopt-mark { flex:none; font-size:20px; font-weight:900; }
  .qopt-selected { border-color:#c9781a; background:linear-gradient(180deg,#ffe9a8 0%,#f5c95c 100%);
    box-shadow:0 4px 0 #c9781a, 0 0 0 3px rgba(245,201,92,.6), 0 6px 12px rgba(201,120,26,.4); transform:translateY(-1px); }
  .qopt-correct { border-color:#15803d; background:linear-gradient(180deg,#dcfce7 0%,#86efac 100%);
    box-shadow:0 4px 0 #15803d, 0 0 14px rgba(34,197,94,.6); animation:qopt-pop .35s ease-out; }
  .qopt-correct .qopt-badge { background:radial-gradient(circle at 30% 25%,#4ade80,#15803d); border-color:#14532d; }
  .qopt-correct .qopt-mark { color:#15803d; }
  .qopt-wrong { border-color:#b91c1c; background:linear-gradient(180deg,#fee2e2 0%,#fca5a5 100%);
    box-shadow:0 4px 0 #b91c1c; animation:qopt-shake .35s ease-in-out; }
  .qopt-wrong .qopt-badge { background:radial-gradient(circle at 30% 25%,#f87171,#b91c1c); border-color:#7f1d1d; }
  .qopt-wrong .qopt-mark { color:#b91c1c; }
  .qopt-dim { opacity:.55; box-shadow:0 2px 0 #8b5e2a; cursor:default; }
  @keyframes qopt-pop { 0%{transform:scale(1)} 50%{transform:scale(1.04)} 100%{transform:scale(1)} }
  @keyframes qopt-shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }
`;

// Shared "curio card" look, lifted verbatim from CurioTrainingPicker.tsx (the
// "which curio should train?" main-quest picker) — a parchment-gradient tile
// with a dashed inset border and a circular sprite well, distinct from the
// flatter QUIZ_OPTION_STYLES above since these are curio-picker cards, not
// answer options. Inject once per screen via `<style>{CURIO_CARD_STYLES}</style>`,
// then put `ccard ${selected ? 'ccard-selected' : ''}` on the card button,
// wrap the sprite in a `ccard-sprite` span, and optionally add a `ccard-tag`
// (a pill flag pinned to the top edge, e.g. "Active") and/or a `ccard-check`
// (a green checkmark badge, top-right) for the selected state.
export const CURIO_CARD_STYLES = `
  .ccard { position:relative; display:flex; flex-direction:column; align-items:center; gap:4px; padding:22px 10px 12px; cursor:pointer;
    border-radius:16px; border:2px solid #8b5e2a; background:linear-gradient(180deg,#fffdf7 0%,#fbf3df 100%);
    box-shadow:0 4px 0 #8b5e2a, 0 8px 12px rgba(42,21,5,.22); transition:transform .1s, box-shadow .1s; }
  .ccard::before { content:''; position:absolute; inset:4px; border:1px dashed #c9a87a; border-radius:11px; pointer-events:none; }
  .ccard:hover { transform:translateY(-2px); box-shadow:0 6px 0 #8b5e2a, 0 11px 14px rgba(42,21,5,.28); }
  .ccard:active { transform:translateY(3px); box-shadow:0 1px 0 #8b5e2a; }
  .ccard-sprite { display:flex; padding:6px; border-radius:50%; background:radial-gradient(circle,#f0ddb8 0%,#e8d0a0 70%); border:2px solid #c9a87a; }
  .ccard-lv { font-size:12px; font-weight:800; color:#6b4820; background:#f0ddb8; border:1px solid #c9a87a; border-radius:999px; padding:1px 10px; }
  .ccard-selected { border-color:#c9781a; background:linear-gradient(180deg,#ffe9a8 0%,#f5c95c 100%);
    box-shadow:0 4px 0 #c9781a, 0 0 0 3px rgba(245,201,92,.6), 0 8px 14px rgba(201,120,26,.4); transform:translateY(-1px); }
  .ccard-selected .ccard-sprite { background:radial-gradient(circle,#fff6d6 0%,#f5c95c 80%); border-color:#c9781a; }
  .ccard-tag { position:absolute; top:-10px; left:50%; transform:translateX(-50%); z-index:2; overflow:hidden; white-space:nowrap;
    background:#f5c542; border:0.0476em solid #000; border-radius:0.508em; padding:.25em .7em; }
  .ccard-check { position:absolute; top:6px; right:8px; width:22px; height:22px; border-radius:50%; background:#22c55e; color:#fff;
    border:2px solid #14532d; font-size:12px; font-weight:900; display:flex; align-items:center; justify-content:center; z-index:2; }
`;

export default function GameButton({ children, className, variant = 'plain', color, icon, sub, style, disabled, ...props }: GameButtonProps) {
  if (variant === 'quest') {
    const tileLayout = icon !== undefined || sub !== undefined;
    return (
      <motion.button
        disabled={disabled}
        whileHover={disabled ? undefined : { scale: 1.02 }}
        whileTap={disabled ? undefined : { scale: 0.95 }}
        className={className}
        style={{
          ...questButtonStyle,
          background: color ?? QUEST_DEFAULT_COLOR,
          ...(tileLayout
            ? { display: 'flex', alignItems: 'center', gap: '0.3em', textAlign: 'left', padding: '0.25em 0.5em' }
            : null),
          ...(disabled ? { opacity: 0.5, filter: 'saturate(0.6)', cursor: 'not-allowed' } : { cursor: 'pointer' }),
          ...style,
        }}
        {...props}
      >
        <span aria-hidden style={questHighlightStyle} />
        {icon && <span style={{ position: 'relative', flexShrink: 0, width: '2.2em', height: '2.2em', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>}
        <span style={{ position: 'relative', minWidth: 0 }}>
          <span style={{ position: 'relative', display: 'inline-block' }}>
            <span aria-hidden style={questTextShadowStyle}>{children as React.ReactNode}</span>
            <span style={questTextStyle}>{children as React.ReactNode}</span>
          </span>
          {sub && (
            <span style={{ display: 'block', fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.5em', color: 'rgba(0,0,0,0.6)', textTransform: 'none', letterSpacing: 'normal', fontWeight: 700 }}>
              {sub}
            </span>
          )}
        </span>
      </motion.button>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.95 }}
      className={className}
      style={style}
      {...props}
    >
      {children}
    </motion.button>
  );
}
