// components/bonusquests/MtapCurioTraining.tsx
// Curio training for Bonus Quest (SEC) sets, the same step the main quest has
// (components/dashboard/board/ActiveQuestView.tsx): pick a curio before the set
// starts, and it earns Curio EXP when the set is finished. Shared by
// MtapQuizPlayer and MtapMixedTrainerPlayer.
//
// The curio earns SEC_TRAINING_EXP_PER_ANSWER for each answer that also paid the
// player XP (first-time correct), so replaying an already-mastered set can't be
// used to farm curio levels.
'use client';

import { useEffect, useRef, useState } from 'react';
import GameButton from '@/components/GameButton';
import CurioTrainingPicker, { OwnedCurio } from '@/components/dashboard/board/CurioTrainingPicker';
import type { TrainingResult } from '@/components/VictoryScreen';
import { grantCurioExp, SEC_TRAINING_EXP_PER_ANSWER } from '@/lib/curioTraining';

// `done` flips true when the set reaches its end screen; the award fires once then.
export function useSecCurioTraining(userId: string, weekStartingDate: string | null | undefined, done: boolean) {
  const [curio, setCurio] = useState<OwnedCurio | undefined>(undefined);
  const [newCorrect, setNewCorrect] = useState(0);
  const [result, setResult] = useState<TrainingResult | null>(null);
  const awarded = useRef(false);

  // Best-effort, like the main quest's award: the set's own reward never waits on it.
  useEffect(() => {
    if (!done || awarded.current || !curio || newCorrect <= 0 || !weekStartingDate) return;
    awarded.current = true;
    grantCurioExp(userId, curio, newCorrect * SEC_TRAINING_EXP_PER_ANSWER, weekStartingDate)
      .then(r => { if (r) setResult(r); });
  }, [done, curio, newCorrect, userId, weekStartingDate]);

  return {
    curio,
    setCurio,
    result,
    // Count one answer that earned the player XP.
    countNewCorrect: () => setNewCorrect(n => n + 1),
  };
}

export function MtapReadyScreen({ userId, label, detail, selectedId, onSelect, onStart, onBack }: {
  userId: string;
  label: string;
  detail: string;
  selectedId: string | undefined;
  onSelect: (curio: OwnedCurio) => void;
  onStart: () => void;
  onBack: () => void;
}) {
  return (
    <div className="bg-[#f0ddb8] border-[3px] border-[#8b5e2a] rounded-2xl p-6 sm:p-10 text-center shadow-2xl">
      <p className="text-[#c9781a] font-bold uppercase tracking-wider text-sm mb-2 font-display">{label}</p>
      <h2 className="text-3xl font-display font-bold text-[#2a1505] mb-3">Get Ready!</h2>
      <p className="text-[#6b4820] mb-6 max-w-sm mx-auto text-sm">{detail}</p>
      <CurioTrainingPicker
        userId={userId}
        selectedId={selectedId}
        onSelect={onSelect}
        rewardText={`It earns ${SEC_TRAINING_EXP_PER_ANSWER} EXP for every new question you get right in this set.`}
      />
      <div className="flex gap-4 justify-center">
        <GameButton variant="quest" color="#d4d4d4" onClick={onBack} style={{ fontSize: 15 }}>
          Back
        </GameButton>
        <GameButton variant="quest" color="#3b82f6" onClick={onStart} style={{ fontSize: 15 }}>
          Start
        </GameButton>
      </div>
    </div>
  );
}
