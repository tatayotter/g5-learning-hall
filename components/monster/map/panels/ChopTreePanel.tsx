'use client';
// Wild tree chop panel: shown by TrainingMap.tsx when the player walks onto a ribboned tree's
// trunk (hooks/useGarden.ts). One question per swing; a right answer lands a swing and fills a
// pip, CHOP_SWINGS of them fell the tree. Grading goes through the garden hook
// (chop_wild_tree online, the answer key offline). After each answer TrainingMap says whether
// to ask another (onAnswered returns true) or close.
import { useMemo, useState } from 'react';
import { BattleQuestionModal, type BattleQuestion, type GradeResult } from '@/components/battle/shared';
import GameButton from '@/components/GameButton';
import { CHOP_SWINGS, TREES, WOOD_PER_TREE, type TreeId } from '@/lib/gardenConfig';

interface ChopTreePanelProps {
  tree: TreeId;
  // Swings already landed (a chop can be finished later).
  hits: number;
  questions: BattleQuestion[];
  gradingUserId: string;
  grade: (question: BattleQuestion, selected: string) => Promise<GradeResult>;
  // After each answer: true asks the next question, false closes the panel.
  onAnswered: (answered: BattleQuestion[]) => boolean;
  onLeave: () => void;
}

export default function ChopTreePanel({ tree, hits, questions, gradingUserId, grade, onAnswered, onLeave }: ChopTreePanelProps) {
  const [asked, setAsked] = useState<string[]>([]);
  // A question already asked in this chop isn't asked again (unless they all have been).
  const pool = useMemo(() => {
    const fresh = questions.filter(q => !asked.includes(q.id));
    return fresh.length > 0 ? fresh : questions;
  }, [questions, asked]);
  const label = TREES[tree].label;
  return (
    <div className="w-full max-w-xl bg-[#f5e8c8] border-2 border-[#8b5e2a] rounded-2xl p-4 max-h-full overflow-y-auto battle-panel-in" data-testid="chop-panel">
      <div className="flex items-center gap-3 mb-3 bg-[#e3f1cf] border border-[#7a9a4a] rounded-xl px-3 py-2">
        {/* The tree itself (the ready frame of its art), shaking each time a swing lands. */}
        <div
          key={hits}
          className={`w-10 h-[60px] flex-shrink-0 ${hits > 0 ? 'chop-shake' : ''}`}
          style={{ backgroundImage: `url(/garden/tree_${tree}.png)`, backgroundSize: '160px 60px', backgroundPosition: '0 0', imageRendering: 'pixelated' }}
          aria-hidden="true"
          data-testid="chop-tree"
        />
        <div className="min-w-0 flex-1">
          <p className="text-stone-900 font-bold text-sm leading-tight">A ribbon {label.toLowerCase()} tree!</p>
          <p className="text-xs text-stone-600 leading-tight">
            Each right answer is one swing. {CHOP_SWINGS} swings chop it for {WOOD_PER_TREE} wood. No misses for a bonus sapling!
          </p>
        </div>
        <div className="flex gap-1 flex-shrink-0" aria-label={`${hits} of ${CHOP_SWINGS} swings`} data-testid="chop-meter" data-hits={hits}>
          {Array.from({ length: CHOP_SWINGS }, (_, i) => (
            <span
              key={i}
              className={`w-4 h-4 rounded-full border-2 border-[#5a3a14] transition-colors duration-300 ${i < hits ? 'bg-[#7fae3e]' : 'bg-[#f5e8c8]'} ${i === hits - 1 ? 'chop-pip-pop' : ''}`}
            />
          ))}
        </div>
      </div>
      <BattleQuestionModal
        key={asked.length}
        questions={pool}
        count={1}
        embedded={true}
        gradingUserId={gradingUserId}
        gradeOverride={grade}
        onComplete={(_n, answered) => {
          if (onAnswered(answered)) setAsked(a => [...a, ...answered.map(q => q.id)]);
        }}
      />
      <GameButton variant="quest" color="#57534e" onClick={onLeave} className="w-full mt-3" style={{ fontSize: 13 }} data-testid="chop-leave">
        Stop for now
      </GameButton>
    </div>
  );
}
