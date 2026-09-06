// components/bonusquests/MtapReviewerPanel.tsx
// Untimed, answer-shown reviewer for one whole strand — one Reviewer button
// covers every archetype in that strand (per the simplification agreed on:
// 22 per-archetype buttons was more than needed). Reads
// mtap_expansion_content_reviewer, a second view over the same base table as
// the quiz, deliberately including correct_answer/solution_steps since this
// screen's whole purpose is showing the worked answer, not testing it.
'use client';

import { useEffect, useState } from 'react';
import GameButton from '@/components/GameButton';
import { fetchMtapReviewerExamples, MtapReviewerRow } from '@/lib/mtapEngine';
import { MtapStrandDef, TIER_LABEL, TIERS, MtapTier } from '@/lib/mtapContent';

interface MtapReviewerPanelProps {
  grade: number;
  strand: MtapStrandDef;
  onClose: () => void;
}

const TIER_BADGE: Record<MtapTier, string> = {
  easy: 'text-green-800 bg-[#e8f5e0] border-green-600',
  average: 'text-[#9c6500] bg-[#fff2cc] border-[#f5c542]',
  difficult: 'text-orange-800 bg-orange-100 border-orange-500',
};

export default function MtapReviewerPanel({ grade, strand, onClose }: MtapReviewerPanelProps) {
  const [byArchetype, setByArchetype] = useState<Record<string, Record<MtapTier, MtapReviewerRow | null>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const data = await fetchMtapReviewerExamples(grade, strand.strand);
      if (!cancelled) {
        setByArchetype(data);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [grade, strand.strand]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-[#a8a29e] cursor-pointer" onClick={onClose}>&larr; {strand.name}</span>
        <span className="flex items-center gap-1 text-xs font-bold text-stone-500 bg-stone-100 border border-stone-200 rounded-full px-3 py-1">
          Reviewer &middot; no timer
        </span>
      </div>
      <h1 className="text-xl font-bold text-[#7a4a0f] font-display mb-1">{strand.name} — Reviewer</h1>
      <p className="text-xs text-[#a8a29e] mb-4">One reviewer, {strand.archetypes.length} topics. Study the worked examples, then close this and tap a tier pip to play the timed quiz.</p>

      {loading ? (
        <p className="text-[#7a4a0f] text-center py-8">Loading…</p>
      ) : (
        <div className="space-y-4">
          {strand.archetypes.map(arch => {
            const tiers = byArchetype[arch.key];
            if (!tiers) return null;
            return (
              <div key={arch.key} className="bg-[#f0ddb8] border-[3px] border-[#8b5e2a] rounded-2xl p-4">
                <h2 className="font-extrabold text-[#2a1505] mb-3">{arch.name}</h2>
                <div className="space-y-3">
                  {TIERS.map((tier) => {
                    const row = tiers[tier];
                    if (!row) return null;
                    return (
                      <div key={tier} className="bg-white border border-[#c9a87a] rounded-xl p-4">
                        <span className={`text-[10px] font-bold uppercase tracking-wide border rounded-full px-2 py-0.5 ${TIER_BADGE[tier]}`}>
                          {TIER_LABEL[tier]}
                        </span>
                        <p className="font-bold text-[#2a1505] mt-2 mb-2 text-sm">{row.question}</p>
                        <div className="bg-[#f5f0e8] rounded-lg px-3 py-2">
                          <p className="text-xs font-bold text-green-700 mb-1">Answer: {row.correct_answer}</p>
                          <p className="text-xs text-[#57534e]">{row.solution_steps}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-5 flex justify-center">
        <GameButton variant="quest" color="#8b5e2a" onClick={onClose} style={{ fontSize: 14 }}>Back to topics</GameButton>
      </div>
    </div>
  );
}
