'use client';
// components/LiveBattleInviteToast.tsx
// Shows an Accept/Decline card when another player challenges this one to a
// live battle (hooks/useLiveBattleInbox.ts's incomingInvite). Mounted at the
// Dashboard root (app/page.tsx) rather than inside MonsterGuild.tsx, so a
// challenge reaches the player no matter which tab they're on. Styled to
// match components/AchievementToast.tsx's toast conventions.
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playPvpChallenge, playPvpAccept, playPvpDecline } from '@/lib/sounds';
import GameButton, { questButtonFontFamily, questButtonLetterSpacing, questButtonDropShadow, questTextShadowStyle, questTextStyle } from '@/components/GameButton';
import { woodTextureStyle, Nail } from '@/components/battle/MonsterHpPanel';

interface LiveBattleInviteToastProps {
  fromName: string;
  onAccept: () => void;
  onDecline: () => void;
}

export default function LiveBattleInviteToast({ fromName, onAccept, onDecline }: LiveBattleInviteToastProps) {
  useEffect(() => {
    playPvpChallenge();
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        key="live-battle-invite"
        initial={{ opacity: 0, y: -16, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="fixed top-[63px] left-1/2 -translate-x-1/2 z-[80] w-full max-w-sm px-4"
      >
        {/* Same wood-plank + gold trim + corner-nail frame as the battle
            screen's MonsterHpPanel/PostBattleSummary, reusing its exported
            style pieces rather than re-deriving them. */}
        <div
          className="relative border-2 border-[#4a2f18] rounded-2xl p-5"
          style={{ boxShadow: `0 0 0 3px #d4a017, ${questButtonDropShadow}`, ...woodTextureStyle }}
        >
          <Nail className="top-2 left-2" />
          <Nail className="top-2 right-2" />
          <Nail className="bottom-2 left-2" />
          <Nail className="bottom-2 right-2" />
          <div className="flex items-center gap-2 mb-3">
            <img src="/icons/encounter/atk.svg" alt="" className="w-8 h-8 object-contain flex-shrink-0" />
            <div>
              <p
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: '#f5c542', textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}
              >
                Live Battle Challenge!
              </p>
              <h3
                className="text-lg leading-tight"
                style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing }}
              >
                <span style={{ position: 'relative', display: 'inline-block' }}>
                  <span aria-hidden style={questTextShadowStyle}>{fromName} wants to battle!</span>
                  <span style={questTextStyle}>{fromName} wants to battle!</span>
                </span>
              </h3>
            </div>
          </div>
          <div className="flex gap-3 mt-4" style={{ fontSize: 15 }}>
            <GameButton variant="quest" color="#16a34a" onClick={() => { playPvpAccept(); onAccept(); }} className="flex-1">
              Accept
            </GameButton>
            <GameButton variant="quest" color="#57534e" onClick={() => { playPvpDecline(); onDecline(); }} className="flex-1">
              Decline
            </GameButton>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
