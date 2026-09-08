// components/dashboard/MySecPackReviewer.tsx
// Parent-facing "view the reviewer anytime" screen for one owned SEC pack —
// confirmed decision in docs/sec-shop-design.md. Strand list only (no tier
// pips, no quiz entry, no mastery bars — those are the child's own view in
// MtapTopicsView.tsx); a parent just picks a strand and studies the worked
// examples via the same MtapReviewerPanel the child's Bonus Quests tab uses.
'use client';

import { useState } from 'react';
import { MTAP_STRANDS_BY_GRADE } from '@/lib/mtapContent';
import MtapReviewerPanel from '@/components/bonusquests/MtapReviewerPanel';
import GameButton from '@/components/GameButton';

interface MySecPackReviewerProps {
  grade: number;
  onClose: () => void;
}

export default function MySecPackReviewer({ grade, onClose }: MySecPackReviewerProps) {
  const [openStrand, setOpenStrand] = useState<number | null>(null);
  const strands = MTAP_STRANDS_BY_GRADE[grade] || [];

  if (openStrand !== null) {
    return (
      <div className="bg-[#f0ddb8] border-2 border-[#8b5e2a] rounded-2xl p-4">
        <MtapReviewerPanel grade={grade} strand={strands[openStrand]} onClose={() => setOpenStrand(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <span className="text-sm text-stone-500 cursor-pointer inline-block" onClick={onClose}>&larr; My SECs</span>
      <p className="text-sm text-stone-500">Pick a topic group to study the worked examples — no timer, answers shown.</p>
      <div className="space-y-2">
        {strands.map((strand, idx) => (
          <div key={strand.strand} className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-[#ffffff] px-4 py-3">
            <div>
              <p className="font-bold text-slate-800 text-sm">{strand.name}</p>
              <p className="text-xs text-stone-500">{strand.archetypes.length} topics</p>
            </div>
            <GameButton variant="quest" color="#16a34a" style={{ fontSize: 12 }} onClick={() => setOpenStrand(idx)}>
              Study
            </GameButton>
          </div>
        ))}
      </div>
    </div>
  );
}
