// components/EventAnnouncementPopup.tsx
'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CustomEvent } from '@/lib/customEvents';
import { ALL_MONSTERS } from '@/lib/monsterConfig';

interface EventAnnouncementPopupProps {
  event: CustomEvent;
  onDismiss: () => void;
}

export default function EventAnnouncementPopup({ event, onDismiss }: EventAnnouncementPopupProps) {
  const [visible, setVisible] = useState(true);
  const reward = ALL_MONSTERS[event.reward_monster_id];

  const dismiss = () => {
    setVisible(false);
    onDismiss();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -80, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -40, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm bg-[#1a1208] border border-amber-700 rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎪</span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-amber-600">Event Active!</p>
                  <h3 className="text-lg font-display font-bold leading-tight text-amber-300">{event.title}</h3>
                </div>
              </div>
              <button onClick={dismiss} className="text-xs mt-1 text-gray-500 hover:text-gray-300 transition-colors">
                ✕
              </button>
            </div>

            <p className="text-sm text-gray-400 mb-4 leading-relaxed">
              Special quests are live! Complete one per subject before the event ends to earn a reward.
            </p>

            {reward && (
              <div className="flex items-center gap-2 text-sm font-mono font-bold mb-2">
                <span className="text-xl">{reward.emoji}</span>
                <span className="text-yellow-400">Reward: {reward.name}</span>
              </div>
            )}

            <button
              onClick={dismiss}
              className="w-full mt-2 bg-amber-700 hover:bg-amber-600 text-white font-bold py-2 rounded-lg transition-colors text-sm"
            >
              Let's go!
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
