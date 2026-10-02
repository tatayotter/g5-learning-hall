// components/LinkParentBanner.tsx
'use client';

import { useState } from 'react';
import { useLinkedStatus } from '@/hooks/useLinkedStatus';
import LinkParentForm from '@/components/LinkParentForm';
import GrowthPillIcon from '@/components/GrowthPillIcon';
import { trackEvent } from '@/lib/analytics';
import { playPageFlip } from '@/lib/sounds';

// Nudge, not a wall for core gameplay — see docs/parent-child-linking-design.md.
// Shown to self-registered children who haven't linked a parent yet. The
// Leaderboard tab and PvP challenge flow (components/MonsterGuild.tsx) are a
// real gate, not just a nudge; this floating pill is the always-available
// entry point to the same LinkParentForm those gates embed inline.
//
// Framed as a "show your parent" quest: the reward (2 Growth Pills + 100
// gold) is granted server-side by confirm_parent_link once the parent
// accepts the emailed invite — nothing is granted from here.
// `forceShow` skips the linked check — only for the /dev/ui-gallery harness.
export default function LinkParentBanner({ forceShow = false }: { forceShow?: boolean }) {
  const linked = useLinkedStatus();
  const [expanded, setExpanded] = useState(false);

  if (linked !== false && !forceShow) return null;

  const toggle = (next: boolean) => {
    playPageFlip();
    if (next) trackEvent('parent_cta_opened');
    setExpanded(next);
  };

  if (!expanded) {
    return (
      <button
        onClick={() => toggle(true)}
        title="Show Learning Hall to a parent to earn 2 Growth Pills"
        className="fixed top-3 right-3 z-40 flex items-center gap-1.5 bg-[#f0ddb8] border-2 border-[#8b5e2a] text-[#2a1505] text-xs font-bold pl-2 pr-3 py-1 rounded-full shadow-lg hover:bg-[#e8c88a] hover:border-[#c9781a] transition-colors animate-[bounce_2s_ease-in-out_3]"
      >
        <GrowthPillIcon size={22} />
        <span>Show a parent</span>
        <span className="text-[#7c3aed]">+2</span>
      </button>
    );
  }

  return (
    <div className="fixed top-3 right-3 z-40 w-[calc(100vw-1.5rem)] max-w-sm max-h-[calc(100dvh-1.5rem)] overflow-y-auto bg-[#f0ddb8] border-2 border-[#8b5e2a] text-[#3a2610] rounded-2xl shadow-2xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold tracking-widest text-[#7a4a0f]">PARENT QUEST</p>
          <p className="text-base font-bold leading-tight text-[#2a1505]">Show Learning Hall to your parent</p>
        </div>
        <button
          onClick={() => toggle(false)}
          className="shrink-0 text-[#6b4820] hover:text-[#2a1505] font-bold text-xs px-1"
          title="Close"
        >
          Close
        </button>
      </div>

      <div className="bg-white border border-[#c9a87a] rounded-xl p-3 flex items-center gap-3">
        <div className="flex -space-x-2 shrink-0">
          <GrowthPillIcon size={36} />
          <GrowthPillIcon size={36} />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-[#2a1505] text-sm">Reward: 2 Growth Pills</p>
          <p className="text-xs text-[#6b4820]">
            Each pill gives any curio <span className="font-bold text-[#7c3aed]">+5 levels</span> instantly. Plus 100 Gold.
          </p>
        </div>
      </div>

      <ol className="text-xs space-y-1.5">
        <li className="flex gap-2">
          <span className="shrink-0 w-5 h-5 rounded-full bg-[#8b5e2a] text-white text-[10px] font-bold flex items-center justify-center">1</span>
          <span>Show Mom, Dad, or your guardian your curios and what you learned this week.</span>
        </li>
        <li className="flex gap-2">
          <span className="shrink-0 w-5 h-5 rounded-full bg-[#8b5e2a] text-white text-[10px] font-bold flex items-center justify-center">2</span>
          <span>Put their email below and send the invite.</span>
        </li>
        <li className="flex gap-2">
          <span className="shrink-0 w-5 h-5 rounded-full bg-[#8b5e2a] text-white text-[10px] font-bold flex items-center justify-center">3</span>
          <span>They tap the link and make a free parent account. Your pills arrive right away.</span>
        </li>
      </ol>

      <p className="text-[11px] text-[#6b4820] bg-[#e8d0a0]/60 rounded-lg px-2.5 py-2">
        <span className="font-bold text-[#7a4a0f]">Why parents like it:</span> they can see your progress,
        streaks, and journal. It also unlocks the Leaderboard and PvP battles for you.
      </p>

      <LinkParentForm onSent={() => trackEvent('parent_cta_invite_sent')} />
    </div>
  );
}
