'use client';
// Wild encounter: tapping a wild curio on the map opens this. The curio
// appears on the shared curio event stage (components/curio/CurioEventKit.tsx)
// with its level/element/quality, and the kid answers a question on a white
// quiz card (the content layer, per docs/STYLE_GUIDE.md) to challenge it.
// A miss costs one try; the parent swaps in a new question (remounting this,
// keyed on question.id) until the tries run out and the curio flees.
import { useState, useEffect } from 'react';
import { MonsterDef } from '@/lib/monsterConfig';
import { QualityTier } from '@/lib/curioQuality';
import { playMonsterAppear, playChime, playClash } from '@/lib/sounds';
import { QUIZ_OPTION_STYLES } from '@/components/GameButton';
import { CurioEventFrame, CurioSpotlight, ElementPill, QualityPill, TEXT_SHADOW } from '@/components/curio/CurioEventKit';

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

interface WildEncounterQuestion {
  question: string;
  passage?: string | null;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_choice: string | null;
}

interface WildEncounterModalProps {
  monster: MonsterDef;
  level: number;
  quality?: QualityTier;
  question: WildEncounterQuestion;
  attemptsLeft: number;
  maxAttempts?: number; // matches the attemptsLeft a map curio spawns with (MonsterGuild)
  onCorrect: () => void;
  onWrong: () => void;
}

export default function WildEncounterModal({ monster, level, quality, question, attemptsLeft, maxAttempts = 3, onCorrect, onWrong }: WildEncounterModalProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  // Only the first question of an encounter plays the landing hop; after a
  // miss the curio is already standing there.
  const [firstQuestion] = useState(() => attemptsLeft >= maxAttempts);

  useEffect(() => {
    if (firstQuestion) playMonsterAppear();
  }, [firstQuestion]);

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

  // Guard: correct_choice may be null if a question was inserted without it.
  const correctChoice = (question.correct_choice ?? '').toLowerCase();

  const handleAnswer = (key: string) => {
    if (selected) return;
    setSelected(key);
    const isCorrect = key.toLowerCase() === correctChoice;
    setResult(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) playChime(); else playClash();
    setTimeout(() => {
      if (isCorrect) onCorrect();
      else onWrong();
    }, 800);
  };

  const triesAfter = result === 'wrong' ? attemptsLeft - 1 : attemptsLeft;

  // z-[95]: the training map renders fullscreen at z-[78] (see MapStage.tsx) with
  // joystick/drawers up to z-[81]; a plain z-50 opened this modal BEHIND the map
  // while movementLocked froze the player — the encounter looked like it did nothing.
  // Same layering fix as PlayerStatsPopup.
  return (
    <CurioEventFrame title="Wild Encounter" titleColor="#fdba74" zClass="z-[95]">
      <style>{QUIZ_OPTION_STYLES}</style>
      <CurioSpotlight def={monster} size="sm" land={firstQuestion} />

      <div className="mt-1">
        <p className="text-white font-bold text-lg sm:text-xl leading-tight" style={TEXT_SHADOW}>A wild {monster.name} appeared!</p>
        <div className="flex items-center justify-center gap-2 mt-1.5">
          <span className="inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full bg-black/35 border border-[#e8d0a0]/50 text-[#f5f0e8]">
            Lv.{level}
          </span>
          <ElementPill element={monster.element} />
          {quality && quality !== 'normal' && <QualityPill quality={quality} />}
        </div>
      </div>

      {/* Tries: one pip per answer the kid can still miss before it flees.
          The line beside them turns into the answer's result. */}
      <div className="flex items-center justify-center gap-2 mt-2 min-h-5 text-xs" style={TEXT_SHADOW}>
        <span key={result ?? 'ask'} className={result ? 'ce-rise text-white font-bold text-sm' : 'text-[#f5f0e8]'}>
          {result === 'correct'
            ? 'Correct! Get ready to battle!'
            : result === 'wrong'
              ? triesAfter > 0 ? 'Not quite! Here comes another question.' : `${monster.name} fled...`
              : 'Answer right to battle it.'}
        </span>
        <span className="inline-flex items-center gap-1" aria-label={`${triesAfter} of ${maxAttempts} tries left`}>
          {Array.from({ length: maxAttempts }, (_, i) => (
            <span
              key={i}
              className={`block w-2.5 h-2.5 rounded-full border transition-colors duration-300 ${
                i < triesAfter ? 'bg-[#f5c542] border-[#7a4a0f]' : 'bg-black/40 border-[#e8d0a0]/40'
              }`}
            />
          ))}
        </span>
      </div>

      {/* The question sits on a white quiz card: the content layer, so it
          reads like every other quiz in the game. */}
      <div className="mt-2 bg-white border-2 border-[#c9a87a] rounded-xl p-3 sm:p-4 text-left shadow-[0_4px_0_#8b5e2a]">
        {question.passage && (
          <p className="text-xs text-[#6b4820] mb-2 italic leading-snug">{question.passage}</p>
        )}
        <p className="text-[#2a1505] font-bold mb-2.5 leading-snug">{question.question}</p>

        <div className="space-y-2">
          {choices.map((c, idx) => {
            const label = ['A', 'B', 'C', 'D'][idx];
            const isSelected = selected === c.key;
            let state = '';
            if (selected) {
              const isCorrect = c.key.toLowerCase() === correctChoice;
              if (isSelected && isCorrect) state = 'correct';
              else if (isSelected && !isCorrect) state = 'wrong';
              else if (isCorrect) state = 'correct';
              else state = 'dim';
            }
            return (
              <button
                key={c.key}
                onClick={() => handleAnswer(c.key)}
                disabled={!!selected}
                className={`qopt ${state ? `qopt-${state}` : ''}`}
              >
                <span className="qopt-badge">{label}</span>
                <span className="qopt-text">{c.text}</span>
                {state === 'correct' && <span className="qopt-mark">✔</span>}
                {state === 'wrong' && <span className="qopt-mark">✖</span>}
              </button>
            );
          })}
        </div>
      </div>

    </CurioEventFrame>
  );
}
