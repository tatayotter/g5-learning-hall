// components/WelcomeCard.tsx
'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// One motivational line per day of week (Sun–Sat).
// Tone: warm, academic, kid-appropriate — "how does it feel to understand things better?"
const MOTD: string[] = [
  "Rest well, Hero — class is always easier when you're sharp.", // Sun
  "How does it feel to understand things better in class?",      // Mon
  "Every quest you finish means one less thing that confuses you.", // Tue
  "Your future self will thank you for showing up today.",       // Wed
  "The best feeling? When class feels easy because you prepared.", // Thu
  "You're getting sharper with every quest you complete.",       // Fri
  "Take a breath — then come back stronger tomorrow.",           // Sat
];

interface WelcomeCardProps {
  playerName: string;
  loginStreak: number;
  totalQuests: number;
  completedQuests: number;
}

export default function WelcomeCard({
  playerName,
  loginStreak,
  totalQuests,
  completedQuests,
}: WelcomeCardProps) {
  const [dismissed, setDismissed] = useState(false);
  const motd = MOTD[new Date().getDay()];
  const remaining = totalQuests - completedQuests;

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12, scale: 0.97 }}
          transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
          className="relative mb-5 rounded-2xl border border-amber-800/40 bg-gradient-to-br from-[#1c1611] to-[#120f0b] p-4 shadow-lg overflow-hidden"
        >
          {/* Subtle amber glow strip on the left */}
          <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl bg-amber-600/70" />

          {/* Close button */}
          <button
            onClick={() => setDismissed(true)}
            className="absolute top-3 right-3 text-gray-600 hover:text-gray-300 transition-colors text-lg leading-none"
            aria-label="Dismiss welcome card"
          >
            ×
          </button>

          {/* Greeting */}
          <h2 className="font-display font-bold text-lg text-white leading-tight mb-1 pr-6">
            Welcome back, {playerName}!
          </h2>

          {/* Motivational line */}
          <p className="text-gray-400 text-xs leading-relaxed mb-3">{motd}</p>

          {/* Stat chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full px-2.5 py-1 text-[11px] font-bold text-orange-400">
              🔥 {loginStreak}-day streak
            </span>
            {remaining > 0 ? (
              <span className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full px-2.5 py-1 text-[11px] font-bold text-amber-400">
                📋 {remaining} quest{remaining !== 1 ? 's' : ''} remaining
              </span>
            ) : (
              <span className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full px-2.5 py-1 text-[11px] font-bold text-green-400">
                ✅ All quests complete this week!
              </span>
            )}
            {completedQuests > 0 && (
              <span className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full px-2.5 py-1 text-[11px] font-bold text-gray-400">
                ⚔ {completedQuests} mastered
              </span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
