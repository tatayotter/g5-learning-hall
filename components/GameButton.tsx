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
            <span aria-hidden style={questTextShadowStyle}>{children}</span>
            <span style={questTextStyle}>{children}</span>
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
