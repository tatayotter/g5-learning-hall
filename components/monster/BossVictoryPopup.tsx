'use client';
// components/monster/BossVictoryPopup.tsx
// Same full-screen celebration shape as components/EventAnnouncementPopup.tsx
// (spring-in card over a dark backdrop) — retitled for a persona defeat and
// carrying the reward summary inline instead of a separate toast afterward.
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { playPageFlip } from '@/lib/sounds';
import GameButton, { questButtonFontFamily, questButtonLetterSpacing, questButtonDropShadow, questTextShadowStyle, questTextStyle } from '@/components/GameButton';
import { Nail } from '@/components/battle/MonsterHpPanel';

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
    playPageFlip();
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
            {/* The Term Boss keeps its dark-purple look (docs/STYLE_GUIDE.md's one
                documented exception), framed like BossArena's panels: purple
                gradient, gold trim, corner nails, quest-style title + button. */}
            <div
              className="relative border-2 border-[#1a0a2a] rounded-2xl p-8 text-center"
              style={{ background: 'linear-gradient(180deg,#2a1640 0%,#150a24 100%)', boxShadow: `0 0 0 3px #d4a017, 0 0 24px ${glowColor}66, ${questButtonDropShadow}` }}
            >
              <Nail className="top-2 left-2" />
              <Nail className="top-2 right-2" />
              <Nail className="bottom-2 left-2" />
              <Nail className="bottom-2 right-2" />
              <p className="text-sm mb-3" style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing }}>
                <span style={{ position: 'relative', display: 'inline-block' }}>
                  <span aria-hidden style={questTextShadowStyle}>Shadow Defeated!</span>
                  <span style={{ ...questTextStyle, color: '#f5c542' }}>Shadow Defeated!</span>
                </span>
              </p>
              <div className="relative w-28 h-28 mx-auto mb-3">
                <div className="boss-glow" style={{ '--glow': glowColor } as CSSProperties} />
                <img src={artUrl} alt={personaName} className="relative w-full h-full object-contain opacity-90" />
              </div>
              <h3 className="text-lg font-display font-bold text-purple-100 mb-4">{personaName}</h3>
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-bold mb-6">
                <span className="flex items-center gap-1 text-green-400">
                  <img src="/icons/stats/stat_up.svg" alt="" className="w-4 h-4" /> +{xp} EXP
                </span>
                <span className="flex items-center gap-1 text-yellow-400">
                  <img src="/icons/rewards/gold_coin.svg" alt="" className="w-4 h-4" /> +{gold} GOLD
                </span>
                <span className="flex items-center gap-1 text-purple-300">
                  <img src="/icons/rewards/gift.svg" alt="" className="w-4 h-4" /> +1 Growth Pill
                </span>
              </div>
              <div style={{ fontSize: 15 }}>
                <GameButton variant="quest" color="#7c3aed" className="w-full" onClick={(e) => { e.stopPropagation(); setVisible(false); onDismiss(); }}>
                  Continue
                </GameButton>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
