'use client';
// components/battle/shared.tsx
// Types/components shared between the solo BattleScreen (components/MonsterGuild.tsx)
// and the live LiveBattleScreen (components/LiveBattleScreen.tsx). Pulled out of
// MonsterGuild.tsx rather than imported from it, so neither battle screen has to
// import the other (avoids a circular import between the two).
import { useState } from 'react';
import { MonsterDef, StatusEffect } from '@/lib/monsterConfig';

export interface UserMonster {
  id: string;
  user_id: string;
  monster_id: string;
  nickname: string | null;
  monster_exp: number;
  monster_level: number;
  slot: number;
  rest_used: number;
}

export interface ActiveBattleMonster {
  def: MonsterDef;
  level: number;
  currentHp: number;
  maxHp: number;
  status: StatusEffect;
  statusTurns: number;
  restUsed: number;
  userMonster?: UserMonster;
}

// Renders a monster's sprite, falling back to its emoji if the sprite image
// 404s or the monster has no id to look up.
export function MonsterImage({ monster, className = '', emojiClassName = 'text-3xl' }: {
  monster: { id: string; name: string; emoji: string } | undefined | null;
  className?: string;
  emojiClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!monster) return null;
  if (failed) {
    return (
      <span className={`flex items-center justify-center ${className} ${emojiClassName}`}>
        {monster.emoji}
      </span>
    );
  }
  return (
    <img
      src={`/monsters/${monster.id}.webp`}
      alt={monster.name}
      className={`object-contain ${className}`}
      onError={() => setFailed(true)}
    />
  );
}

function shuffleArray<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export interface BattleQuestionProps {
  questions: any[];
  count: number;
  embedded?: boolean;
  onComplete: (correctCount: number, answeredQuestions: any[]) => void;
}

export function BattleQuestionModal({ questions, count, embedded, onComplete }: BattleQuestionProps) {
  const [pool] = useState(() => shuffleArray(questions).slice(0, count));
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [results, setResults] = useState<boolean[]>([]);

  const current = pool[index];
  if (!current) return null;

  const handleAnswer = (opt: string) => {
    if (selected) return;
    setSelected(opt);
    const isCorrect = opt === current.correct_answer || opt === current.correct || opt === current.correct_choice;
    const newResults = [...results, isCorrect];
    setTimeout(() => {
      if (index + 1 >= count) {
        onComplete(newResults.filter(Boolean).length, pool);
      } else {
        setResults(newResults);
        setSelected(null);
        setIndex(i => i + 1);
      }
    }, 800);
  };

  const inner = (
    <div className={embedded ? 'mt-2' : 'bg-neutral-900 border border-neutral-700 rounded-2xl p-8 max-w-lg w-full'}>
      <p className="text-xs text-gray-500 mb-2 font-mono">Question {index + 1} of {count}</p>
      <p className="text-lg font-bold text-white mb-6">{current.question || current.problem_prompt}</p>
      <div className="space-y-3">
        {(current.options || []).map((opt: any) => {
          const key = typeof opt === 'string' ? opt : opt.key;
          const text = typeof opt === 'string' ? opt : opt.text;
          const isSelected = selected === key;
          const isCorrect = key === current.correct_answer || key === current.correct || key === current.correct_choice;
          let style = 'border-neutral-700 hover:border-neutral-500';
          if (selected) {
            if (isSelected && isCorrect) style = 'border-green-500 bg-green-900/30';
            else if (isSelected && !isCorrect) style = 'border-red-500 bg-red-900/30';
            else if (isCorrect) style = 'border-green-500 bg-green-900/20';
          }
          return (
            <button
              key={key}
              onClick={() => handleAnswer(key)}
              disabled={!!selected}
              className={`w-full text-left p-4 rounded-xl border-2 text-gray-200 transition-all ${style}`}
            >
              {text}
            </button>
          );
        })}
      </div>
    </div>
  );

  if (embedded) return inner;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      {inner}
    </div>
  );
}
