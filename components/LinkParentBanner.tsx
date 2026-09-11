// components/LinkParentBanner.tsx
'use client';

import { useState } from 'react';
import { useLinkedStatus } from '@/hooks/useLinkedStatus';
import LinkParentForm from '@/components/LinkParentForm';

// Nudge, not a wall for core gameplay — see docs/parent-child-linking-design.md.
// Shown to self-registered children who haven't linked a parent yet. The
// Leaderboard tab and PvP challenge flow (components/MonsterGuild.tsx) are a
// real gate, not just a nudge; this floating pill is the always-available
// entry point to the same LinkParentForm those gates embed inline.
export default function LinkParentBanner() {
  const linked = useLinkedStatus();
  const [expanded, setExpanded] = useState(false);

  if (linked !== false) return null;

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        title="Link a parent to unlock more"
        className="fixed top-3 right-3 z-40 flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg hover:bg-indigo-500 transition-colors animate-pulse"
      >
        <span>Link a Parent 🎁</span>
      </button>
    );
  }

  return (
    <div className="fixed top-3 right-3 z-40 w-[calc(100vw-1.5rem)] max-w-xs bg-neutral-900 border border-indigo-500/40 text-white text-xs rounded-xl shadow-2xl p-3 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <span className="font-bold">Link a parent, earn 100 gold 🎁</span>
        <button
          onClick={() => setExpanded(false)}
          className="shrink-0 text-white/60 hover:text-white leading-none text-base"
          title="Dismiss"
        >
          ✕
        </button>
      </div>
      <LinkParentForm />
    </div>
  );
}
