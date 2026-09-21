'use client';
// components/VictoryScreen.tsx
// Shared game-style "you did it" screen: wood + gold frame, spinning sun rays,
// slam-in title, star pop, count-up reward tiles, and slots for a bottom card
// (e.g. curio training) and the action buttons. Used by the main quest
// completion screens; meant to be reused for post-battle, journal-sealed,
// gauntlet results, etc. — pass different title/rewards/children instead of
// building a new screen.
//
// Honors prefers-reduced-motion: no rays spin, no slam/pop, no count-up, bar
// jumps straight to its final fill.
import { ReactNode, useEffect, useState } from 'react';
import { MonsterImage } from '@/components/battle/shared';
import { ALL_MONSTERS, BATTLE_CONSTANTS } from '@/lib/monsterConfig';
import {
  questButtonFontFamily, questButtonLetterSpacing, questButtonBoxShadow, questButtonDropShadow,
  questTextShadowStyle, questTextStyle,
} from '@/components/GameButton';
import { woodTextureStyle, Nail } from '@/components/battle/MonsterHpPanel';

export interface VictoryReward {
  label: string;
  value: number;
  unit?: string;
  icon: ReactNode;
  from: string; // tile gradient top
  to: string;   // tile gradient bottom
}

export interface TrainingResult {
  monsterId: string;
  name: string;
  exp: number;              // EXP just earned
  prevExp: number;          // curio's total EXP before
  newExp: number;           // and after
  leveledTo: number | null; // new level if it leveled up
}

const CSS = `
  .vs-rays { position:absolute; left:50%; top:-40%; width:180%; aspect-ratio:1; transform:translateX(-50%); pointer-events:none; opacity:.55;
    background:repeating-conic-gradient(from 0deg, rgba(245,197,66,.55) 0deg 8deg, transparent 8deg 24deg);
    -webkit-mask-image:radial-gradient(circle, #000 0%, transparent 62%); mask-image:radial-gradient(circle, #000 0%, transparent 62%);
    animation:vs-spin 40s linear infinite; }
  @keyframes vs-spin { to { transform:translateX(-50%) rotate(360deg); } }
  .vs-title { animation:vs-slam .55s cubic-bezier(.2,1.4,.4,1) both; }
  @keyframes vs-slam { 0% { transform:scale(2.2); opacity:0; } 100% { transform:scale(1); opacity:1; } }
  .vs-star { display:inline-block; width:52px; height:auto; image-rendering:pixelated; filter:drop-shadow(0 3px 0 rgba(0,0,0,.45));
    animation:vs-star .5s cubic-bezier(.2,1.6,.4,1) both; }
  .vs-star:nth-child(2) { width:68px; margin-top:-8px; }
  .vs-star-off { filter:grayscale(1) brightness(.85) drop-shadow(0 3px 0 rgba(0,0,0,.3)); opacity:.5; }
  @keyframes vs-star { 0% { transform:scale(0) rotate(-140deg); opacity:0; } 100% { transform:scale(1) rotate(0); } }
  .vs-rise { animation:vs-rise .5s ease-out both; }
  @keyframes vs-rise { 0% { transform:translateY(18px); opacity:0; } 100% { transform:translateY(0); opacity:1; } }
  .vs-tile { position:relative; overflow:hidden; min-width:132px; padding:10px 18px 12px; border:0.16em solid #000; border-radius:14px; color:#fff; }
  .vs-tile::after { content:''; position:absolute; top:6px; right:9px; width:16px; height:7px; border-radius:50%; background:rgba(255,255,255,.75); transform:rotate(10deg); }
  .vs-num { position:relative; font-size:34px; line-height:1; -webkit-text-stroke:.09em #000; paint-order:stroke fill; }
  .vs-label { position:relative; margin-top:2px; font-size:11px; letter-spacing:.08em; text-transform:uppercase; font-weight:900; color:rgba(255,255,255,.95);
    text-shadow:0 1px 0 rgba(0,0,0,.6); }
  .vs-pop { animation:vs-pop .45s cubic-bezier(.2,1.6,.4,1) both; }
  @keyframes vs-pop { 0% { transform:scale(.4); opacity:0; } 100% { transform:scale(1); opacity:1; } }
  .vs-fill { transition:width 1.1s cubic-bezier(.2,.8,.2,1); }
  .vs-lvl { animation:vs-bounce 1s ease-in-out .9s infinite; }
  @keyframes vs-bounce { 0%,100% { transform:translateY(0) rotate(-4deg); } 50% { transform:translateY(-4px) rotate(4deg); } }
  @media (prefers-reduced-motion: reduce) {
    .vs-rays, .vs-title, .vs-star, .vs-rise, .vs-pop, .vs-lvl { animation:none !important; }
    .vs-fill { transition:none !important; }
  }
`;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// 0 -> target count-up, so rewards feel like they are being paid out.
function useCountUp(target: number, delayMs: number, durMs = 900) {
  const reduced = prefersReducedMotion();
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const t = setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / durMs);
        setVal(Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delayMs);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); };
  }, [target, delayMs, durMs, reduced]);
  return reduced ? target : val;
}

// Ready-made reward icons so callers don't each redraw them.
export function XpIcon() {
  return <img src="/icons/stats/star.png" alt="" className="relative w-8 h-8" style={{ imageRendering: 'pixelated', filter: 'drop-shadow(0 2px 0 rgba(0,0,0,.5))' }} />;
}
export function GoldIcon() {
  return <img src="/icons/rewards/gold_coin.svg" alt="" className="relative w-8 h-8" style={{ filter: 'drop-shadow(0 2px 0 rgba(0,0,0,.5))' }} />;
}
export const XP_REWARD = { label: 'Experience', unit: ' XP', from: '#60a5fa', to: '#2563eb' } as const;
export const GOLD_REWARD = { label: 'Gold', from: '#fcd34d', to: '#d97706' } as const;

function RewardTile({ reward, delay }: { reward: VictoryReward; delay: number }) {
  const shown = useCountUp(reward.value, delay + 250);
  return (
    <div
      className="vs-tile vs-pop"
      style={{ animationDelay: `${delay}ms`, background: `linear-gradient(180deg, ${reward.from}, ${reward.to})`, fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing, boxShadow: questButtonBoxShadow }}
    >
      <div className="flex items-center justify-center gap-2">
        {reward.icon}
        <span className="vs-num">+{shown}{reward.unit ?? ''}</span>
      </div>
      <div className="vs-label" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>{reward.label}</div>
    </div>
  );
}

// Bottom card showing a curio's EXP bar filling — pass as a child of VictoryScreen.
export function CurioTrainingCard({ result }: { result: TrainingResult }) {
  const per = BATTLE_CONSTANTS.MONSTER_EXP_PER_LEVEL;
  const def = ALL_MONSTERS[result.monsterId];
  const level = Math.min(Math.floor(result.newExp / per) + 1, BATTLE_CONSTANTS.MONSTER_LEVEL_CAP);
  const prevPct = ((result.prevExp % per) / per) * 100;
  const newPct = ((result.newExp % per) / per) * 100;
  // Start at the old fill, then animate to the new one.
  const reduced = prefersReducedMotion();
  const [animatedPct, setPct] = useState(prevPct);
  useEffect(() => {
    if (reduced) return;
    const t = setTimeout(() => setPct(newPct), 900);
    return () => clearTimeout(t);
  }, [newPct, reduced]);
  const pct = reduced ? newPct : animatedPct;
  const gained = useCountUp(result.exp, 1000);

  return (
    <div
      className="vs-rise relative mx-auto max-w-md text-center rounded-lg border-2 border-[#4a2f18] px-4 py-3"
      style={{ animationDelay: '900ms', boxShadow: `0 0 0 3px #d4a017, ${questButtonDropShadow}`, ...woodTextureStyle }}
    >
      <Nail className="top-1 left-1" />
      <Nail className="top-1 right-1" />
      <Nail className="bottom-1 left-1" />
      <Nail className="bottom-1 right-1" />

      <p className="leading-tight mb-2" style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing, fontSize: 22 }}>
        <span style={{ position: 'relative', display: 'inline-block' }}>
          <span aria-hidden style={questTextShadowStyle}>Curio Training Complete</span>
          <span style={{ ...questTextStyle, color: '#f5c542' }}>Curio Training Complete</span>
        </span>
      </p>
      <div className="relative inline-block">
        <MonsterImage monster={def} className="w-24 h-24" emojiClassName="text-5xl" />
        {result.leveledTo && (
          <span className="vs-lvl absolute top-0 -right-6 text-[10px] font-black uppercase text-white rounded-full px-2 py-0.5 border-2 border-[#7a4a0f]"
            style={{ background: 'linear-gradient(180deg,#fb923c,#dc2626)' }}>Level up!</span>
        )}
      </div>
      <p className="leading-tight mt-1" style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing, fontSize: 24 }}>
        <span style={{ position: 'relative', display: 'inline-block' }}>
          <span aria-hidden style={questTextShadowStyle}>{result.name}</span>
          <span style={questTextStyle}>{result.name}</span>
        </span>
      </p>
      <p className="mb-2" style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing, fontSize: 16 }}>
        <span style={{ position: 'relative', display: 'inline-block' }}>
          <span aria-hidden style={questTextShadowStyle}>Lv.{level}</span>
          <span style={questTextStyle}>Lv.{level}</span>
        </span>
      </p>
      {/* Same bar as the battle HP card: dark track, white ring, label inside. */}
      <div className="relative h-[18px] max-w-xs mx-auto bg-[#0a0807] border-2 border-[#ffffff] rounded-full overflow-hidden">
        <div className="vs-fill h-full" style={{ width: `${pct}%`, background: 'linear-gradient(180deg,#86efac,#22c55e 55%,#15803d)' }} />
        <p
          className="absolute inset-0 flex items-center justify-center text-[#ffffff] text-[10px] leading-none"
          style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing, textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}
        >
          {result.newExp % per}/{per} EXP
        </p>
      </div>
      <p className="mt-2" style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing, fontSize: 20 }}>
        <span style={{ position: 'relative', display: 'inline-block' }}>
          <span aria-hidden style={questTextShadowStyle}>+{gained} EXP</span>
          <span style={{ ...questTextStyle, color: '#86efac' }}>+{gained} EXP</span>
        </span>
      </p>
    </div>
  );
}

interface VictoryScreenProps {
  title?: string;
  titleColor?: string;   // fill for the Bungee title (default green)
  subtitle?: ReactNode;
  stars?: number;        // earned stars out of 3 (default 3)
  rewards: VictoryReward[];
  children?: ReactNode;  // bottom card slot (e.g. <CurioTrainingCard />)
  actions: ReactNode;    // buttons row
}

export default function VictoryScreen({
  title = 'Quest Completed!', titleColor = '#4ade80', subtitle, stars = 3, rewards, children, actions,
}: VictoryScreenProps) {
  const rewardEnd = 700 + Math.max(0, rewards.length - 1) * 150;
  return (
    <div className="mb-6">
      <style>{CSS}</style>
      <div
        className="relative border-2 border-[#4a2f18] rounded-2xl p-3 sm:p-4"
        style={{ boxShadow: `0 0 0 3px #d4a017, ${questButtonDropShadow}`, ...woodTextureStyle }}
      >
        <Nail className="top-1.5 left-1.5" />
        <Nail className="top-1.5 right-1.5" />
        <Nail className="bottom-1.5 left-1.5" />
        <Nail className="bottom-1.5 right-1.5" />

        <div className="relative overflow-hidden rounded-xl px-4 sm:px-8 py-8 text-center" style={{ background: 'linear-gradient(180deg,#fffdf7 0%,#fbf3df 60%,#f0ddb8 100%)', border: '2px solid #c9a87a' }}>
          <div className="vs-rays" aria-hidden />

          <div className="relative">
            <h2 className="vs-title leading-tight mb-2" style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing, fontSize: 38 }}>
              <span style={{ position: 'relative', display: 'inline-block' }}>
                <span aria-hidden style={questTextShadowStyle}>{title}</span>
                <span style={{ ...questTextStyle, color: titleColor }}>{title}</span>
              </span>
            </h2>

            <div className="flex items-end justify-center gap-1 mb-2" role="img" aria-label={`${stars} of 3 stars`}>
              {[0, 1, 2].map(i => (
                <img key={i} src="/icons/stats/star.png" alt="" className={`vs-star ${i < stars ? '' : 'vs-star-off'}`} style={{ animationDelay: `${350 + i * 180}ms` }} />
              ))}
            </div>

            {subtitle && <p className="vs-rise font-display font-bold text-[#7a4a0f] mb-6" style={{ animationDelay: '600ms' }}>{subtitle}</p>}

            <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
              {rewards.map((r, i) => <RewardTile key={r.label} reward={r} delay={700 + i * 150} />)}
            </div>

            {children && <div className="mb-6">{children}</div>}

            <div className="vs-rise" style={{ animationDelay: `${children ? 1300 : rewardEnd + 300}ms` }}>
              {actions}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
