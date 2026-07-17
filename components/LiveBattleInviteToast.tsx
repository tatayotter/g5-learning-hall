'use client';
// components/LiveBattleInviteToast.tsx
// Shows an Accept/Decline card when another player challenges this one to a
// live battle (hooks/useLiveBattleInbox.ts's incomingInvite). Mounted at the
// Dashboard root (app/page.tsx) rather than inside MonsterGuild.tsx, so a
// challenge reaches the player no matter which tab they're on. Styled to
// match components/AchievementToast.tsx's toast conventions.
import { motion, AnimatePresence } from 'framer-motion';

interface LiveBattleInviteToastProps {
  fromName: string;
  onAccept: () => void;
  onDecline: () => void;
}

export default function LiveBattleInviteToast({ fromName, onAccept, onDecline }: LiveBattleInviteToastProps) {
  return (
    <AnimatePresence>
      <motion.div
        key="live-battle-invite"
        initial={{ opacity: 0, y: -80, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -40, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm border rounded-2xl shadow-2xl overflow-hidden bg-[#1c1611] border-amber-700"
      >
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">⚔️</span>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-600">Live Battle Challenge!</p>
              <h3 className="text-lg font-display font-bold leading-tight text-amber-300">{fromName} wants to battle!</h3>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={onAccept}
              className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm transition-colors"
            >
              Accept
            </button>
            <button
              onClick={onDecline}
              className="flex-1 py-2 rounded-xl border border-neutral-600 hover:border-neutral-400 text-gray-300 font-bold text-sm transition-colors"
            >
              Decline
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
