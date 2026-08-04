'use client';
// components/battle/shared.tsx
// Types/components shared between the solo BattleScreen (components/MonsterGuild.tsx)
// and the live LiveBattleScreen (components/LiveBattleScreen.tsx). Pulled out of
// MonsterGuild.tsx rather than imported from it, so neither battle screen has to
// import the other (avoids a circular import between the two).
import { useState } from 'react';
import { MonsterDef, StatusEffect, ActiveModifier, statusDuration } from '@/lib/monsterConfig';
import { gradeMonsterQuestion } from '@/lib/guildEngine';
import { QualityTier } from '@/lib/curioQuality';

export interface UserMonster {
  id: string;
  user_id: string;
  monster_id: string;
  nickname: string | null;
  monster_exp: number;
  monster_level: number;
  slot: number | null; // null = benched (owned, but not in the active team)
  rest_used: number;
  equipped_skills: (string | null)[];
  graduation_tier: number; // 0 = ungraduated; see MonsterDef.graduation in lib/monsterConfig.ts
  quality: QualityTier; // see lib/curioQuality.ts — boosts HP/Attack via getScaledStats
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
  modifiers?: ActiveModifier[];
}

// Small gold "Legendary" badge overlaid on the top-right corner of a
// monster's sprite/emoji. Rendered by MonsterImage itself so every call
// site — battle screens, guild roster, leaderboard, splash, etc — gets the
// tag for free without needing to know which monsters are legendary.
export function LegendaryBadge() {
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

// ─── ATTACK SEQUENCING ──────────────────────────────────────────────────────
// Shared between BattleScreen (components/MonsterGuild.tsx) and
// LiveBattleScreen — one "beat" is a single attack/counter-attack shown for a
// fixed window before the next beat (or the caller's onDone) fires, so a
// fight plays out deliberately instead of resolving instantly.

export const BATTLE_BEAT_MS = 2600;

export interface BattleBeat {
  actor: 'player' | 'opponent';
  message: string;
  iconSrc: string | null;
  damage: number | null;
  missed: boolean;
  // Applies this beat's queued state change (HP/status/etc) at the moment
  // the beat starts, so the number on screen always matches the HP bar.
  apply: () => void;
}

// Walks `beats` one at a time, each visible for BATTLE_BEAT_MS: applies the
// beat's queued state change and hands it to onBeat (to trigger the banner /
// damage number / shake anim), waits out the window, then either moves to
// the next beat or calls onDone once the last one's window closes.
export function runBattleBeats(beats: BattleBeat[], onBeat: (beat: BattleBeat) => void, onDone: () => void) {
  if (beats.length === 0) {
    onDone();
    return;
  }
  let i = 0;
  const step = () => {
    const beat = beats[i];
    beat.apply();
    onBeat(beat);
    i++;
    setTimeout(() => {
      if (i < beats.length) step();
      else onDone();
    }, BATTLE_BEAT_MS);
  };
  step();
}

// Pulsing overlay text shown during a beat — "X used Y!" — with the acting
// skill's element icon alongside it. Shared by both battle screens so PvP
// gets the same clear per-hit feedback the solo screen has always had.
export function AttackBanner({ text, iconSrc }: { text: string; iconSrc: string | null }) {
  return (
    <div className="battle-banner-text text-center py-4 text-2xl text-amber-300 animate-pulse flex items-center justify-center gap-2">
      {iconSrc && <img src={iconSrc} alt="" className="w-7 h-7 object-contain" />}
      {text}
    </div>
  );
}

// Floating damage number over a monster's sprite — keyed by the caller on
// each new hit so the rise-and-fade animation replays every time.
export function DamageNumber({ value, missed }: { value: number; missed: boolean }) {
  return (
    <span
      className={`damage-number absolute left-1/2 top-0 -translate-x-1/2 pointer-events-none select-none ${
        missed ? 'dmg-text-miss' : 'dmg-text-hit'
      }`}
    >
      {missed ? 'Miss!' : `-${value}`}
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
  // Whose weekly package to grade against, and which week — the `questions`
  // array comes from weekly_packages_public (correct_answer stripped), so
  // correctness has to be checked server-side via grade_monster_question.
  gradingUserId: string;
  weekStartingDate: string;
  onComplete: (correctCount: number, answeredQuestions: any[]) => void;
}

export function BattleQuestionModal({ questions, count, embedded, gradingUserId, weekStartingDate, onComplete }: BattleQuestionProps) {
  // A skill can ask for more questions than are actually available (e.g. a
  // tier-3 skill needs 3, but the player's unseen-question pool for that
  // subject has only 2 left) — capping to the pool's own length here, and
  // using it (not the requested `count`) as the completion bound below, is
  // what keeps the modal from advancing past the last real question into an
  // undefined one and softlocking with nothing left to click.
  const [pool] = useState(() => shuffleArray(questions).slice(0, count).map(q =>
    Array.isArray(q.options) ? { ...q, options: shuffleArray(q.options) } : q
  ));
  const askedCount = pool.length;
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [grading, setGrading] = useState(false);
  const [revealedCorrect, setRevealedCorrect] = useState<string | null>(null);
  const [results, setResults] = useState<boolean[]>([]);

  const current = pool[index];
  if (!current) return null;

  const handleAnswer = async (opt: string) => {
    if (selected || grading) return;
    setSelected(opt);
    setGrading(true);
    const questionText = current.question || current.problem_prompt;
    const { correct: isCorrect, correctAnswer } = await gradeMonsterQuestion(gradingUserId, weekStartingDate, questionText, opt);
    setGrading(false);
    setRevealedCorrect(correctAnswer);
    const newResults = [...results, isCorrect];
    setTimeout(() => {
      if (index + 1 >= askedCount) {
        onComplete(newResults.filter(Boolean).length, pool);
      } else {
        setResults(newResults);
        setSelected(null);
        setRevealedCorrect(null);
        setIndex(i => i + 1);
      }
    }, 800);
  };

  // Keyed on index so each new question replays the entrance animation below,
  // rather than only playing once for the whole modal.
  const inner = (
    <div className={embedded ? 'mt-2' : 'bg-neutral-900 border border-neutral-700 rounded-2xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto battle-panel-in'}>
      <div key={index} className="battle-panel-in">
        <p className="text-xs text-gray-500 mb-1.5 font-mono">Question {index + 1} of {askedCount}</p>
        <p className="text-base font-bold text-white mb-3 leading-snug">{current.question || current.problem_prompt}</p>
        <div className="space-y-2">
        {(current.options || []).map((opt: any) => {
          const key = typeof opt === 'string' ? opt : opt.key;
          const text = typeof opt === 'string' ? opt : opt.text;
          const isSelected = selected === key;
          const isCorrect = revealedCorrect !== null && key === revealedCorrect;
          let style = 'border-neutral-700 hover:border-neutral-500';
          let feedbackAnim = '';
          if (revealedCorrect !== null) {
            if (isSelected && isCorrect) { style = 'border-green-500 bg-green-900/30'; feedbackAnim = 'battle-answer-correct'; }
            else if (isSelected && !isCorrect) { style = 'border-red-500 bg-red-900/30'; feedbackAnim = 'battle-answer-wrong'; }
            else if (isCorrect) style = 'border-green-500 bg-green-900/20';
          }
          return (
            <button
              key={key}
              onClick={() => handleAnswer(key)}
              disabled={!!selected}
              className={`w-full text-left p-3 rounded-xl border-2 text-gray-200 transition-all btn-tactile ${style} ${feedbackAnim}`}
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

// Perk badge for Tatay's kids — Damien and Tala are always USERS[id].isFamily.
export function GMBadge() {
  return <span title="GM" className="text-xs leading-none">👑</span>;
}

export interface ItemEffectResult {
  logMessage: string;
  healAmount?: number;
  selfStatus?: { status: StatusEffect; statusTurns: number };
  opponentStatus?: { status: StatusEffect; statusTurns: number };
}

// Shared by the solo BattleScreen and the live PvP LiveBattleScreen — was
// previously an identical switch statement copy-pasted into both, which
// meant a new consumable item type (or a tweak to an existing one's
// duration/amount) had to be edited in two places to stay consistent. It
// already hadn't: solo battles applied inflict_curse for a hardcoded 3
// turns while live battles correctly used BATTLE_CONSTANTS.CURSE_DURATION_TURNS
// (2) — unified on the named constant here.
export function resolveItemEffect(item: { name: string; effect?: string }, opponentLabel: string = 'Enemy'): ItemEffectResult {
  switch (item.effect) {
    case 'heal_30':
    case 'heal_60':
    case 'heal_120': {
      const healAmount = Number(item.effect.split('_')[1]);
      return { logMessage: `🧪 Used ${item.name}: Restored ${healAmount} HP!`, healAmount };
    }
    case 'atk_boost_1t':
      return { logMessage: `⚔️ Used ${item.name}: Attack boosted!`, selfStatus: { status: 'atk_boost', statusTurns: statusDuration('atk_boost') } };
    case 'def_boost_1t':
      return { logMessage: `🛡️ Used ${item.name}: Defense boosted!`, selfStatus: { status: 'def_boost', statusTurns: statusDuration('def_boost') } };
    case 'apply_blessed':
      return { logMessage: `✨ Used ${item.name}: Blessed status applied!`, selfStatus: { status: 'blessed', statusTurns: statusDuration('blessed') } };
    case 'cure_status':
      return { logMessage: `💊 Used ${item.name}: Status conditions cured!`, selfStatus: { status: null, statusTurns: 0 } };
    case 'inflict_curse':
      return { logMessage: `💀 Used ${item.name}: ${opponentLabel} is now Cursed!`, opponentStatus: { status: 'curse', statusTurns: statusDuration('curse') } };
    default:
      return { logMessage: `Used ${item.name}!` };
  }
}

// Whether a skill tier slot should render locked, and the level it unlocks
// at if so — shared because both battle screens implement the exact same
// rule: a slot customized via the Compendium (unlearned and/or re-taught)
// is usable immediately regardless of level, so only a still-default slot
// stays gated by the species' skillUnlocks.
export function getSkillSlotLock(
  equippedSkillsRaw: (string | null)[] | undefined,
  def: MonsterDef,
  tier: 1 | 2 | 3,
  availableTiers: number[],
): { isLocked: boolean; requiredLevel: number } {
  const isCustomized = equippedSkillsRaw?.[tier - 1] != null;
  const isLocked = !isCustomized && !availableTiers.includes(tier);
  const requiredLevel = tier === 2 ? def.skillUnlocks.tier2 : def.skillUnlocks.tier3;
  return { isLocked, requiredLevel };
}
