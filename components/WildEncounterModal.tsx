'use client';
import { useState, useEffect } from 'react';
import { MonsterDef } from '@/lib/monsterConfig';
import { playMonsterAppear, playChime, playClash } from '@/lib/sounds';
import { MonsterImage } from '@/components/battle/shared';

// Proper Fisher-Yates — sort(() => Math.random() - 0.5) looks equivalent but
// is heavily biased (see components/battle/shared.tsx's shuffleArray).
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

interface WildEncounterModalProps {
  monster: MonsterDef;
  level: number;
  question: any;
  attemptsLeft: number;
  onCorrect: () => void;
  onWrong: () => void;
}

export default function WildEncounterModal({ monster, level, question, attemptsLeft, onCorrect, onWrong }: WildEncounterModalProps) {
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    playMonsterAppear();
  }, []);

  // Shuffled once per mount — the parent remounts this modal (keyed on
  // question.id) for every new question, so this never needs to re-shuffle
  // mid-question. Without it, correct_choice tends to sit in the same slot
  // across seed rows, letting a kid win every encounter by spam-clicking
  // that slot instead of answering (same bug fixed in Lorekeeper/LogicLabyrinth).
  const [choices] = useState(() => shuffle([
    { key: 'a', text: question.choice_a },
    { key: 'b', text: question.choice_b },
    { key: 'c', text: question.choice_c },
    { key: 'd', text: question.choice_d },
  ]));

  const handleAnswer = (key: string) => {
    if (selected) return;
    setSelected(key);
    const isCorrect = key.toLowerCase() === (question.correct_choice ?? '').toLowerCase();
    if (isCorrect) playChime(); else playClash();
    setTimeout(() => {
      if (isCorrect) onCorrect();
      else onWrong();
    }, 800);
  };

  return (
    <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-[#c9a87a] rounded-2xl p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto battle-panel-in">
        <div className="flex items-center gap-3 mb-2">
          <MonsterImage monster={monster} className="w-12 h-12 battle-float" emojiClassName="text-4xl" />
          <div>
            <p className="text-[#c9781a] font-bold text-lg flex items-center gap-1.5">
              <img src="/icons/encounter/cage.svg" alt="Wild encounter" className="w-6 h-6" /> A wild {monster.name} appeared!
            </p>
            <p className="text-xs text-[#6b4820] capitalize">Lv.{level} · {monster.element}</p>
          </div>
        </div>
        <p className="text-xs text-[#6b4820] mb-4">
          Answer correctly to challenge it — {attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} left before it flees.
        </p>

        {question.passage && (
          <p className="text-xs text-[#6b4820] mb-2 italic">{question.passage}</p>
        )}
        <p className="text-[#2a1505] font-bold mb-4">{question.question}</p>

        <div className="space-y-3">
          {choices.map(c => {
            const isSelected = selected === c.key;
            // Guard: correct_choice may be null if a question was inserted without it.
            // Moving this inside the `if (selected)` block also avoids computing it
            // on every render before the player has answered — previously it ran
            // unconditionally and crashed the component on mount when correct_choice
            // was null (TypeError: null.toLowerCase).
            const correctChoice = (question.correct_choice ?? '').toLowerCase();
            // Semantic feedback colors stay standard Tailwind, not re-themed
            // to brown (docs/STYLE_GUIDE.md) — default option is the usual
            // white/parchment-bordered tile.
            let style = 'bg-white border-[#c9a87a] hover:border-[#c9781a] hover:bg-[#f0ddb8] text-[#2a1505]';
            let feedbackAnim = '';
            if (selected) {
              const isCorrect = c.key.toLowerCase() === correctChoice;
              if (isSelected && isCorrect) { style = 'border-green-600 bg-green-100 text-[#2a1505]'; feedbackAnim = 'battle-answer-correct'; }
              else if (isSelected && !isCorrect) { style = 'border-red-500 bg-red-100 text-red-700'; feedbackAnim = 'battle-answer-wrong'; }
              else if (isCorrect) style = 'border-green-600 bg-green-50 text-[#2a1505]';
            }
            return (
              <button
                key={c.key}
                onClick={() => handleAnswer(c.key)}
                disabled={!!selected}
                className={`w-full text-left p-3 rounded-xl border-2 transition-all btn-tactile ${style} ${feedbackAnim}`}
              >
                {c.text}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
