'use client';
// components/intro/GlowCta.tsx
// Animated "tap me" glow for the intro's buttons. Main calls to action get a
// breathing radial halo, a ripple ring and a gentle pulse (wrap them in
// <GlowCta>); smaller choice buttons (guild tokens, letter tiles, the stair
// numbers, the next oath line) take the softer `intro-choice-glow` class.
// Include GLOW_CSS once in any screen that uses either.
import type { ReactNode } from 'react';

export const GLOW_CSS = `
.intro-cta-glow { position: absolute; inset: -38px -64px; border-radius: 9999px; pointer-events: none;
  background: radial-gradient(closest-side, rgba(255,240,170,1), rgba(255,205,80,0.75) 40%, rgba(245,170,40,0.3) 70%, rgba(245,170,40,0) 100%);
  mix-blend-mode: screen;
  animation: intro-cta-breathe 1.8s ease-in-out infinite; }
@keyframes intro-cta-breathe { 0%, 100% { opacity: 0.6; transform: scale(0.9); } 50% { opacity: 1; transform: scale(1.12); } }
.intro-cta-ring { position: absolute; inset: -5px; border-radius: 9999px; pointer-events: none;
  border: 3px solid rgba(255,236,160,1); box-shadow: 0 0 14px rgba(255,210,90,0.9), inset 0 0 8px rgba(255,210,90,0.6);
  animation: intro-cta-ripple 1.8s ease-out infinite; }
@keyframes intro-cta-ripple { 0% { opacity: 0.9; transform: scale(0.97); } 100% { opacity: 0; transform: scale(1.3); } }
.intro-cta-pulse { animation: intro-cta-pulse 1.8s ease-in-out infinite; }
@keyframes intro-cta-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
.intro-choice-glow { animation: intro-choice-glow 1.8s ease-in-out infinite; }
@keyframes intro-choice-glow {
  0%, 100% { filter: drop-shadow(0 0 2px rgba(255,214,102,0.35)); }
  50% { filter: drop-shadow(0 0 12px rgba(255,214,102,0.95)); } }
@media (prefers-reduced-motion: reduce) {
  .intro-cta-glow, .intro-cta-ring, .intro-cta-pulse, .intro-choice-glow { animation: none; }
  .intro-cta-ring { opacity: 0; }
}
`;

export default function GlowCta({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`relative inline-flex items-center justify-center ${className}`}>
      <span aria-hidden className="intro-cta-glow" />
      <span aria-hidden className="intro-cta-ring" />
      <span className="relative intro-cta-pulse w-full flex justify-center">{children}</span>
    </span>
  );
}
