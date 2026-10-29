'use client';
// Training-scroll question panel — shown by TrainingMap.tsx when the player
// reads a scroll on the map (activeScroll). Wraps the shared
// BattleQuestionModal with the "your curio is practicing" framing, in the in-game pop-up
// frame (components/game/GamePopup.tsx); the
// exp/level-up side effects of onComplete stay owned by TrainingMap.tsx
// (handleScrollAnswer) since they touch battleState, monster exp, and the
// scroll respawn/trainer-spawn/wild-encounter rolls together.
import { MonsterImage, BattleQuestionModal } from '@/components/battle/shared';
import type { BattleQuestion } from '@/components/battle/shared';
import GamePopup from '@/components/game/GamePopup';
import { BATTLE_CONSTANTS, type MonsterDef } from '@/lib/monsterConfig';

interface ScrollQuestionPanelProps {
  activeMonsterDef?: MonsterDef;
  activeMonsterExpToNext: number | null;
  questions: BattleQuestion[];
  gradingUserId: string;
  // Offline, the map grades from the downloaded answer key (lib/offlineMap.ts).
  gradeOverride?: (question: BattleQuestion, selected: string) => { correct: boolean; correctAnswer: string | null };
  onComplete: (correctCount: number, answeredQuestions: BattleQuestion[]) => void;
  // Put the scroll down without answering (it stays on the map).
  onClose: () => void;
}

export default function ScrollQuestionPanel({ activeMonsterDef, activeMonsterExpToNext, questions, gradingUserId, gradeOverride, onComplete, onClose }: ScrollQuestionPanelProps) {
  return (
    <GamePopup
      inline
      title={`${activeMonsterDef ? activeMonsterDef.name : 'Your curio'} is practicing!`}
      subtitle={`Answer right: +${BATTLE_CONSTANTS.MONSTER_EXP_PER_GRASS_ANSWER} EXP${activeMonsterExpToNext !== null ? ` (${activeMonsterExpToNext} to the next level)` : ''}`}
      icon={activeMonsterDef ? <MonsterImage monster={activeMonsterDef} className="w-12 h-12 mt-1" /> : <img src="/sprite/question-scroll.png" alt="" className="w-10 h-10 mt-2 object-contain" style={{ imageRendering: 'pixelated' }} />}
      onClose={onClose}
      testId="scroll-panel"
    >
      <BattleQuestionModal
        questions={questions}
        count={1}
        embedded={true}
        gradingUserId={gradingUserId}
        gradeOverride={gradeOverride}
        onComplete={onComplete}
      />
    </GamePopup>
  );
}
