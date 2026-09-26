'use client';
// components/battle/BattleStage.tsx
// Shared visual shell for both battle screens — the solo NPC BattleScreen
// (components/MonsterGuild.tsx) and the live PvP LiveBattleScreen.tsx — so a
// fight looks the same everywhere instead of each screen owning its own
// header/log/action-panel markup. Callers keep all their own state and
// phase-machine logic; they just hand this component data + the JSX for
// their action panel and any menu/modal overlay.
//
// Layout is a fixed 896x504 canvas (see the .bstage-* rules in
// app/globals.css). On desktop/tablet it scales down as one unit to fit its
// actual rendered container width (tracked via ResizeObserver, not a vw-based
// CSS media query — the battle screen sits inside a sidebar layout narrower
// than the viewport, so scaling off 100vw overflowed past the real content
// column). On mobile-width screens it instead goes full-screen (fixed,
// covering the whole viewport) and scales to fit both width AND height —
// the page chrome (nav tabs, sidebar, padding) otherwise pushes the canvas
// below the fold and forces scrolling to see the action panel.
import { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { MonsterDef, StatusEffect, type Element, ELEMENT_ICON_SRC, NORMAL_SKILL_ICON_SRC, STATUS_DEFINITIONS } from '@/lib/monsterConfig';
import type { AttackClass } from '@/lib/attackClasses';
import { AttackBanner } from '@/components/battle/shared';
import BattleCanvas, { curioSpriteUrl } from '@/components/battle/BattleCanvas';
import BattleIntro from '@/components/battle/BattleIntro';
import { BATTLE_INTRO_MIN_MS, BATTLE_INTRO_MAX_MS } from '@/lib/battleIntro';
import type { StageLayout } from '@/lib/phaserBattle/BattleStageScene';
import MonsterHpPanel from '@/components/battle/MonsterHpPanel';
import { useStageScale } from '@/hooks/useStageScale';
import { QualityTier } from '@/lib/curioQuality';
import GameButton from '@/components/GameButton';
import { playPageFlip } from '@/lib/sounds';

export interface BattleStageMonster {
  name: string;
  level: number;
  def: MonsterDef;
  currentHp: number;
  maxHp: number;
  status: StatusEffect;
  // Event signals consumed by BattleCanvas: set to 'battle-attack-right' /
  // 'battle-attack-left' / 'battle-hit' (reset to '' between events), and a
  // fresh `key` per hit on damagePopup.
  animClassName?: string;
  // The move this curio performs right now — a fresh `key` per use. Picks the
  // Phaser sequence (lib/attackClasses.ts); `element` is the MOVE's element
  // (null for element-less moves) and colors it. Hitting moves hold the
  // target's hit/damage signals until they connect.
  action?: { key: number; animation: AttackClass; element: Element | null } | null;
  damagePopup?: { key: number; value: number; missed: boolean } | null;
  quality?: QualityTier; // absent for NPC trainers, which have no quality tier
}

// Builds a BattleStageMonster.action for one use of a move (skill, or Rest
// as { animation: 'restore', element: curio's element }). Module-level
// counter keys each use so repeating the same move still replays it.
let stageActionSeq = 0;
export function makeStageAction(move: { animation: AttackClass; element: Element | null }): BattleStageMonster['action'] {
  stageActionSeq += 1;
  return { key: stageActionSeq, animation: move.animation, element: move.element };
}

export interface BattleTeamEntry { fainted: boolean; active: boolean; spriteUrl?: string }

// Every non-curio image the battle screen can show — preloaded behind the
// intro alongside the teams' curio art.
const BATTLE_UI_IMAGES = [
  '/battleui/battle_bg_normal.webp',
  '/battleui/battle_platform.webp',
  NORMAL_SKILL_ICON_SRC,
  ...Object.values(ELEMENT_ICON_SRC),
  ...Object.values(STATUS_DEFINITIONS).map(d => d.iconSrc),
];

// loading → (assets in + minimum passed) → ready: Ready button, waits for
// the player → leaving: fades while curios make their entrance → done.
type IntroPhase = 'loading' | 'ready' | 'leaving' | 'done';

interface BattleStageProps {
  leftName: string;
  rightName: string;
  leftMon: BattleStageMonster;
  rightMon: BattleStageMonster;
  // Each side's whole team for the HUD's roster dots (see MonsterHpPanel).
  // `spriteUrl` (curioSpriteUrl of the displayed def) lets the battle intro
  // preload every team member's art, not just the two on the field.
  leftTeam?: BattleTeamEntry[];
  rightTeam?: BattleTeamEntry[];
  // Battle intro screen (BattleIntro): on by default, shown for at least
  // introMinMs while every image the battle needs loads, then waits on a
  // Ready button. introAutoStartMs (PvP) makes that button count down and
  // start the fight on its own. onIntroDone fires as it lifts.
  intro?: boolean;
  introMinMs?: number;
  introAutoStartMs?: number;
  onIntroDone?: () => void;
  roundBadge?: string | null;
  log: string[];
  banner?: { text: string; iconSrc: string | null } | null;
  statusBanner?: ReactNode;
  actionPanel: ReactNode;
  overlay?: ReactNode;
  // 'auto' (default) picks portrait on phones held upright. Forcing a value
  // is for previews (/dev/ui-gallery).
  layout?: 'auto' | StageLayout;
}

// One button in the moves/utils grid — icon + title/sub, same shape for a
// skill, Rest, Items, Switch, or Surrender so the grid reads as one
// consistent control instead of four different button styles.
const ELEMENT_STYLES: Record<string, { bg: string; border: string; hover: string }> = {
  fire:   { bg: 'bg-orange-100',  border: 'border-orange-400', hover: 'hover:bg-orange-200 hover:border-orange-500' },
  water:  { bg: 'bg-sky-100',     border: 'border-sky-400',    hover: 'hover:bg-sky-200 hover:border-sky-500' },
  leaf:   { bg: 'bg-green-100',   border: 'border-green-500',  hover: 'hover:bg-green-200 hover:border-green-600' },
  storm:  { bg: 'bg-yellow-100',  border: 'border-yellow-500', hover: 'hover:bg-yellow-200 hover:border-yellow-600' },
  shadow: { bg: 'bg-purple-100',  border: 'border-purple-400', hover: 'hover:bg-purple-200 hover:border-purple-500' },
  light:  { bg: 'bg-amber-100',   border: 'border-amber-400',  hover: 'hover:bg-amber-200 hover:border-amber-500' },
};
const DEFAULT_TILE_STYLE = { bg: 'bg-white', border: 'border-[#c9a87a]', hover: 'hover:bg-[#f0ddb8] hover:border-[#c9781a]' };

// Strong per-element fills for the 'quest' variant (GameButton's gold-pill
// shape recolored per element) — approved 2026-08-29, replacing the pastel
// ELEMENT_STYLES set above for the real move/utility grids. BossFightScreen
// and MasteryGauntletScreen also reuse ActionTile for multiple-choice answer
// options, which is a different job (a plain answer list, not a skill grid)
// — those keep the default 'panel' look and don't opt into 'quest'.
const ELEMENT_QUEST_COLORS: Record<string, string> = {
  fire: '#dc2626', water: '#2563eb', leaf: '#16a34a', storm: '#ca8a04', shadow: '#7c3aed', light: '#eab308',
};
const NEUTRAL_QUEST_COLOR = '#78716c';
const DANGER_QUEST_COLOR = '#7f1d1d';

export function ActionTile({ icon, title, sub, onClick, disabled, danger, element, color, variant = 'panel' }: {
  icon: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  element?: string | null;
  // Explicit fill for the 'quest' variant — overrides the element/danger
  // lookup below. Lets non-elemental actions (Items, Switch) each get their
  // own identity instead of collapsing into one flat neutral gray.
  color?: string;
  variant?: 'panel' | 'quest';
}) {
  if (variant === 'quest') {
    const fill = color ?? (danger ? DANGER_QUEST_COLOR : (element && ELEMENT_QUEST_COLORS[element]) || NEUTRAL_QUEST_COLOR);
    return (
      <GameButton
        variant="quest"
        color={fill}
        onClick={onClick}
        disabled={disabled}
        icon={icon}
        sub={sub}
        className="w-full"
        style={{ fontSize: 14 }}
      >
        {title}
      </GameButton>
    );
  }
  const { bg, border, hover } = (element && ELEMENT_STYLES[element]) || DEFAULT_TILE_STYLE;
  return (
    <button
      onClick={disabled ? undefined : () => { playPageFlip(); onClick?.(); }}
      disabled={disabled}
      className={`flex items-center gap-2 text-left ${bg} ${border} ${hover} border rounded-lg px-2 py-[7px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed btn-tactile`}
    >
      <span className="w-[34px] h-[34px] flex items-center justify-center flex-shrink-0">
        {icon}
      </span>
      <span className="min-w-0">
        <span className={`flex items-center gap-1 text-[13px] font-extrabold leading-tight ${danger ? 'text-red-600' : 'text-[#2a1505]'}`}>{title}</span>
        {sub && <span className="block text-[11px] text-[#6b4820] truncate">{sub}</span>}
      </span>
    </button>
  );
}

// Placeholder tile for a locked or unequipped skill slot — keeps the moves
// grid at a steady 3 columns instead of collapsing/reflowing around a hole.
// Only ever used inside the real skill grids (never the answer-option
// lists), so it always gets the quest-locked look, no variant needed.
export function PlaceholderTile({ title, sub }: { title: ReactNode; sub: ReactNode }) {
  return (
    <GameButton variant="quest" color="#57534e" disabled sub={sub} className="w-full" style={{ fontSize: 14 }}>
      {title}
    </GameButton>
  );
}

// Logical canvas per layout. Portrait is the phone layout (the installed
// app is portrait-locked — see app/manifest.ts): opponent up-right and back,
// player low-left and forward, a tall move panel filling the bottom half.
// See the .bstage-portrait rules in app/globals.css.
const CANVAS_SIZE: Record<StageLayout, { w: number; h: number }> = {
  landscape: { w: 896, h: 504 },
  portrait: { w: 480, h: 860 },
};

// 'auto' = portrait on a mobile-width screen held upright, landscape
// otherwise. Re-evaluated on rotation.
function useAutoPortrait(): boolean {
  const [portrait, setPortrait] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px) and (orientation: portrait)');
    const update = () => setPortrait(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return portrait;
}

export default function BattleStage({
  leftName, rightName, leftMon, rightMon, leftTeam, rightTeam, roundBadge, log, banner, statusBanner, actionPanel, overlay,
  layout: layoutProp = 'auto',
  intro = true, introMinMs = BATTLE_INTRO_MIN_MS, introAutoStartMs, onIntroDone,
}: BattleStageProps) {
  const [logOpen, setLogOpen] = useState(false);

  // ── Battle intro ──────────────────────────────────────────────────────
  // Curio art for both whole teams goes to the Phaser scene (its texture
  // cache); UI images are warmed in the browser cache. The asset list is
  // fixed at mount — it's the battle's roster, which doesn't change.
  const [curioUrls] = useState(() => [...new Set([
    curioSpriteUrl(leftMon.def), curioSpriteUrl(rightMon.def),
    ...(leftTeam ?? []).map(t => t.spriteUrl), ...(rightTeam ?? []).map(t => t.spriteUrl),
  ].filter((u): u is string => !!u))]);
  const [introPhase, setIntroPhase] = useState<IntroPhase>(intro ? 'loading' : 'done');
  const [uiLoaded, setUiLoaded] = useState(0);
  const [sceneLoaded, setSceneLoaded] = useState(false);
  const introStartRef = useRef(0);
  const onIntroDoneRef = useRef(onIntroDone);
  useEffect(() => { onIntroDoneRef.current = onIntroDone; });
  // Progress = every browser-cache image + one step for the Phaser scene
  // having all curio textures ready.
  const introTotal = BATTLE_UI_IMAGES.length + curioUrls.length + 1;
  const introDoneCount = Math.min(uiLoaded, introTotal - 1) + (sceneLoaded ? 1 : 0);

  useEffect(() => {
    if (!intro) return;
    introStartRef.current = Date.now();
    let cancelled = false;
    for (const src of [...BATTLE_UI_IMAGES, ...curioUrls]) {
      const img = new Image();
      const done = () => { if (!cancelled) setUiLoaded(n => n + 1); };
      img.onload = done;
      img.onerror = done; // a missing file shouldn't hold the intro
      img.src = src;
    }
    // Safety cutoff — never leave a player stuck loading; go to the Ready
    // button even if an asset is still hanging.
    const cutoff = setTimeout(() => { if (!cancelled) setIntroPhase(p => (p === 'loading' ? 'ready' : p)); }, BATTLE_INTRO_MAX_MS);
    return () => { cancelled = true; clearTimeout(cutoff); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Offer the Ready button once everything's loaded AND the minimum time
  // has passed.
  const allLoaded = uiLoaded >= BATTLE_UI_IMAGES.length + curioUrls.length && sceneLoaded;
  useEffect(() => {
    if (introPhase !== 'loading' || !allLoaded) return;
    const wait = Math.max(0, introMinMs - (Date.now() - introStartRef.current));
    const t = setTimeout(() => setIntroPhase('ready'), wait);
    return () => clearTimeout(t);
  }, [introPhase, allLoaded, introMinMs]);
  const startBattle = useCallback(() => setIntroPhase(p => (p === 'ready' ? 'leaving' : p)), []);
  useEffect(() => {
    if (introPhase !== 'leaving') return;
    const t = setTimeout(() => { setIntroPhase('done'); onIntroDoneRef.current?.(); }, 350);
    return () => clearTimeout(t);
  }, [introPhase]);
  const autoPortrait = useAutoPortrait();
  const layout: StageLayout = layoutProp === 'auto' ? (autoPortrait ? 'portrait' : 'landscape') : layoutProp;
  const portrait = layout === 'portrait';
  const { w: CANVAS_WIDTH, h: CANVAS_HEIGHT } = CANVAS_SIZE[layout];
  const { shellRef, scale, isMobile } = useStageScale(CANVAS_WIDTH, CANVAS_HEIGHT);

  // On a phone held upright the battle owns the whole screen, and the app's
  // floating compass/arena buttons (SidebarRail's .nav-fab / .arena-fab)
  // would sit on top of the move panel — hide them for the battle's
  // lifetime. The class comes off on rotate to landscape and on unmount.
  const hideAppFabs = portrait && isMobile;
  useEffect(() => {
    if (!hideAppFabs) return;
    document.body.classList.add('battle-portrait-active');
    return () => document.body.classList.remove('battle-portrait-active');
  }, [hideAppFabs]);

  const canvas = (
    <div
      className={`bstage-container border-2 border-[#0a0807] ${portrait ? 'bstage-portrait' : ''} ${logOpen ? 'log-open' : ''}`}
      style={{
        backgroundImage: 'url(/battleui/battle_bg_normal.webp)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div aria-hidden className="bstage-vignette" />

      {introPhase !== 'done' && (
        <BattleIntro
          left={{ trainerName: leftName, leadName: leftMon.name, leadSpriteUrl: curioSpriteUrl(leftMon.def), teamSize: leftTeam?.length ?? 1, element: leftMon.def.element }}
          right={{ trainerName: rightName, leadName: rightMon.name, leadSpriteUrl: curioSpriteUrl(rightMon.def), teamSize: rightTeam?.length ?? 1, element: rightMon.def.element }}
          progress={introDoneCount / introTotal}
          leaving={introPhase === 'leaving'}
          showReady={introPhase === 'ready'}
          onReady={startBattle}
          autoStartMs={introAutoStartMs}
        />
      )}

      {roundBadge && (
        <div className="bstage-round-badge bg-[#0a0807]/60 text-amber-400 font-mono text-xs font-bold px-2 py-0.5 rounded-full">
          {roundBadge}
        </div>
      )}

      {/* Portrait: the player's card (first) sits bottom-right of the stage and
          the opponent's (second) top-left — so each card's "side" follows
          where it's drawn, keeping its contents reading outward-in. */}
      <div className="bstage-hp-row">
        <MonsterHpPanel name={leftMon.name} level={leftMon.level} currentHp={leftMon.currentHp} maxHp={leftMon.maxHp} status={leftMon.status} trainerName={leftName} side={portrait ? 'right' : 'left'} team={leftTeam} quality={leftMon.quality} />
        <MonsterHpPanel name={rightMon.name} level={rightMon.level} currentHp={rightMon.currentHp} maxHp={rightMon.maxHp} status={rightMon.status} trainerName={rightName} side={portrait ? 'left' : 'right'} team={rightTeam} quality={rightMon.quality} />
      </div>

      {/* Curios, platforms, and every hit/attack effect are drawn by Phaser
          (components/battle/BattleCanvas.tsx) — see lib/curioBody.ts for how
          each curio's size class and floater flag shape it on stage. */}
      <div className="bstage-stage">
        <BattleCanvas
          key={layout} leftMon={leftMon} rightMon={rightMon} layout={layout}
          // Curios step onto the stage (entrance animation) as the intro starts
          // to fade, not while it's still covering them.
          ready={introPhase === 'leaving' || introPhase === 'done'}
          preloadUrls={curioUrls}
          onAssetsReady={() => setSceneLoaded(true)}
        />
      </div>

      {banner && (
        <div className="bstage-stage-banner">
          <AttackBanner text={banner.text} iconSrc={banner.iconSrc} />
        </div>
      )}

      {!banner && statusBanner && (
        <div className="bstage-status-banner">{statusBanner}</div>
      )}

      <div className={`bstage-log-panel bg-white/95 ${logOpen ? 'open border-2 border-[#c9a87a]' : ''} ${banner ? 'bstage-fade-out' : 'bstage-fade-in'}`}>
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#c9a87a] text-[11px] font-bold uppercase tracking-wide text-[#6b4820] flex-shrink-0">
          <span>Battle Log</span>
        </div>
        <div className="bstage-log-content px-2.5 py-1.5 space-y-1">
          {log.map((msg, i) => (
            <p key={i} className="text-[11px] text-[#3a2610] bg-white border border-[#c9a87a] rounded px-2 py-1">{msg}</p>
          ))}
        </div>
      </div>

      <button
        onClick={() => { playPageFlip(); setLogOpen(o => !o); }}
        className={`bstage-show-log bg-white hover:bg-[#f0ddb8] text-[#2a1505] font-bold text-[11px] ${banner ? 'bstage-fade-out' : 'bstage-fade-in'}`}
      >
        {logOpen ? 'Hide Log' : 'Show Log'}
      </button>

      <div className={`bstage-action-panel bg-white/95 border border-[#c9a87a] rounded-xl p-[7px] ${banner ? 'bstage-fade-out' : 'bstage-fade-in'}`}>
        {actionPanel}
      </div>
    </div>
  );

  // Rendered as a real fixed-viewport layer rather than inside the scaled
  // canvas — the canvas is logically capped at 504px tall (then scaled down
  // further to fit), which left no room for a longer question/answers modal
  // without it scrolling. Sizing against the actual viewport instead gives
  // it much more headroom regardless of how small the canvas is scaled.
  const overlayLayer = overlay && (
    <div className="stage-overlay bg-[#0a0807]/70">
      {overlay}
    </div>
  );

  if (isMobile) {
    return (
      <>
        <div className="fixed inset-0 z-[75] flex items-center justify-center" style={{ background: 'var(--background)' }}>
          <div className="bstage-scale-inner" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, transform: `scale(${scale})`, transformOrigin: 'center center' }}>
            {canvas}
          </div>
        </div>
        {overlayLayer}
      </>
    );
  }

  return (
    <>
      <div ref={shellRef} className="bstage-shell mx-auto" style={{ height: CANVAS_HEIGHT * scale }}>
        <div className="bstage-scale-inner" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, transform: `scale(${scale})` }}>
          {canvas}
        </div>
      </div>
      {overlayLayer}
    </>
  );
}
