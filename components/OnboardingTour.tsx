// components/OnboardingTour.tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface OnboardingStep {
  emoji: string;
  title: string;
  body: string;
}

const STEPS: OnboardingStep[] = [
  {
    emoji: '🗺️',
    title: 'Main Quests',
    body: "This is home base. Each weekday has study notes and a short quiz — clear them to earn XP and Gold.",
  },
  {
    emoji: '⚔️',
    title: 'Curio Arena',
    body: 'Battle trainers and wild Curios by answering questions correctly. Win battles to level up your team.',
  },
  {
    emoji: '🏛️',
    title: 'Learning Guilds',
    body: 'Five guilds, five skills — reading, typing, math, logic, and spelling. Play any of them for extra XP.',
  },
  {
    emoji: '🏪',
    title: 'Rewards Vault',
    body: 'Spend the Gold you earn on real rewards and in-game items.',
  },
  {
    emoji: '📖',
    title: 'Journal & Logs',
    body: 'Track daily reflections and see a full history of everything you\'ve earned.',
  },
];

interface OnboardingTourProps {
  onComplete: () => void;
}

export default function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md bg-[#1c1611] border border-[#3d3225] rounded-2xl p-8 text-center shadow-2xl"
      >
        <button
          type="button"
          onClick={onComplete}
          className="absolute top-3 right-3 text-[#8a7c66] hover:text-white transition-colors text-lg leading-none"
          aria-label="Skip tutorial"
        >
          ✕
        </button>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-5xl mb-4">{current.emoji}</div>
            <h2 className="text-xl font-bold text-[#ede4d3] mb-2 font-display">{current.title}</h2>
            <p className="text-sm text-[#d8cdb8] leading-relaxed">{current.body}</p>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-center gap-2 mt-6">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-5 bg-[#c9781a]' : 'w-1.5 bg-[#3d3225]'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between mt-6">
          <button
            type="button"
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className="text-sm font-bold text-[#8a7c66] hover:text-white disabled:opacity-0 transition-colors px-3 py-2"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={() => (isLast ? onComplete() : setStep(s => s + 1))}
            className="bg-[#c9781a] hover:bg-[#e2921e] text-white font-bold px-6 py-2.5 rounded-[12px] transition-colors"
          >
            {isLast ? "Let's go!" : 'Next'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
