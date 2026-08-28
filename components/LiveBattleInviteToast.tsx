'use client';
// components/LiveBattleInviteToast.tsx
// Shows an Accept/Decline card when another player challenges this one to a
// live battle (hooks/useLiveBattleInbox.ts's incomingInvite). Mounted at the
// Dashboard root (app/page.tsx) rather than inside MonsterGuild.tsx, so a
// challenge reaches the player no matter which tab they're on. Styled to
// match components/AchievementToast.tsx's toast conventions.
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playPvpChallenge } from '@/lib/sounds';
import GameButton from '@/components/GameButton';

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
        className="fixed top-[63px] left-1/2 -translate-x-1/2 z-[80] w-full max-w-sm px-4 border rounded-2xl shadow-2xl overflow-hidden bg-[#f0ddb8] border-amber-600"
      >
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">⚔️</span>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Live Battle Challenge!</p>
              <h3 className="text-lg font-display font-bold leading-tight text-amber-900">{fromName} wants to battle!</h3>
            </div>
          </div>
          <div className="flex gap-3 mt-4" style={{ fontSize: 15 }}>
            <GameButton variant="quest" color="#16a34a" onClick={onAccept} className="flex-1">
              Accept
            </GameButton>
            <GameButton variant="quest" color="#57534e" onClick={onDecline} className="flex-1">
              Decline
            </GameButton>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
