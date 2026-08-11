'use client';
// components/BossCutscene.tsx
// Opening cutscene for the moment the Term Boss event goes active — plays
// once per player per grade/term (gated in app/page.tsx via
// hasCutsceneBeenSeen/markCutsceneSeen from lib/bossPersonas.ts).
//
// Two tap-gated attention-check beats come first, on purpose: a kid who's
// tabbed away or isn't looking has to actually engage twice before anything
// auto-plays, rather than the reveal just running past an empty room. Only
// after that does the auto-playing reveal take over: a whisper line, dimmed
// persona portraits rising out of the mist, a title card, then the CTA.
// Skip is always available and jumps straight to the end state.
//
// Styled to match the rest of the Term Boss feature rather than as its own
// standalone look: same dark-brown/purple/amber palette and font-display
// headings as BossVictoryPopup.tsx and BossFightScreen.tsx's loss screen,
// and the exact same BackgroundPersonas treatment the battle screen uses for
// its backdrop roster (imported directly, not re-implemented smaller here).
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { BossPersona } from '@/lib/bossPersonas';
import { BackgroundPersonas } from '@/components/monster/BossFightScreen';
import { playPageFlip, playNearbyWhoosh, playMonsterAppear } from '@/lib/sounds';

interface BossCutsceneProps {
  personas: BossPersona[];
  onDismiss: () => void;
}

type Step = 'prompt1' | 'prompt2' | 'reveal';

// Reveal phase gates, ms after entering the 'reveal' step:
// 1 = whisper line in, 2 = portraits in, 3 = line out / title card in, 4 = CTA + Continue in.
const REVEAL_DELAYS = [400, 2700, 5000, 7300];

const promptButtonClass =
  'relative bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs uppercase tracking-wide px-6 py-2.5 rounded-lg border-2 border-black transition-colors';

export default function BossCutscene({ personas, onDismiss }: BossCutsceneProps) {
  const [step, setStep] = useState<Step>('prompt1');
  const [revealPhase, setRevealPhase] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const playedAppearSfx = useRef(false);

  useEffect(() => {
    if (step !== 'reveal') return;
    REVEAL_DELAYS.forEach((ms, i) => {
      timers.current.push(setTimeout(() => setRevealPhase(p => Math.max(p, i + 1)), ms));
    });
    return () => { timers.current.forEach(clearTimeout); timers.current = []; };
  }, [step]);

  useEffect(() => {
    if (revealPhase >= 2 && !playedAppearSfx.current) {
      playedAppearSfx.current = true;
      playMonsterAppear();
    }
  }, [revealPhase]);

  const skip = () => {
    timers.current.forEach(clearTimeout);
    playedAppearSfx.current = true;
    setStep('reveal');
    setRevealPhase(4);
  };

  const showcasePersonas = personas.slice(0, 6);

  return (
    <div className="fixed inset-0 z-[100] bg-[#1a1208] flex flex-col items-center justify-center p-8 text-center overflow-hidden">
      <div className="pointer-events-none" aria-hidden="true">
        <div className="boss-mist-layer boss-mist-layer--a" style={{ '--mist-density': 1 } as CSSProperties} />
        <div className="boss-mist-layer boss-mist-layer--b" style={{ '--mist-density': 1 } as CSSProperties} />
        <div className="boss-mist-layer boss-mist-layer--c" style={{ '--mist-density': 1 } as CSSProperties} />
      </div>

      <div className="absolute inset-3 border-2 border-purple-700/60 rounded-2xl pointer-events-none" aria-hidden="true" />

      <button
        onClick={skip}
        className="absolute top-5 right-5 text-[11px] font-bold uppercase tracking-wide text-gray-300 bg-black/40 border-2 border-black rounded-lg px-3 py-1.5 hover:bg-black/60 transition-colors"
      >
        Skip
      </button>

      {showcasePersonas.length > 0 && (
        <div
          className="absolute inset-0 transition-opacity duration-[1400ms]"
          style={{ opacity: step === 'reveal' && revealPhase >= 2 ? 1 : 0 }}
        >
          <BackgroundPersonas personas={showcasePersonas} />
        </div>
      )}

      {step === 'prompt1' && (
        <>
          <p className="relative font-display text-purple-100 text-lg max-w-xs">Something feels weird.</p>
          <button
            onClick={() => { playPageFlip(); setStep('prompt2'); }}
            className={`${promptButtonClass} mt-5`}
          >
            Listen closely
          </button>
        </>
      )}

      {step === 'prompt2' && (
        <>
          <p className="relative font-display text-purple-100 text-lg max-w-xs">What is that?</p>
          <button
            onClick={() => { playNearbyWhoosh(); setStep('reveal'); }}
            className={`${promptButtonClass} mt-5`}
          >
            Move closer
          </button>
        </>
      )}

      {step === 'reveal' && (
        <>
          <p
            className="relative font-display text-purple-100 text-base italic max-w-xs transition-opacity duration-[1200ms]"
            style={{ opacity: revealPhase >= 1 && revealPhase < 3 ? 1 : 0 }}
          >
            Something is unraveling.
          </p>
          <h1
            className="relative font-display font-bold text-purple-200 text-3xl tracking-wide transition-opacity duration-[1200ms]"
            style={{ opacity: revealPhase >= 3 ? 1 : 0 }}
          >
            The Forgetting Stirs
          </h1>
          <p
            className="relative text-amber-200 text-xs font-bold uppercase tracking-wide mt-3 transition-opacity duration-[1200ms]"
            style={{ opacity: revealPhase >= 4 ? 1 : 0 }}
          >
            Defeat every persona to push it back.
          </p>
          <button
            onClick={onDismiss}
            className={`${promptButtonClass} mt-5 transition-opacity duration-[1200ms]`}
            style={{ opacity: revealPhase >= 4 ? 1 : 0, pointerEvents: revealPhase >= 4 ? 'auto' : 'none' }}
          >
            Continue
          </button>
        </>
      )}
    </div>
  );
}
