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

// Small gold "Legendary" badge overlaid on the top-right corner of a
// monster's sprite/emoji. Rendered by MonsterImage itself so every call
// site — battle screens, guild roster, leaderboard, splash, etc — gets the
// tag for free without needing to know which monsters are legendary.
function LegendaryBadge() {
  return (
    <span
      className="absolute -top-1 -right-1 leading-none text-[0.7em] drop-shadow-[0_0_2px_rgba(0,0,0,0.8)] pointer-events-none select-none"
      title="Legendary"
    >
      👑
    </span>
  );
}

// Renders a monster's sprite, falling back to its emoji if the sprite image
// 404s or the monster has no id to look up.
export function MonsterImage({ monster, className = '', emojiClassName = 'text-3xl' }: {
  monster: { id: string; name: string; emoji: string; isLegendary?: boolean; spriteId?: string } | undefined | null;
  className?: string;
  emojiClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!monster) return null;
  if (failed) {
    return (
      <span className={`relative inline-flex items-center justify-center ${className} ${emojiClassName}`}>
        {monster.emoji}
        {monster.isLegendary && <LegendaryBadge />}
      </span>
    );
  }
  return (
    <span className={`relative inline-flex ${className}`}>
      <img
        src={`/monsters/${monster.spriteId ?? monster.id}.webp`}
        alt={monster.name}
        className="w-full h-full object-contain"
        onError={() => setFailed(true)}
      />
      {monster.isLegendary && <LegendaryBadge />}
    </span>
  );
}

// A proper Fisher-Yates shuffle — NOT sort(() => Math.random() - 0.5), which
// looks equivalent but is heavily biased (comparator-based sorts assume a
// consistent comparator, and a random one isn't). That bias was the actual
// cause of the same handful of questions resurfacing far more often than the
// rest of the pool, even though the "already answered" exclusion logic
// upstream (lib/guildEngine.ts) was working correctly.
function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export interface BattleQuestionProps {
  questions: any[];
  count: number;
  embedded?: boolean;
  onComplete: (correctCount: number, answeredQuestions: any[]) => void;
}

export function BattleQuestionModal({ questions, count, embedded, onComplete }: BattleQuestionProps) {
  // A skill can ask for more questions than are actually available (e.g. a
  // tier-3 skill needs 3, but the player's unseen-question pool for that
  // subject has only 2 left) — capping to the pool's own length here, and
  // using it (not the requested `count`) as the completion bound below, is
  // what keeps the modal from advancing past the last real question into an
  // undefined one and softlocking with nothing left to click.
  const [pool] = useState(() => shuffleArray(questions).slice(0, count));
  const askedCount = pool.length;
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
      if (index + 1 >= askedCount) {
        onComplete(newResults.filter(Boolean).length, pool);
      } else {
        setResults(newResults);
        setSelected(null);
        setIndex(i => i + 1);
      }
    }, 800);
  };

  // Keyed on index so each new question replays the entrance animation below,
  // rather than only playing once for the whole modal.
  const inner = (
    <div className={embedded ? 'mt-2' : 'bg-neutral-900 border border-neutral-700 rounded-2xl p-8 max-w-lg w-full battle-panel-in'}>
      <div key={index} className="battle-panel-in">
        <p className="text-xs text-gray-500 mb-2 font-mono">Question {index + 1} of {askedCount}</p>
        <p className="text-lg font-bold text-white mb-6">{current.question || current.problem_prompt}</p>
        <div className="space-y-3">
        {(current.options || []).map((opt: any) => {
          const key = typeof opt === 'string' ? opt : opt.key;
          const text = typeof opt === 'string' ? opt : opt.text;
          const isSelected = selected === key;
          const isCorrect = key === current.correct_answer || key === current.correct || key === current.correct_choice;
          let style = 'border-neutral-700 hover:border-neutral-500';
          let feedbackAnim = '';
          if (selected) {
            if (isSelected && isCorrect) { style = 'border-green-500 bg-green-900/30'; feedbackAnim = 'battle-answer-correct'; }
            else if (isSelected && !isCorrect) { style = 'border-red-500 bg-red-900/30'; feedbackAnim = 'battle-answer-wrong'; }
            else if (isCorrect) style = 'border-green-500 bg-green-900/20';
          }
          return (
            <button
              key={key}
              onClick={() => handleAnswer(key)}
              disabled={!!selected}
              className={`w-full text-left p-4 rounded-xl border-2 text-gray-200 transition-all btn-tactile ${style} ${feedbackAnim}`}
            >
              {text}
            </button>
          );
        })}
        </div>
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
