'use client';
// hooks/useTutorialSequence.ts
//
// Sequencing logic for a real-UI, spotlight-style tutorial (see
// components/TutorialSpotlight.tsx). Deliberately has no opinion on *how*
// "already seen" is persisted — callers pass `active` (computed however
// they like: a Supabase column, lib/tutorial.ts's localStorage flags,
// whatever) and get told when the sequence finishes so they can persist
// that themselves. This keeps the board tab's server-tracked onboarding gate
// and other tabs' localStorage gate (lib/tutorial.ts) both able to reuse the
// same stepping/auto-advance behavior.
//
// State updates happen inside useEffect, guarded by a ref mirroring the
// previous input — NOT as "adjust state during render" (comparing against a
// mirrored useState). That pattern reads fine in isolation, but Dashboard
// re-renders very frequently for reasons unrelated to this hook (live
// presence/polling elsewhere on the page), and render-phase setState calls
// there intermittently tripped React's "Maximum update depth exceeded"
// safety limit. Plain effects only re-run when their own dependencies
// genuinely change, so they're immune to how often the parent re-renders.

import { useEffect, useRef, useState } from 'react';
import { trackEvent } from '@/lib/analytics';

export interface TutorialStep {
  id: string; // must match a data-tutorial-id on the real element to spotlight
  title: string;
  body: string;
  // When present, the step completes itself once this flips true — a real
  // action the kid took (opened a quest, entered a battle) — instead of
  // waiting for a "Next" click. Recompute it fresh from live state each
  // render; the hook only reacts to it changing to true.
  waitFor?: boolean;
}

interface UseTutorialSequenceOptions {
  tabKey: string;
  active: boolean; // gate: should the sequence be showing at all right now
  steps: TutorialStep[];
  onDone: (reason: 'completed' | 'skipped') => void;
}

export function useTutorialSequence({ tabKey, active, steps, onDone }: UseTutorialSequenceOptions) {
  const [stepIndex, setStepIndex] = useState(0);
  const [result, setResult] = useState<'completed' | 'skipped' | null>(null);

  // Reset to the first step (and clear any prior result) whenever a new
  // sequence starts — active flips false→true.
  const prevActiveRef = useRef(active);
  useEffect(() => {
    if (active === prevActiveRef.current) return;
    prevActiveRef.current = active;
    if (active) {
      // Guarded by the ref above so this only fires once per genuine active
      // flip, not on every re-render — see this file's header comment.
      /* eslint-disable react-hooks/set-state-in-effect */
      setStepIndex(0);
      setResult(null);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [active]);

  const currentStep = active ? steps[stepIndex] : undefined;

  // Auto-advance once a step's real-world condition becomes true.
  const waitFor = currentStep?.waitFor ?? false;
  const prevWaitForRef = useRef(waitFor);
  useEffect(() => {
    if (waitFor === prevWaitForRef.current) return;
    prevWaitForRef.current = waitFor;
    if (waitFor) {
      // Guarded by the ref above so this only fires once per genuine
      // waitFor flip.
      /* eslint-disable react-hooks/set-state-in-effect */
      setStepIndex((i) => {
        if (i >= steps.length - 1) {
          setResult('completed');
          return i;
        }
        return i + 1;
      });
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [waitFor, steps.length]);

  // Genuine side effects only — analytics + the caller's onDone (usually a
  // network write).
  useEffect(() => {
    if (!result) return;
    trackEvent(result === 'completed' ? 'tab_tutorial_completed' : 'tab_tutorial_skipped', { tab: tabKey, atStep: stepIndex });
    onDone(result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  useEffect(() => {
    if (!active || !currentStep) return;
    trackEvent('tab_tutorial_step_viewed', { tab: tabKey, step: stepIndex, stepId: currentStep.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, tabKey, stepIndex, currentStep?.id]);

  const next = () => {
    if (stepIndex >= steps.length - 1) setResult('completed');
    else setStepIndex(stepIndex + 1);
  };

  const skip = () => setResult('skipped');

  return {
    step: currentStep,
    stepIndex,
    totalSteps: steps.length,
    isLast: stepIndex === steps.length - 1,
    next,
    skip,
  };
}
