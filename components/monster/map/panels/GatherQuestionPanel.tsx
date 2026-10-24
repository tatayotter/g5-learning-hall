'use client';
// Wild veggie pick panel: shown by TrainingMap.tsx when the player walks onto a ripe plant
// (hooks/useGarden.ts). One question; a right answer puts the veggie in the bag. Grading goes
// through the garden hook (gather_wild_plant online, the answer key offline), and TrainingMap
// shows what came of it.
import { BattleQuestionModal, type BattleQuestion, type GradeResult } from '@/components/battle/shared';
import GameButton from '@/components/GameButton';
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
    <div className="w-full max-w-xl bg-[#f5e8c8] border-2 border-[#8b5e2a] rounded-2xl p-4 max-h-full overflow-y-auto battle-panel-in" data-testid="gather-panel">
      <div className="flex items-center gap-3 mb-3 bg-[#e3f1cf] border border-[#7a9a4a] rounded-xl px-3 py-2">
        <img src={gardenItemIcon(veggieKey(veggie))} alt="" className="w-10 h-10 flex-shrink-0 object-contain" style={{ imageRendering: 'pixelated' }} />
        <div className="min-w-0">
          <p className="text-stone-900 font-bold text-sm leading-tight">{def.found ? `A pretty ${def.label.toLowerCase()}!` : `A ripe ${def.label.toLowerCase()}!`}</p>
          <p className="text-xs text-stone-600 leading-tight">Answer right to {def.found ? 'pick it up' : 'pick it'} and put it in your bag.</p>
        </div>
      </div>
      <BattleQuestionModal
        questions={questions}
        count={1}
        embedded={true}
        gradingUserId={gradingUserId}
        gradeOverride={grade}
        onComplete={onComplete}
      />
      <GameButton variant="quest" color="#57534e" onClick={onLeave} className="w-full mt-3" style={{ fontSize: 13 }} data-testid="gather-leave">
        Leave it for now
      </GameButton>
    </div>
  );
}
