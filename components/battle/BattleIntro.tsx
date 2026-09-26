'use client';
// components/battle/BattleIntro.tsx
// "VS" card shown over the battle stage while BattleStage preloads every
// image the fight needs (both teams' curio art, the stage background,
// element/status icons). Purely presentational — BattleStage owns the
// loading + minimum-duration logic (lib/battleIntro.ts) and tells this when
// to leave. Covers the whole stage, so nothing underneath can be tapped.
//
// Choreography (all CSS, see the .bintro-* rules in app/globals.css), timed
// to fit the 3s minimum and borrowing the battle stage's attack visuals so
// the intro reads as the fight's first beat:
//   0.00s  two slanted panels in each lead's ELEMENT color slam in
//   0.30s  both curios dash in from off-screen, landing with a shake
//   0.80s  "VS" slams down: white flash + shockwave ring + spark burst,
//          then a random flavor tagline pops in above it
//   1.50s  clash — both curios lunge; element streaks collide at the VS
//   after  auras pulse and light rays turn behind the VS; once loaded and
//          past the minimum, the loading bar becomes a Ready button and the
//          intro waits for the player (PvP: counts down and starts itself)
import { useEffect, useState, type CSSProperties } from 'react';
import GameButton, { questButtonFontFamily, questButtonLetterSpacing, questTextShadowStyle, questTextStyle } from '@/components/GameButton';
import { woodTextureStyle, Nail } from '@/components/battle/MonsterHpPanel';
import type { Element } from '@/lib/monsterConfig';
import { pickBattleIntroTagline } from '@/lib/battleIntro';

export interface IntroSide {
  trainerName: string;
  leadName: string;
  leadSpriteUrl: string;
  teamSize: number;
  element: Element;
}

// [light, mid, dark] — the same element palette the Phaser stage's bursts
// use (BURST_TINTS in lib/phaserBattle/BattleStageScene.ts).
const ELEMENT_COLORS: Record<Element, [string, string, string]> = {
  fire: ['#ffe066', '#ff8a1a', '#b3260a'],
  water: ['#e0f7ff', '#5cc8ff', '#1a4f9e'],
  leaf: ['#eaffb0', '#7ad44a', '#23661f'],
  storm: ['#ffffcc', '#ffe14a', '#8a7800'],
  shadow: ['#c9a6ff', '#7a3cff', '#2a0a55'],
  light: ['#ffffff', '#fff1a8', '#c9951a'],
};

const SPARKS = 14;

function OutlinedText({ text, size, color = '#ffffff' }: { text: string; size: number; color?: string }) {
  return (
    <span style={{ position: 'relative', display: 'inline-block', fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing, fontSize: size, lineHeight: 1.1 }}>
      <span aria-hidden style={questTextShadowStyle}>{text}</span>
      <span style={{ ...questTextStyle, color }}>{text}</span>
    </span>
  );
}

function Contender({ side, mirrored, slideClass }: { side: IntroSide; mirrored: boolean; slideClass: string }) {
  const [light, mid] = ELEMENT_COLORS[side.element];
  return (
    <div className={`bintro-side flex flex-col items-center gap-2 ${slideClass}`}>
      <div className="relative bintro-lunge">
        <span aria-hidden className="bintro-aura" style={{ background: `radial-gradient(circle, ${light}cc 0%, ${mid}66 40%, transparent 70%)` }} />
        <img
          src={side.leadSpriteUrl}
          alt={side.leadName}
          className="bintro-sprite relative object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.55)]"
          // All curio art faces right; the opponent's is mirrored to face in.
          style={mirrored ? { transform: 'scaleX(-1)' } : undefined}
          draggable={false}
        />
      </div>
      <OutlinedText text={side.leadName} size={18} />
      <div
        className="relative border-2 border-[#4a2f18] rounded-lg px-4 py-1 text-[12px] font-bold text-[#f3dfb4] uppercase tracking-wide"
        style={{ boxShadow: '0 0 0 2px #d4a017', ...woodTextureStyle }}
      >
        {side.trainerName}
        <span className="ml-2 text-[#fde68a]">{side.teamSize} {side.teamSize === 1 ? 'curio' : 'curios'}</span>
      </div>
    </div>
  );
}

// Ready button: appears once everything's loaded and the minimum time has
// passed. With autoStartMs (PvP), it counts down and fires onReady itself.
function ReadyButton({ onReady, autoStartMs }: { onReady: () => void; autoStartMs?: number }) {
  const [left, setLeft] = useState(autoStartMs ? Math.ceil(autoStartMs / 1000) : null);
  useEffect(() => {
    if (left === null) return;
    if (left <= 0) { onReady(); return; }
    const t = setTimeout(() => setLeft(n => (n === null ? null : n - 1)), 1000);
    return () => clearTimeout(t);
  }, [left, onReady]);
  return (
    <div className="bintro-ready">
      <GameButton variant="quest" color="#d4a017" onClick={onReady} autoFocus style={{ fontSize: 22, minWidth: 200 }}>
        {left === null ? 'Ready' : `Ready ${left}`}
      </GameButton>
    </div>
  );
}

export default function BattleIntro({ left, right, progress, leaving, showReady, onReady, autoStartMs }: {
  left: IntroSide;
  right: IntroSide;
  progress: number; // 0..1
  leaving: boolean;
  showReady: boolean;
  onReady: () => void;
  autoStartMs?: number;
}) {
  const pct = Math.round(Math.max(0, Math.min(1, progress)) * 100);
  // One random flavor line per intro (lib/battleIntro.ts) — picked once on
  // mount so it doesn't change mid-intro.
  const [tagline] = useState(pickBattleIntroTagline);
  const L = ELEMENT_COLORS[left.element];
  const R = ELEMENT_COLORS[right.element];
  // Element colors flow into the CSS as custom properties.
  const vars = {
    '--bi-left-light': L[0], '--bi-left-mid': L[1], '--bi-left-dark': L[2],
    '--bi-right-light': R[0], '--bi-right-mid': R[1], '--bi-right-dark': R[2],
  } as CSSProperties;
  return (
    <div
      className={`bintro ${leaving ? 'bintro-leaving' : ''}`}
      style={vars}
      role="status"
      aria-live="polite"
      aria-label={pct < 100 ? `Loading battle, ${pct}%` : 'Battle ready'}
    >
      {/* Element panels + speed lines behind everything. */}
      <div aria-hidden className="bintro-panel bintro-panel-left"><span className="bintro-speed" /></div>
      <div aria-hidden className="bintro-panel bintro-panel-right"><span className="bintro-speed" /></div>

      <div className="bintro-shake">
        <div className="bintro-row">
          {/* Portrait stacks these vertically with the opponent on top (CSS
              order), matching where each side stands on the portrait stage. */}
          <div className="bintro-slot bintro-slot-left">
            <Contender side={left} mirrored={false} slideClass="bintro-slide-left" />
          </div>
          <div className="bintro-vs">
            <span aria-hidden className="bintro-rays" />
            {/* Clash streaks: each side's element energy racing into the VS. */}
            <span aria-hidden className="bintro-streak bintro-streak-left" />
            <span aria-hidden className="bintro-streak bintro-streak-right" />
            <span aria-hidden className="bintro-ring" />
            <span aria-hidden className="bintro-ring bintro-ring-2" />
            <span aria-hidden className="bintro-sparks">
              {Array.from({ length: SPARKS }, (_, i) => (
                <span key={i} style={{ '--bi-a': `${(360 / SPARKS) * i}deg`, '--bi-c': i % 2 ? 'var(--bi-left-mid)' : 'var(--bi-right-mid)' } as CSSProperties} />
              ))}
            </span>
            <span className="bintro-tagline"><OutlinedText text={tagline} size={16} /></span>
            <span className="bintro-vs-text"><OutlinedText text="VS" size={64} color="#fcd34d" /></span>
          </div>
          <div className="bintro-slot bintro-slot-right">
            <Contender side={right} mirrored slideClass="bintro-slide-right" />
          </div>
        </div>
      </div>

      <div aria-hidden className="bintro-flash" />

      {showReady ? <ReadyButton onReady={onReady} autoStartMs={autoStartMs} /> : (
      <div className="bintro-loader">
        <div
          className="relative border-2 border-[#4a2f18] rounded-full p-[3px]"
          style={{ boxShadow: '0 0 0 2px #d4a017', ...woodTextureStyle }}
        >
          <Nail className="-top-1 -left-1" />
          <Nail className="-top-1 -right-1" />
          <div className="h-[12px] rounded-full bg-[#0a0807] overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-300 ease-out"
              style={{ width: `${pct}%`, background: 'linear-gradient(180deg,#fde68a 0%,#f5c542 55%,#b8860b 100%)' }}
            />
          </div>
        </div>
        <p className="mt-2 text-center text-[12px] font-bold uppercase tracking-wider text-[#f3dfb4]">
          {pct < 100 ? 'Getting the battle ready' : 'Almost there'}
        </p>
      </div>
      )}
    </div>
  );
}
