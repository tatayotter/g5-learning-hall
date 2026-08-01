'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const GREETINGS = [
  'Care to trade?',
  'Give me gold. Give me treasures!',
  'Oh-oh! Money, money money!',
  'Study more so you can give me more gold.',
  "Oh, it's you again. Big spender!",
  "No stealing! I'm watching you...",
];

// Slides in from the right whenever the Rewards Vault tab is opened, plays a
// random greeting voice line, and shows the matching line in a speech bubble.
export default function VaultKeeperNpc() {
  const [visible, setVisible] = useState(true);
  const [lineIndex] = useState(() => Math.floor(Math.random() * GREETINGS.length));

  useEffect(() => {
    const audio = new Audio(`/sounds/voice/rewardsvault_greeting_${lineIndex + 1}.mp3`);
    audio.volume = 0.7;
    const hide = () => setVisible(false);
    // Linger for a bit after the line finishes so it doesn't vanish the instant
    // the voice stops.
    const lingerAfterVoice = () => setTimeout(hide, 3000);
    audio.addEventListener('ended', lingerAfterVoice);
    // Voice clips can fail to load/play (autoplay blocked, missing file); fall
    // back to a fixed display time so the NPC doesn't linger forever.
    const fallbackTimer = setTimeout(hide, 6000);
    audio.play().catch(() => {});

    return () => {
      clearTimeout(fallbackTimer);
      audio.removeEventListener('ended', lingerAfterVoice);
      audio.pause();
    };
  }, [lineIndex]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ x: 200, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 200, opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="fixed bottom-32 right-6 z-40 flex items-center gap-3"
        >
          <div className="relative bg-white text-black text-sm font-semibold rounded-2xl px-4 py-3 max-w-[220px] shadow-[3px_3px_0_0_#000] border-2 border-black">
            {GREETINGS[lineIndex]}
            <p className="mt-1 text-xs italic font-normal text-right text-gray-500">-Vaultkeeper</p>
            <div className="absolute top-1/2 -right-2 -translate-y-1/2 w-4 h-4 bg-white border-t-2 border-r-2 border-black rotate-45" />
          </div>
          <img
            src="/tap_npc_sprites/rewardvault_keeper.webp"
            alt="Vault Keeper"
            className="w-24 h-24 object-contain drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)]"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
