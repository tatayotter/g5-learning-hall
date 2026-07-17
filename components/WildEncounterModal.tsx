'use client';
import { useState, useEffect } from 'react';
import { MonsterDef } from '@/lib/monsterConfig';
import { playMonsterAppear, playChime, playClash } from '@/lib/sounds';

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

  const choices = [
    { key: 'a', text: question.choice_a },
    { key: 'b', text: question.choice_b },
    { key: 'c', text: question.choice_c },
    { key: 'd', text: question.choice_d },
  ];

  const handleAnswer = (key: string) => {
    if (selected) return;
    setSelected(key);
    const isCorrect = key === question.correct_choice;
    if (isCorrect) playChime(); else playClash();
    setTimeout(() => {
      if (isCorrect) onCorrect();
      else onWrong();
    }, 800);
  };

  return (
    <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-amber-700 rounded-2xl p-6 sm:p-8 max-w-lg w-full battle-panel-in">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl battle-float">{monster.emoji}</span>
          <div>
            <p className="text-amber-400 font-bold text-lg">A wild {monster.name} appeared!</p>
            <p className="text-xs text-gray-500 capitalize">Lv.{level} · {monster.element}</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Answer correctly to challenge it — {attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} left before it flees.
        </p>

        {question.passage && (
          <p className="text-xs text-gray-500 mb-2 italic">{question.passage}</p>
        )}
        <p className="text-white font-bold mb-4">{question.question}</p>

        <div className="space-y-3">
          {choices.map(c => {
            const isSelected = selected === c.key;
            const isCorrect = c.key === question.correct_choice;
            let style = 'border-neutral-700 hover:border-neutral-500';
            let feedbackAnim = '';
            if (selected) {
              if (isSelected && isCorrect) { style = 'border-green-500 bg-green-900/30'; feedbackAnim = 'battle-answer-correct'; }
              else if (isSelected && !isCorrect) { style = 'border-red-500 bg-red-900/30'; feedbackAnim = 'battle-answer-wrong'; }
              else if (isCorrect) style = 'border-green-500 bg-green-900/20';
            }
            return (
              <button
                key={c.key}
                onClick={() => handleAnswer(c.key)}
                disabled={!!selected}
                className={`w-full text-left p-3 rounded-xl border-2 text-gray-200 transition-all btn-tactile ${style} ${feedbackAnim}`}
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
