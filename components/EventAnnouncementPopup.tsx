// components/EventAnnouncementPopup.tsx
'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CustomEvent } from '@/lib/customEvents';
import { playPageFlip } from '@/lib/sounds';
import { questButtonFontFamily, questButtonLetterSpacing, questButtonDropShadow, questTextShadowStyle, questTextStyle } from '@/components/GameButton';
import { woodTextureStyle, Nail } from '@/components/battle/MonsterHpPanel';

interface EventAnnouncementPopupProps {
  event: CustomEvent;
  onDismiss: () => void;
}

export default function EventAnnouncementPopup({ event, onDismiss }: EventAnnouncementPopupProps) {
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
            {event.banner_url ? (
              <img
                src={event.banner_url}
                alt={event.title}
                className="w-full h-auto rounded-2xl border-2 border-[#4a2f18]"
                style={{ boxShadow: `0 0 0 3px #d4a017, ${questButtonDropShadow}` }}
              />
            ) : (
              // Same wood-plank + gold trim + corner-nail frame as the other game popups.
              <div
                className="relative border-2 border-[#4a2f18] rounded-2xl p-8 text-center"
                style={{ boxShadow: `0 0 0 3px #d4a017, ${questButtonDropShadow}`, ...woodTextureStyle }}
              >
                <Nail className="top-2 left-2" />
                <Nail className="top-2 right-2" />
                <Nail className="bottom-2 left-2" />
                <Nail className="bottom-2 right-2" />
                <p className="text-sm mb-2" style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing }}>
                  <span style={{ position: 'relative', display: 'inline-block' }}>
                    <span aria-hidden style={questTextShadowStyle}>Event Active!</span>
                    <span style={{ ...questTextStyle, color: '#f5c542' }}>Event Active!</span>
                  </span>
                </p>
                <h3 className="text-lg font-bold text-white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>{event.title}</h3>
              </div>
            )}
            <button
              onClick={dismiss}
              className="absolute -top-3 -right-3 bg-[#f5c542] hover:bg-[#fcd34d] border-2 border-[#4a2f18] text-[#2a1505] font-black rounded-full w-9 h-9 flex items-center justify-center text-sm btn-tactile"
              style={{ boxShadow: questButtonDropShadow }}
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
