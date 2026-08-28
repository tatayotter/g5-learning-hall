'use client';
// components/TutorialSpotlight.tsx
//
// First-visit tutorial overlay that teaches against the REAL page instead of
// a floating slideshow. Give it a step ({id, title, body}) and it finds the
// live element tagged data-tutorial-id={step.id}, dims everything else, and
// draws a highlight ring + coachmark bubble around it. When
// `waitingForAction` is set, there's no "Next" button — the step only
// advances once the kid actually does the real thing (see
// hooks/useTutorialSequence.ts's `waitFor`).

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { TutorialStep } from '@/hooks/useTutorialSequence';

interface TutorialSpotlightProps {
  step: TutorialStep;
  stepIndex: number;
  totalSteps: number;
  isLast: boolean;
  onNext: () => void;
  onSkip: () => void;
  waitingForAction?: boolean;
}

const PAD = 10; // breathing room (px) between the highlight ring and the element

export default function TutorialSpotlight({
  step, stepIndex, totalSteps, isLast, onNext, onSkip, waitingForAction,
}: TutorialSpotlightProps) {
  // Keyed by step.id from the caller (see Dashboard.tsx), so this component
  // fully remounts on step change — rect naturally starts at null again
  // instead of needing an effect to reset it.
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    let raf: number;
    let attempts = 0;
    let scrolledIntoView = false;
    // The target may not exist in the DOM on this effect's very first tick —
    // tab content here crossfades in (AnimatePresence), so a tab switch can
    // still be mounting its new content a frame or two after this component
    // itself mounts. Poll for it instead of a one-shot lookup, bounded so a
    // genuinely-absent target (e.g. no open quest this week) still bails
    // cleanly instead of polling forever.
    const MAX_ATTEMPTS = 180; // ~3s at 60fps

    const tick = () => {
      const target = document.querySelector<HTMLElement>(`[data-tutorial-id="${step.id}"]`);
      if (!target) {
        attempts += 1;
        if (attempts < MAX_ATTEMPTS) raf = requestAnimationFrame(tick);
        return;
      }
      if (!scrolledIntoView) {
        target.scrollIntoView({ block: 'center', behavior: 'smooth' });
        scrolledIntoView = true;
      }
      // Re-measure every frame instead of listening for 'scroll'/'resize' —
      // Dashboard's layout scrolls an inner container (not window), and
      // hunting down which ancestor is the actual scroll parent is brittle.
      // A single element's getBoundingClientRect() is cheap enough to poll.
      setRect((prev) => {
        const next = target.getBoundingClientRect();
        if (prev && prev.top === next.top && prev.left === next.left
          && prev.width === next.width && prev.height === next.height) {
          return prev; // bail out of the re-render when nothing moved
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step.id]);

  // Target isn't mounted (e.g. content that depends on today's date/data) —
  // stay invisible and non-blocking rather than dimming the page with
  // nothing to point at.
  if (!rect) return null;

  const hole = {
    top: rect.top - PAD,
    left: rect.left - PAD,
    width: rect.width + PAD * 2,
    height: rect.height + PAD * 2,
  };

  const BUBBLE_WIDTH = 288;
  const BUBBLE_MAX_HEIGHT = 220; // rough ceiling — just for clamping into the viewport, not a hard layout cap
  const spaceBelow = window.innerHeight - (hole.top + hole.height);
  const placeAbove = spaceBelow < 180 && hole.top > 180;
  const bubbleLeft = Math.min(Math.max(hole.left, 16), window.innerWidth - BUBBLE_WIDTH - 16);
  // Always anchor with `top` (never `bottom`) and clamp into the viewport —
  // for a highlighted region taller than the screen (e.g. a whole tile
  // grid), "below the hole" or "above the hole" can land the bubble
  // entirely off-screen with nothing to scroll to, since this whole overlay
  // is `position: fixed`.
  const rawBubbleTop = placeAbove ? hole.top - 8 - BUBBLE_MAX_HEIGHT : hole.top + hole.height + 8;
  const bubbleTop = Math.min(Math.max(rawBubbleTop, 16), window.innerHeight - 16 - BUBBLE_MAX_HEIGHT);

  return (
    <div className="fixed inset-0 z-[90] pointer-events-none">
      {/* Dimmed backdrop with a cut-out "hole" over the target, via an oversized box-shadow */}
      <div
        className="absolute rounded-xl transition-all duration-150"
        style={{
          top: hole.top,
          left: hole.left,
          width: hole.width,
          height: hole.height,
          boxShadow: '0 0 0 9999px rgba(15,15,15,0.55)',
          outline: '2px solid #d97706',
          outlineOffset: 2,
        }}
      />

      <motion.div
        key={step.id}
        initial={{ opacity: 0, y: placeAbove ? 8 : -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute bg-white border border-gray-200 rounded-2xl p-4 shadow-2xl pointer-events-auto"
        style={{
          width: BUBBLE_WIDTH,
          left: bubbleLeft,
          top: bubbleTop,
        }}
      >
        <button
          type="button"
          onClick={onSkip}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-sm leading-none px-1"
          aria-label="Skip tutorial"
        >
          ✕
        </button>
        <h3 className="text-base font-bold text-gray-900 mb-1 font-display pr-4">{step.title}</h3>
        <p className="text-xs text-gray-500 leading-relaxed mb-3">{step.body}</p>

        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <span
                key={i}
                className={`h-1 rounded-full transition-all ${i === stepIndex ? 'w-4 bg-amber-500' : 'w-1 bg-gray-200'}`}
              />
            ))}
          </div>
          {waitingForAction ? (
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wide">Try it →</span>
          ) : (
            <button
              type="button"
              onClick={onNext}
              className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold px-4 py-1.5 rounded-lg transition-colors"
            >
              {isLast ? "Got it!" : 'Next'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
