'use client';

import { motion } from 'framer-motion';

// Shared scroll-reveal wrapper — same shape as app/welcome/page.tsx's local
// FadeIn helper, pulled out so /support can reuse it without duplicating.
export default function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, delay }}
    >
      {children}
    </motion.div>
  );
}
