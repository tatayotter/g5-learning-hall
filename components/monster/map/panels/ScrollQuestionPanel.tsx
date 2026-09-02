'use client';
// Training-scroll question panel — shown by TrainingMap.tsx when the player
// walks onto a scroll tile (activeScroll). Wraps the shared
// BattleQuestionModal with the "your monster is practicing" framing; the
// exp/level-up side effects of onComplete stay owned by TrainingMap.tsx
// (handleScrollAnswer) since they touch battleState, monster exp, and the
// scroll respawn/trainer-spawn/wild-encounter rolls together.
import { MonsterImage, BattleQuestionModal } from '@/components/battle/shared';
import { BATTLE_CONSTANTS, type MonsterDef } from '@/lib/monsterConfig';

interface ScrollQuestionPanelProps {
  activeMonsterDef?: MonsterDef;
  activeMonsterExpToNext: number | null;
  questions: any[];
  gradingUserId: string;
  onComplete: (correctCount: number, answeredQuestions: any[]) => void;
}

export default function ScrollQuestionPanel({ activeMonsterDef, activeMonsterExpToNext, questions, gradingUserId, onComplete }: ScrollQuestionPanelProps) {
  return (
    <div className="w-full max-w-xl bg-[#f5e8c8] border-2 border-[#8b5e2a] rounded-2xl p-4 max-h-full overflow-y-auto battle-panel-in">
      <div className="flex items-center gap-3 mb-3 bg-amber-100 border border-amber-300 rounded-xl px-3 py-2">
        {activeMonsterDef && (
          <MonsterImage monster={activeMonsterDef} className="w-10 h-10 flex-shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-stone-900 font-bold text-sm leading-tight">
            {activeMonsterDef ? activeMonsterDef.name : 'Your monster'} is practicing!
          </p>
          <p className="text-xs text-stone-600 leading-tight">
            Answer correctly → <span className="text-amber-600 font-bold">+{BATTLE_CONSTANTS.MONSTER_EXP_PER_GRASS_ANSWER} EXP</span>
            {activeMonsterExpToNext !== null && (
              <span className="text-stone-400 text-[11px] ml-1">({activeMonsterExpToNext} to next level)</span>
            )}
          </p>
        </div>
      </div>
      <BattleQuestionModal
        questions={questions}
        count={1}
        embedded={true}
        gradingUserId={gradingUserId}
        onComplete={onComplete}
      />
    </div>
  );
}
