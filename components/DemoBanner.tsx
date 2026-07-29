// components/DemoBanner.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trackEvent } from '@/lib/analytics';

export default function DemoBanner() {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    // A plain <a> navigation races the fire-and-forget analytics insert and
    // aborts it mid-flight, so the click must wait for the write first.
    await trackEvent('demo_signup_cta_clicked');
    router.push('/register?ref=demo');
  };

  // Floating pill instead of a full-width sticky bar — the old bar's long
  // sentence + link on one line overflowed on narrow landscape phones.
  // Collapsed by default so it never fights other fixed UI (sidebar, toasts,
  // the Replay Tutorial button); expands into a small self-contained card.
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        title="You're exploring a demo"
        className="fixed top-3 right-3 z-40 flex items-center gap-1.5 bg-[#c9781a] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg hover:bg-[#b56a15] transition-colors"
      >
        <span>Demo Mode</span>
      </button>
    );
  }

  return (
    <div className="fixed top-3 right-3 z-40 w-[calc(100vw-1.5rem)] max-w-xs bg-[#c9781a] text-white text-xs font-bold rounded-xl shadow-2xl p-3 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <span>You&apos;re exploring a demo — progress here isn&apos;t saved long-term.</span>
        <button
          onClick={() => setExpanded(false)}
          className="shrink-0 text-white/80 hover:text-white leading-none text-base"
          title="Dismiss"
        >
          ✕
        </button>
      </div>
      <a
        href="/register?ref=demo"
        onClick={handleClick}
        className="self-start underline decoration-2 underline-offset-2 hover:text-[#1c1611] transition-colors"
      >
        Create your real account →
      </a>
    </div>
  );
}
