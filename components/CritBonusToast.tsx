'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CritBonusEvent } from '@/hooks/useTimeAttack';

interface CritBonusToastProps {
  event: CritBonusEvent | null;
}

// A quick, self-dismissing "Lucky Find!" pill — fires whenever the crit-bonus
// nonce changes, even if the bonus amount repeats, so back-to-back rolls both
// show.
export default function CritBonusToast({ event }: CritBonusToastProps) {
  // Shown until its 1.4s timer marks that same event expired; a new event
  // (new nonce) is visible immediately.
  const [expiredNonce, setExpiredNonce] = useState<number | null>(null);
  const nonce = event?.nonce ?? null;
  const visible = event && nonce !== expiredNonce ? event : null;

  useEffect(() => {
    if (nonce === null) return;
    const timer = setTimeout(() => setExpiredNonce(nonce), 1400);
    return () => clearTimeout(timer);
  }, [nonce]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={visible.nonce}
          initial={{ opacity: 0, y: 10, scale: 0.8 }}
          animate={{ opacity: 1, y: -30, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="fixed top-[63px] left-1/2 -translate-x-1/2 z-[80] pointer-events-none"
        >
          <div className="bg-yellow-400 text-black font-bold font-mono text-sm px-4 py-2 rounded-full shadow-xl whitespace-nowrap">
            ✨ Lucky Find! +{visible.bonus} Bonus Gold
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
