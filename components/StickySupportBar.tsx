'use client';

import { useEffect, useRef, useState } from 'react';

// Persistent bottom CTA bar, same idea as a Kickstarter campaign's sticky
// pledge box — but since the real donation form already lives inline in the
// "Chip In" section, this only needs to exist for the stretches of the page
// where that section is scrolled out of view. Hides itself via
// IntersectionObserver on #chip-in rather than a fixed scroll-position
// threshold, so it stays correct regardless of viewport height or how long
// each section above it ends up being.
export default function StickySupportBar() {
  // Visible by default -- the hero is on screen at first paint and #chip-in
  // isn't, so the bar should show immediately; the observer then takes over.
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const target = document.getElementById('chip-in');
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => setHidden(entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`fixed bottom-0 inset-x-0 z-40 transition-transform duration-300 ${
        hidden ? 'translate-y-full' : 'translate-y-0'
      }`}
    >
      <div className="bg-white/95 backdrop-blur-sm border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-4 py-3 sm:px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <p className="text-sm font-bold text-slate-700 hidden sm:block">
            Help keep the adventure going
          </p>
          <a
            href="#chip-in"
            className="w-full sm:w-auto text-center bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-2.5 rounded-full text-sm transition-colors shadow-[0_4px_16px_rgba(249,115,22,0.35)]"
          >
            Support Now →
          </a>
        </div>
      </div>
    </div>
  );
}
