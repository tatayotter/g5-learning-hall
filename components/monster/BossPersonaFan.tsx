'use client';
// components/monster/BossPersonaFan.tsx
// Term Boss persona picker, styled like a fighting-game character-select
// carousel: the centered card is large and upright, the rest fan out and
// rotate away symmetrically on both sides, dimming/shrinking with distance.
// Prototyped as an interactive mockup before this build — see that session
// for why elements must persist across re-renders rather than being
// recreated (otherwise CSS transitions have nothing to interpolate from and
// the fan just jump-cuts instead of animating). React's key-based
// reconciliation gives us that for free here as long as each card keeps a
// stable key (persona.subject).
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { BossPersona } from '@/lib/bossPersonas';

interface BossPersonaFanProps {
  personas: BossPersona[];
  defeated: Set<string>;
  readySubjects: Set<string>;
  onChallenge: (subject: string) => void;
}

function shortestDelta(i: number, cur: number, n: number) {
  let d = i - cur;
  if (d > n / 2) d -= n;
  if (d < -n / 2) d += n;
  return d;
}

export default function BossPersonaFan({ personas, defeated, readySubjects, onChallenge }: BossPersonaFanProps) {
  const [idx, setIdx] = useState(0);
  const n = personas.length;
  if (n === 0) return null;

  const active = personas[Math.min(idx, n - 1)];

  return (
    <div>
      <p className="min-h-[1.5rem] max-w-md mx-auto text-center text-xs text-gray-400 mb-2 leading-snug transition-opacity duration-300" key={active.subject}>
        {active.loreShort}
      </p>

      <div className="relative w-full" style={{ height: 245 }}>
        {personas.map((p, i) => {
          const d = shortestDelta(i, idx, n);
          const show = Math.abs(d) <= 4;
          const isCenter = d === 0;
          const isDefeated = defeated.has(p.subject);
          const isReady = readySubjects.has(p.subject);
          const spacing = 62;
          const rotate = d * 11;
          const x = d * spacing;
          const y = Math.abs(d) * 14;
          const scale = isCenter ? 1.15 : Math.max(0.6, 1 - Math.abs(d) * 0.14);
          const bright = isDefeated ? (isCenter ? 0.6 : 0.4) : (isCenter ? 1 : Math.max(0.4, 0.92 - Math.abs(d) * 0.14));
          const portraitSize = isCenter ? 66 : 50;

          return (
            <div
              key={p.subject}
              onClick={() => { if (!isCenter && show) setIdx(i); }}
              className="absolute bottom-0 left-1/2 rounded-2xl border-2 flex flex-col items-center justify-end p-3 transition-all duration-[400ms] ease-out"
              style={{
                width: 150, height: 210,
                transform: `translateX(calc(-50% + ${x}px)) translateY(${y}px) rotate(${rotate}deg) scale(${scale})`,
                transformOrigin: 'bottom center',
                background: 'linear-gradient(180deg,#1e1826,#100c14)',
                borderColor: isCenter ? p.glowColor : 'rgba(255,255,255,0.14)',
                zIndex: show ? 50 - Math.abs(d) : 0,
                opacity: show ? 1 : 0,
                filter: `brightness(${bright})${isDefeated ? ' grayscale(0.6)' : ''}`,
                pointerEvents: show ? 'auto' : 'none',
                boxShadow: isCenter ? '0 10px 24px rgba(0,0,0,.55)' : '0 4px 10px rgba(0,0,0,.55)',
                cursor: isCenter ? 'default' : 'pointer',
              }}
            >
              <div className="relative mb-2" style={{ width: portraitSize, height: portraitSize }}>
                <div className="boss-glow" style={{ '--glow': p.glowColor } as CSSProperties} />
                <img
                  src={p.artUrl}
                  alt={p.name}
                  className={`relative w-full h-full object-contain ${isDefeated ? 'grayscale' : ''}`}
                />
                {isDefeated && (
                  <div
                    className="absolute -top-2 left-1/2 -translate-x-1/2 -rotate-6 bg-black/75 border border-white/30 text-white text-[9px] font-bold tracking-wide px-2 py-0.5 rounded whitespace-nowrap"
                    style={{ opacity: isCenter ? 1 : 0.75 }}
                  >
                    DEFEATED
                  </div>
                )}
              </div>
              <p className="text-white font-bold text-center leading-tight" style={{ fontSize: isCenter ? 12 : 11, opacity: isCenter ? 1 : 0.65 }}>
                {p.name}
              </p>
              <p style={{ color: p.glowColor, fontSize: isCenter ? 10 : 9, opacity: isCenter ? 1 : 0.65, marginBottom: 8 }}>
                {p.subject}
              </p>
              {isCenter && (
                <button
                  onClick={(e) => { e.stopPropagation(); if (!isDefeated && isReady) onChallenge(p.subject); }}
                  disabled={isDefeated || !isReady}
                  className="w-full py-1.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wide transition-colors"
                  style={{
                    background: isDefeated || !isReady ? 'rgba(255,255,255,0.12)' : p.glowColor,
                    color: isDefeated || !isReady ? 'rgba(255,255,255,0.5)' : '#141018',
                    cursor: isDefeated || !isReady ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isDefeated ? 'Defeated' : isReady ? 'Challenge' : 'Not ready'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-5 mt-2">
        <button
          onClick={() => setIdx(i => (i - 1 + n) % n)}
          aria-label="Previous boss"
          className="w-9 h-9 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 text-white transition-colors"
        >
          ‹
        </button>
        <span className="text-[11px] text-gray-500 min-w-[50px] text-center">{idx + 1} of {n}</span>
        <button
          onClick={() => setIdx(i => (i + 1) % n)}
          aria-label="Next boss"
          className="w-9 h-9 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 text-white transition-colors"
        >
          ›
        </button>
      </div>
    </div>
  );
}
