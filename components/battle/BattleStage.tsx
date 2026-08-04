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
export function ActionTile({ icon, title, sub, onClick, disabled, danger }: {
  icon: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 text-left bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-amber-500 rounded-lg px-2 py-[7px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-neutral-700 btn-tactile"
    >
      <span className="w-[34px] h-[34px] flex items-center justify-center flex-shrink-0">
        {icon}
      </span>
      <span className="min-w-0">
        <span className={`flex items-center gap-1 text-[13px] font-extrabold leading-tight ${danger ? 'text-red-400' : 'text-white'}`}>{title}</span>
        {sub && <span className="block text-[11px] text-gray-400 truncate">{sub}</span>}
      </span>
    </button>
  );
}

// Placeholder tile for a locked or unequipped skill slot — keeps the moves
// grid at a steady 3 columns instead of collapsing/reflowing around a hole.
export function PlaceholderTile({ title, sub }: { title: ReactNode; sub: ReactNode }) {
  return (
    <div className="rounded-lg border-2 border-dashed border-neutral-800 bg-neutral-950/50 px-2 py-[7px] opacity-60 flex items-center min-h-[52px]">
      <span className="min-w-0">
        <span className="block text-[13px] font-bold text-gray-500 truncate">{title}</span>
        <span className="block text-[10px] text-amber-500/80 truncate">{sub}</span>
      </span>
    </div>
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
      className={`bstage-container border-2 border-black ${logOpen ? 'log-open' : ''}`}
      style={{
        backgroundImage: 'url(/battleui/battle_bg_normal.webp)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="bstage-top-tags">
        <div className="bg-black/70 text-white font-bold text-[13px] px-3 py-1 rounded-br-lg truncate max-w-[38%]">
          {leftName}
        </div>
        <div className="bg-black/70 text-white font-bold text-[13px] px-3 py-1 rounded-bl-lg truncate max-w-[38%]">
          {rightName}
        </div>
      </div>

      {roundBadge && (
        <div className="bstage-round-badge bg-black/60 text-amber-400 font-mono text-xs font-bold px-2 py-0.5 rounded-full">
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

      <div className={`bstage-log-panel bg-black/95 ${logOpen ? 'open border-2 border-neutral-700' : ''} ${banner ? 'bstage-fade-out' : 'bstage-fade-in'}`}>
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-neutral-800 text-[11px] font-bold uppercase tracking-wide text-gray-400 flex-shrink-0">
          <span>Battle Log</span>
        </div>
        <div className="bstage-log-content px-2.5 py-1.5 space-y-1">
          {log.map((msg, i) => (
            <p key={i} className="text-[11px] text-gray-300 bg-neutral-900 border border-neutral-800 rounded px-2 py-1">{msg}</p>
          ))}
        </div>
      </div>

      <button
        onClick={() => setLogOpen(o => !o)}
        className={`bstage-show-log bg-neutral-800 hover:bg-neutral-700 text-gray-200 font-bold text-[11px] ${banner ? 'bstage-fade-out' : 'bstage-fade-in'}`}
      >
        {logOpen ? 'Hide Log' : 'Show Log'}
      </button>

      <div className={`bstage-action-panel bg-neutral-900/95 border border-neutral-700 rounded-xl p-[7px] ${banner ? 'bstage-fade-out' : 'bstage-fade-in'}`}>
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
    <div className="stage-overlay bg-black/70">
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
