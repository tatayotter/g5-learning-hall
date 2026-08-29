// components/WelcomeCard.tsx
'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { questButtonFontFamily, questButtonLetterSpacing, questTextShadowStyle, questTextStyle } from '@/components/GameButton';

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
          className="relative mb-5 rounded-2xl border border-amber-500/50 bg-gradient-to-br from-[#0c2456] via-[#123268] to-[#7a5a12] p-4 shadow-lg overflow-hidden"
        >
          {/* Gold glow strip on the left, echoing the logo's gold lettering */}
          <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl bg-gradient-to-b from-[#f5c542] to-[#b8860b]" />

          {/* Soft gold glow in the corner, blue everywhere else — matches the logo's blue shield / gold text pairing */}
          <div className="pointer-events-none absolute -top-8 -right-8 w-32 h-32 rounded-full bg-[#f5c542]/20 blur-2xl" />

          {/* Close button */}
          <button
            onClick={() => setDismissed(true)}
            className="absolute top-3 right-3 text-white/40 hover:text-white/80 transition-colors text-lg leading-none"
            aria-label="Dismiss welcome card"
          >
            ×
          </button>

          {/* Greeting — same Bungee/stroke/shadow text treatment as the
              quest GameButton's label, reusing its exported style constants
              rather than re-deriving the em ratios (2026-08-29). */}
          <h2
            className="text-lg leading-tight mb-1 pr-6"
            style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing }}
          >
            <span style={{ position: 'relative', display: 'inline-block' }}>
              <span aria-hidden style={questTextShadowStyle}>Welcome back, {playerName}!</span>
              <span style={questTextStyle}>Welcome back, {playerName}!</span>
            </span>
          </h2>

          {/* Motivational line */}
          <p className="text-blue-100/80 text-xs leading-relaxed mb-3">{motd}</p>

          {/* Stat chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 bg-white/10 border border-white/20 rounded-full px-2.5 py-1 text-[11px] font-bold text-orange-300">
              🔥 {loginStreak}-day streak
            </span>
            {remaining > 0 ? (
              <span className="flex items-center gap-1 bg-white/10 border border-white/20 rounded-full px-2.5 py-1 text-[11px] font-bold text-[#f5c542]">
                📋 {remaining} quest{remaining !== 1 ? 's' : ''} remaining
              </span>
            ) : (
              <span className="flex items-center gap-1 bg-white/10 border border-white/20 rounded-full px-2.5 py-1 text-[11px] font-bold text-green-300">
                ✅ All quests complete this week!
              </span>
            )}
            {completedQuests > 0 && (
              <span className="flex items-center gap-1 bg-white/10 border border-white/20 rounded-full px-2.5 py-1 text-[11px] font-bold text-blue-100">
                ⚔ {completedQuests} mastered
              </span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
