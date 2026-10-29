'use client';
// Wild veggie pick panel: shown by TrainingMap.tsx when the player walks onto a ripe plant
// (hooks/useGarden.ts). One question; a right answer puts the veggie in the bag. Grading goes
// through the garden hook (gather_wild_plant online, the answer key offline), and TrainingMap
// shows what came of it.
import { BattleQuestionModal, type BattleQuestion, type GradeResult } from '@/components/battle/shared';
import GamePopup from '@/components/game/GamePopup';
import { VEGGIES, gardenItemIcon, veggieKey, type VeggieId } from '@/lib/gardenConfig';

interface GatherQuestionPanelProps {
  veggie: VeggieId;
  questions: BattleQuestion[];
  gradingUserId: string;
  grade: (question: BattleQuestion, selected: string) => Promise<GradeResult>;
  onComplete: (correctCount: number, answeredQuestions: BattleQuestion[]) => void;
  onLeave: () => void;
}

export default function GatherQuestionPanel({ veggie, questions, gradingUserId, grade, onComplete, onLeave }: GatherQuestionPanelProps) {
  const def = VEGGIES[veggie];
  return (
    <GamePopup
      inline
      title={def.found ? `A pretty ${def.label.toLowerCase()}!` : `A ripe ${def.label.toLowerCase()}!`}
      subtitle={`Answer right to ${def.found ? 'pick it up' : 'pick it'} and put it in your bag.`}
      icon={<img src={gardenItemIcon(veggieKey(veggie))} alt="" className="w-10 h-10 mt-2 object-contain" style={{ imageRendering: 'pixelated' }} />}
      onClose={onLeave}
      testId="gather-panel"
    >
      <BattleQuestionModal
        questions={questions}
        count={1}
        embedded={true}
        gradingUserId={gradingUserId}
        gradeOverride={grade}
        onComplete={onComplete}
      />
    </GamePopup>
  );
}
