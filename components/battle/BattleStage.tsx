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
import { useState, ReactNode } from 'react';
import { MonsterDef, StatusEffect } from '@/lib/monsterConfig';
import { MonsterImage, DamageNumber, AttackBanner } from '@/components/battle/shared';
import MonsterHpPanel from '@/components/battle/MonsterHpPanel';
import { useStageScale } from '@/hooks/useStageScale';
import { QualityTier, getQualityGlowClass } from '@/lib/curioQuality';
import GameButton from '@/components/GameButton';

export interface BattleStageMonster {
  name: string;
  level: number;
  def: MonsterDef;
  currentHp: number;
  maxHp: number;
  status: StatusEffect;
  animClassName?: string;
  damagePopup?: { key: number; value: number; missed: boolean } | null;
  quality?: QualityTier; // absent for NPC trainers, which have no quality tier
}

interface BattleStageProps {
  leftName: string;
  rightName: string;
  leftMon: BattleStageMonster;
  rightMon: BattleStageMonster;
  roundBadge?: string | null;
  log: string[];
  banner?: { text: string; iconSrc: string | null } | null;
  statusBanner?: ReactNode;
  actionPanel: ReactNode;
  overlay?: ReactNode;
}

function Creature({ mon, side }: { mon: BattleStageMonster; side: 'left' | 'right' }) {
  return (
    <div className={`bstage-creature ${side}`}>
      {/* Sprite must come first in DOM order to lay out above the platform
          in this column flex (layout order = document order); it paints in
          front of the platform where they overlap via z-index instead —
          both need `position: relative` for z-index to take effect at all,
          since document order alone would otherwise make the *later*
          element (platform) paint on top. */}
      <div className={`relative ${mon.animClassName ?? ''}`}>
        {/* The enemy (right side) sprite is mirrored to face the player —
            only the image flips; the damage popup below is a sibling, not a
            child, so it stays readable instead of mirroring with it. */}
        <div
          className={`bstage-sprite ${mon.quality ? getQualityGlowClass(mon.quality) : ''}`}
          style={side === 'right' ? { transform: 'scaleX(-1)' } : undefined}
        >
          <MonsterImage monster={mon.def} className="w-full h-full battle-float" emojiClassName="text-6xl" />
        </div>
        {mon.damagePopup && (
          <DamageNumber key={mon.damagePopup.key} value={mon.damagePopup.value} missed={mon.damagePopup.missed} />
        )}
      </div>
      <div className="bstage-platform">
        <img src="/battleui/battle_platform.webp" alt="" draggable={false} />
      </div>
    </div>
  );
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
      onClick={onClick}
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

const CANVAS_WIDTH = 896;
const CANVAS_HEIGHT = 504;

export default function BattleStage({
  leftName, rightName, leftMon, rightMon, roundBadge, log, banner, statusBanner, actionPanel, overlay,
}: BattleStageProps) {
  const [logOpen, setLogOpen] = useState(false);
  const { shellRef, scale, isMobile } = useStageScale(CANVAS_WIDTH, CANVAS_HEIGHT);

  const canvas = (
    <div
      className={`bstage-container border-2 border-[#0a0807] ${logOpen ? 'log-open' : ''}`}
      style={{
        backgroundImage: 'url(/battleui/battle_bg_normal.webp)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="bstage-top-tags">
        <div className="bg-[#0a0807]/70 text-[#ffffff] font-bold text-[13px] px-3 py-1 rounded-br-lg truncate max-w-[38%]">
          {leftName}
        </div>
        <div className="bg-[#0a0807]/70 text-[#ffffff] font-bold text-[13px] px-3 py-1 rounded-bl-lg truncate max-w-[38%]">
          {rightName}
        </div>
      </div>

      {roundBadge && (
        <div className="bstage-round-badge bg-[#0a0807]/60 text-amber-400 font-mono text-xs font-bold px-2 py-0.5 rounded-full">
          {roundBadge}
        </div>
      )}

      <div className="bstage-hp-row">
        <MonsterHpPanel name={leftMon.name} level={leftMon.level} currentHp={leftMon.currentHp} maxHp={leftMon.maxHp} status={leftMon.status} />
        <MonsterHpPanel name={rightMon.name} level={rightMon.level} currentHp={rightMon.currentHp} maxHp={rightMon.maxHp} status={rightMon.status} />
      </div>

      <div className="bstage-stage">
        <Creature mon={leftMon} side="left" />
        <Creature mon={rightMon} side="right" />
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
        onClick={() => setLogOpen(o => !o)}
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
          <div className="bstage-scale-inner" style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
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
        <div className="bstage-scale-inner" style={{ transform: `scale(${scale})` }}>
          {canvas}
        </div>
      </div>
      {overlayLayer}
    </>
  );
}
