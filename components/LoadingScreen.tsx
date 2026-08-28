'use client';

// components/LoadingScreen.tsx
//
// Branded stand-in for the blank/plain-text states Dashboard shows while
// waiting on session hydration or the first weekly-data fetch — those gaps
// can run several seconds (more on native, where the app also has to open
// the SQLite cache and, cold, parse a larger bundle), and a bare colored div
// reads as "frozen" rather than "loading."
import { useEffect, useState } from 'react';

export default function LoadingScreen({ message }: { message?: string }) {
  // There's no real byte-level progress to report here (session hydration
  // and the weekly-data fetch don't expose one), so this eases toward ~92%
  // and holds — same trick as most app splash screens — rather than lying
  // about being done. The screen unmounts on actual completion.
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    const start = Date.now();
    const id = window.setInterval(() => {
      const elapsed = Date.now() - start;
      // Fast out of the gate, then decelerate — feels responsive without
      // ever visibly stalling at a fixed number.
      const eased = 92 * (1 - Math.exp(-elapsed / 1800));
      setProgress(Math.max(8, eased));
    }, 100);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0807] flex flex-col items-center justify-end overflow-hidden">
      <img
        src="/loading_screen_vertical.webp"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="relative z-10 w-full flex flex-col items-center gap-3 pb-2 sm:pb-3 px-10">
        <div className="w-full max-w-xs h-3 rounded-full bg-black/50 border border-[#c9a87a]/60 overflow-hidden shadow-lg">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#c9781a] to-[#f0b64a] transition-[width] duration-150 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-[#f0ddb8] font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
          {message ?? 'Loading...'}
        </p>
      </div>
    </div>
  );
}
