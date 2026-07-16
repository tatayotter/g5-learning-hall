'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Achievement } from '@/lib/achievements';

interface AchievementToastProps {
  userId: string;
  newlyUnlocked: Achievement[];
  onDismissAll: () => void;
}

export default function AchievementToast({ userId, newlyUnlocked, onDismissAll }: AchievementToastProps) {
  const [visible, setVisible] = useState<Achievement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const isTala = userId === 'tala';

  useEffect(() => {
    if (newlyUnlocked.length > 0) {
      setVisible(newlyUnlocked);
      setCurrentIndex(0);
    }
  }, [newlyUnlocked]);

  useEffect(() => {
    if (visible.length === 0) return;
    // Auto-advance to next achievement after 4 seconds
    const timer = setTimeout(() => {
      if (currentIndex < visible.length - 1) {
        setCurrentIndex(i => i + 1);
      } else {
        setVisible([]);
        onDismissAll();
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, [currentIndex, visible]);

  const current = visible[currentIndex];

  // Theme colors based on active user
  const colors = isTala ? {
    bg: 'bg-pink-50 border-pink-300',
    title: 'text-pink-700',
    sub: 'text-pink-500',
    xp: 'text-pink-600',
    gold: 'text-pink-400',
    bar: 'bg-pink-400',
    dismiss: 'text-pink-400 hover:text-pink-600',
    counter: 'text-pink-400',
  } : {
    bg: 'bg-[#1c1611] border-amber-700',
    title: 'text-amber-300',
    sub: 'text-amber-600',
    xp: 'text-blue-400',
    gold: 'text-yellow-400',
    bar: 'bg-amber-500',
    dismiss: 'text-gray-500 hover:text-gray-300',
    counter: 'text-gray-500',
  };

  return (
    <AnimatePresence mode="wait">
      {current && (
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: -80, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -40, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm border rounded-2xl shadow-2xl overflow-hidden ${colors.bg}`}
        >
          {/* Auto-dismiss progress bar */}
          <motion.div
            className={`h-1 ${colors.bar}`}
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: 4, ease: 'linear' }}
          />

          <div className="p-5">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏆</span>
                <div>
                  <p className={`text-xs font-bold uppercase tracking-widest ${colors.sub}`}>
                    {isTala ? '✨ Achievement Unlocked!' : '⚔️ Achievement Unlocked!'}
                  </p>
                  <h3 className={`text-lg font-display font-bold leading-tight ${colors.title}`}>
                    {current.title.replace('🔒 ', '')}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => { setVisible([]); onDismissAll(); }}
                className={`text-xs mt-1 transition-colors ${colors.dismiss}`}
              >
                ✕
              </button>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-500 mb-4 leading-relaxed">
              {current.description}
            </p>

            {/* Rewards */}
            <div className="flex gap-4 text-sm font-mono font-bold">
              <span className={colors.xp}>+{current.xpReward} XP</span>
              <span className={colors.gold}>+{current.goldReward} Gold</span>
            </div>

            {/* Counter if multiple */}
            {visible.length > 1 && (
              <p className={`text-xs mt-3 ${colors.counter}`}>
                {currentIndex + 1} of {visible.length} achievements
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
