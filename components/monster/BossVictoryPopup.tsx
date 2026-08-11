'use client';
// components/monster/BossVictoryPopup.tsx
// Same full-screen celebration shape as components/EventAnnouncementPopup.tsx
// (spring-in card over a dark backdrop) — retitled for a persona defeat and
// carrying the reward summary inline instead of a separate toast afterward.
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import type { CSSProperties } from 'react';

interface BossVictoryPopupProps {
  personaName: string;
  artUrl: string;
  glowColor: string;
  xp: number;
  gold: number;
  onDismiss: () => void;
}

export default function BossVictoryPopup({ personaName, artUrl, glowColor, xp, gold, onDismiss }: BossVictoryPopupProps) {
  const [visible, setVisible] = useState(true);

  const dismiss = () => {
    setVisible(false);
    onDismiss();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismiss}
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-6 cursor-pointer"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative max-w-lg w-full"
          >
            <div className="bg-[#1a1208] border border-purple-700 rounded-2xl shadow-2xl p-8 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-2">Persona Defeated!</p>
              <div className="relative w-28 h-28 mx-auto mb-3">
                <div className="boss-glow" style={{ '--glow': glowColor } as CSSProperties} />
                <img src={artUrl} alt={personaName} className="relative w-full h-full object-contain opacity-90" />
              </div>
              <h3 className="text-lg font-display font-bold text-purple-200 mb-4">{personaName}</h3>
              <div className="flex items-center justify-center gap-6 text-sm font-bold">
                <span className="flex items-center gap-1 text-green-400">
                  <img src="/icons/stats/stat_up.svg" alt="" className="w-4 h-4" /> +{xp} EXP
                </span>
                <span className="flex items-center gap-1 text-yellow-400">
                  <img src="/icons/rewards/gold_coin.svg" alt="" className="w-4 h-4" /> +{gold} GOLD
                </span>
                <span className="flex items-center gap-1 text-purple-300">💊 Growth Pill</span>
              </div>
            </div>
            <button
              onClick={dismiss}
              className="absolute -top-3 -right-3 bg-purple-700 hover:bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm shadow-lg"
              aria-label="Close"
            >
              ✕
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
