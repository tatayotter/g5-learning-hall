// components/bonusquests/MtapTopicsView.tsx
// One scrollable "topics" screen: 8 strand headers (each with aggregate progress
// and one Reviewer button covering that whole strand), expanding inline to show
// that strand's archetypes with their Easy/Average/Difficult tier pips — replaces
// a separate Strand Map + Archetype List screen pair (agreed simplification: cuts
// navigation from 3 taps to 2, and only one strand is open at a time in practice).
'use client';

import { useEffect, useState, useCallback } from 'react';
import { UserId } from '@/lib/userSession';
import { MTAP_STRANDS_BY_GRADE, TIERS, MtapTier } from '@/lib/mtapContent';
import { fetchMtapAttempts, computeTierUnlocked, computeTierMastered, MtapAttempt } from '@/lib/mtapEngine';
import GameButton from '@/components/GameButton';
import MtapReviewerPanel from '@/components/bonusquests/MtapReviewerPanel';
import MtapQuizPlayer from '@/components/bonusquests/MtapQuizPlayer';

interface MtapTopicsViewProps {
  userId: UserId;
  grade: number;
  onRewardEarned?: (xp: number, gold: number) => void;
}

type View =
  | { mode: 'list' }
  | { mode: 'reviewer'; strandIdx: number }
  | { mode: 'quiz'; archetype: string; archetypeName: string; tier: MtapTier };

export default function MtapTopicsView({ userId, grade, onRewardEarned }: MtapTopicsViewProps) {
  const strands = MTAP_STRANDS_BY_GRADE[grade] || [];
  const [attempts, setAttempts] = useState<MtapAttempt[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [view, setView] = useState<View>({ mode: 'list' });

  const reload = useCallback(async () => {
    const a = await fetchMtapAttempts(userId, grade);
    setAttempts(a);
  }, [userId, grade]);

  // Inline + cancellation-guarded (not just `reload()`) so a fast userId/grade
  // change can't let a stale fetch overwrite fresher state, and so the effect
  // body itself never calls a function known to setState synchronously — see
  // MtapQuizPlayer.tsx's matching pattern and the same crash-history note.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const a = await fetchMtapAttempts(userId, grade);
      if (!cancelled) setAttempts(a);
    })();
    return () => { cancelled = true; };
  }, [userId, grade]);

  if (view.mode === 'reviewer') {
    const strand = strands[view.strandIdx];
    return <MtapReviewerPanel grade={grade} strand={strand} onClose={() => setView({ mode: 'list' })} />;
  }

  if (view.mode === 'quiz') {
    return (
      <MtapQuizPlayer
        userId={userId}
        grade={grade}
        archetype={view.archetype}
        archetypeName={view.archetypeName}
        tier={view.tier}
        onExit={() => { setView({ mode: 'list' }); reload(); }}
        onProgress={reload}
        onRewardEarned={onRewardEarned}
      />
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-[#7a4a0f] font-display mb-1">Grade {grade} Math Enrichment</h1>
      <p className="text-xs text-[#a8a29e] mb-4">Tap a topic group to see its questions, or open the Reviewer to study first — no timer while you study.</p>

      <div className="space-y-2">
        {strands.map((strand, idx) => {
          const totalTiers = strand.archetypes.length * TIERS.length;
          const masteredTiers = strand.archetypes.reduce(
            (sum, arch) => sum + TIERS.filter(t => computeTierMastered(attempts, arch.key, t)).length,
            0,
          );
          const pct = totalTiers > 0 ? Math.round((masteredTiers / totalTiers) * 100) : 0;
          const isOpen = expanded === idx;

          return (
            <div key={strand.strand} className="bg-[#f0ddb8] border-2 border-[#8b5e2a] rounded-2xl overflow-hidden">
              {/* flex-col on mobile, flex-row from sm up: cramming the number
                  chip + title + Reviewer button + progress bar into one row
                  on a ~375px screen truncated even short strand names (e.g.
                  "Number Sense" -> "Number ...") -- found in a live mobile
                  QA pass. Stacking the title above the Reviewer/progress row
                  on narrow screens gives the title its own full-width line
                  instead of fighting the rest of the row for space. */}
              <div
                className="p-3 px-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 cursor-pointer"
                onClick={() => setExpanded(isOpen ? null : idx)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-bold text-[#7a4a0f] bg-[#fff7ed] border border-[#c9a87a] rounded-md w-6 h-6 flex items-center justify-center shrink-0">
                    {strand.strand}
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-[#2a1505] text-sm sm:truncate">{strand.name}</p>
                    <p className="text-[11px] text-[#7a4a0f]">{strand.archetypes.length} topics</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 pl-9 sm:pl-0">
                  <div className="w-24">
                    <div className="h-2 bg-[#e8d0a0] rounded-full overflow-hidden">
                      <div className="h-full bg-green-600 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[9px] text-[#7a4a0f] text-right mt-0.5">{masteredTiers}/{totalTiers}</p>
                  </div>
                  {/* ml-auto pins this to the card's right edge regardless of
                      the progress block's width, per request. */}
                  <GameButton
                    variant="quest"
                    color="#16a34a"
                    style={{ fontSize: 11 }}
                    className="ml-auto self-center"
                    onClick={(e) => { e.stopPropagation(); setView({ mode: 'reviewer', strandIdx: idx }); }}
                  >
                    Review
                  </GameButton>
                </div>
              </div>

              {isOpen && (
                <div className="bg-white border-t border-[#c9a87a] p-3 space-y-2">
                  {strand.archetypes.map(arch => (
                    <div key={arch.key} className="flex items-center justify-between gap-3 border border-[#e8d0a0] rounded-lg px-3 py-2">
                      {/* Wraps instead of truncating -- the longest archetype
                          name ("Position/counting-in-a-line") was getting cut
                          off illegibly at mobile widths (found in a live
                          mobile QA pass); a two-line name reads fine here
                          since each row already has vertical room to spare. */}
                      <span className="text-sm font-semibold text-[#2a1505] flex-1 min-w-0">{arch.name}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {TIERS.map(tier => {
                          const unlocked = computeTierUnlocked(attempts, arch.key, tier);
                          const mastered = computeTierMastered(attempts, arch.key, tier);
                          const letter = tier === 'easy' ? 'E' : tier === 'average' ? 'A' : 'D';
                          if (!unlocked) {
                            return (
                              <span key={tier} title="Locked — build up the previous tier first" className="w-7 h-7 rounded-full bg-stone-100 border border-stone-300 flex items-center justify-center text-[10px] text-stone-400">
                                🔒
                              </span>
                            );
                          }
                          return (
                            <button
                              key={tier}
                              title={`${letter} tier — tap to play`}
                              onClick={() => setView({ mode: 'quiz', archetype: arch.key, archetypeName: arch.name, tier })}
                              className={`w-7 h-7 rounded-full border flex items-center justify-center text-[10px] font-extrabold ${mastered ? 'bg-[#e8f5e0] border-green-600 text-green-700' : 'bg-[#f5c542] border-[#8b5e2a] text-[#2a1505]'}`}
                            >
                              {mastered ? '✓' : letter}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-4 text-[11px] text-[#7a4a0f]">
        <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 rounded-full bg-[#f5c542] border border-[#8b5e2a] inline-block" /> Unlocked</span>
        <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 rounded-full bg-[#e8f5e0] border border-green-600 inline-block" /> Mastered</span>
        <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 rounded-full bg-stone-100 border border-stone-300 inline-block" /> Locked</span>
      </div>
    </div>
  );
}
