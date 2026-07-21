// components/EventAnnouncementPopup.tsx
'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CustomEvent } from '@/lib/customEvents';

interface EventAnnouncementPopupProps {
  event: CustomEvent;
  onDismiss: () => void;
}

export default function EventAnnouncementPopup({ event, onDismiss }: EventAnnouncementPopupProps) {
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
            {event.banner_url ? (
              <img src={event.banner_url} alt={event.title} className="w-full h-auto rounded-2xl shadow-2xl" />
            ) : (
              <div className="bg-[#1a1208] border border-amber-700 rounded-2xl shadow-2xl p-8 text-center">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-2">Event Active!</p>
                <h3 className="text-lg font-display font-bold text-amber-300">{event.title}</h3>
              </div>
            )}
            <button
              onClick={dismiss}
              className="absolute -top-3 -right-3 bg-amber-700 hover:bg-amber-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm shadow-lg"
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
