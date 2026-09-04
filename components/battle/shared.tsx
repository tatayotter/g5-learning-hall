'use client';
// components/battle/shared.tsx
// Types/components shared between the solo BattleScreen (components/MonsterGuild.tsx)
// and the live LiveBattleScreen (components/LiveBattleScreen.tsx). Pulled out of
// MonsterGuild.tsx rather than imported from it, so neither battle screen has to
// import the other (avoids a circular import between the two).
import { useState } from 'react';
import { MonsterDef, StatusEffect, ActiveModifier, statusDuration, BATTLE_CONSTANTS } from '@/lib/monsterConfig';
import { gradeMonsterQuestion } from '@/lib/guildEngine';
import { QualityTier } from '@/lib/curioQuality';
import InfoTag from '@/components/InfoTag';
import GameButton from '@/components/GameButton';

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
    <div className="battle-banner-text font-display text-center py-4 text-2xl text-amber-300 animate-pulse flex items-center justify-center gap-2">
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
      className={`damage-number font-display absolute left-1/2 top-0 -translate-x-1/2 pointer-events-none select-none ${
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

// "Skip for gold" — shared by the solo BattleScreen and the live PvP
// LiveBattleScreen (previously an identical skipCost/canSkip/handleSkipQuestion
// block copy-pasted into both, same duplication problem resolveItemEffect
// above already exists to avoid). goldSpentThisBattle lives in this hook's own
// state rather than the caller's, since a fresh BattleScreen/LiveBattleScreen
// mount is exactly one battle either way.
//
// `trySkip` doesn't call the caller's addLog itself (screen-specific log
// wiring is the one piece that's genuinely different between the two
// screens) — it returns a `message` for the caller to log on failure, and an
// empty string on success, so BattleScreen/LiveBattleScreen just do
// `if (message) addLog(message)`.
export function useSkipForGold(gold: number, onSpendGold: (amount: number) => Promise<boolean>) {
  const [goldSpentThisBattle, setGoldSpentThisBattle] = useState(0);
  const skipCost = BATTLE_CONSTANTS.QUESTION_SKIP_GOLD_COST;
  const maxGoldPerBattle = BATTLE_CONSTANTS.MAX_GOLD_SPENT_PER_BATTLE;
  const canSkip = gold >= skipCost && goldSpentThisBattle + skipCost <= maxGoldPerBattle;

  const trySkip = async (): Promise<{ ok: boolean; message: string }> => {
    if (!canSkip) {
      return {
        ok: false,
        message: goldSpentThisBattle + skipCost > maxGoldPerBattle
          ? `❌ Reached this battle's ${maxGoldPerBattle} gold skip limit!`
          : '❌ Not enough gold to skip!',
      };
    }
    const paid = await onSpendGold(skipCost);
    if (!paid) return { ok: false, message: '❌ Not enough gold to skip!' };
    setGoldSpentThisBattle(prev => prev + skipCost);
    return { ok: true, message: '' };
  };

  return { skipCost, maxGoldPerBattle, goldSpentThisBattle, canSkip, trySkip };
}

export interface BattleQuestionProps {
  questions: any[];
  count: number;
  embedded?: boolean;
  // Whose progress to record the attempt against — the `questions` array comes from
  // content_questions_public (correct_answer stripped), so correctness has to be checked
  // server-side via grade_content_question, keyed by each question's stable id.
  gradingUserId: string;
  onComplete: (correctCount: number, answeredQuestions: any[]) => void;
  // "Skip for gold" — omit entirely to disable the skip button (e.g. nowhere
  // currently does this, but keeps the prop optional for any other caller of
  // this modal, such as the Mastery Gauntlet, that doesn't want it). When
  // provided, onSkip should perform the actual gold debit (server-side RPC +
  // the caller's own per-battle spend cap check) and resolve to whether it
  // succeeded — the modal only advances the question (as a correct answer)
  // once it resolves true.
  canSkip?: boolean;
  skipCost?: number;
  onSkip?: () => Promise<boolean>;
  // Battle-wide skip wallet, for the "x/100 spent" indicator next to the skip
  // button — same numbers canSkip was already computed from, just surfaced
  // for display too.
  goldSpentThisBattle?: number;
  maxGoldPerBattle?: number;
}

export function BattleQuestionModal({ questions, count, embedded, gradingUserId, onComplete, canSkip, skipCost, onSkip, goldSpentThisBattle, maxGoldPerBattle }: BattleQuestionProps) {
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
  const [skipped, setSkipped] = useState(false);

  const current = pool[index];
  if (!current) return null;

  // Shared by handleAnswer and handleSkip so a question can't be advanced
  // twice (e.g. a skip click landing while an answer's grading round-trip is
  // still in flight).
  const advance = (isCorrect: boolean) => {
    const newResults = [...results, isCorrect];
    setTimeout(() => {
      if (index + 1 >= askedCount) {
        onComplete(newResults.filter(Boolean).length, pool);
      } else {
        setResults(newResults);
        setSelected(null);
        setRevealedCorrect(null);
        setSkipped(false);
        setIndex(i => i + 1);
      }
    }, 800);
  };

  const handleAnswer = async (opt: string) => {
    if (selected || grading || skipped) return;
    setSelected(opt);
    setGrading(true);
    const { correct: isCorrect, correctAnswer } = await gradeMonsterQuestion(gradingUserId, current.id, opt);
    setGrading(false);
    setRevealedCorrect(correctAnswer);
    advance(isCorrect);
  };

  // Pays gold (via the caller's onSkip, which does the actual RPC debit +
  // per-battle cap check) to count this question as answered correctly
  // without picking an option — same 800ms pacing as a real answer so a run
  // of skips doesn't feel instant/jarring next to answered questions.
  const handleSkip = async () => {
    if (selected || grading || skipped || !onSkip) return;
    setGrading(true);
    const paid = await onSkip();
    setGrading(false);
    if (!paid) return; // insufficient gold or cap hit — caller already surfaced why
    setSkipped(true);
    advance(true);
  };

  // Keyed on index so each new question replays the entrance animation below,
  // rather than only playing once for the whole modal.
  const inner = (
    <div className={embedded ? 'mt-2 bg-[#f5e8c8] border border-[#8b5e2a] rounded-xl p-3' : 'bg-white border border-[#8b5e2a] rounded-2xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto battle-panel-in'}>
      <div key={index} className="battle-panel-in">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs text-[#6b4820] font-mono">Question {index + 1} of {askedCount}</p>
          {current.subject && (
            <span className="text-[10px] font-bold uppercase tracking-wide text-[#7a4a0f] bg-[#c9781a]/20 border border-[#8b5e2a] rounded-full px-2 py-0.5">
              {current.subject}
            </span>
          )}
        </div>
        <p className="text-base font-bold text-[#2a1505] mb-3 leading-snug">{current.question || current.problem_prompt}</p>
        <div className="space-y-2">
        {(current.options || []).map((opt: any) => {
          const key = typeof opt === 'string' ? opt : opt.key;
          const text = typeof opt === 'string' ? opt : opt.text;
          const isSelected = selected === key;
          const isCorrect = revealedCorrect !== null && key === revealedCorrect;
          let style = 'bg-white border-[#c9a87a] hover:border-[#c9781a] hover:bg-[#f0ddb8]';
          let feedbackAnim = '';
          if (revealedCorrect !== null) {
            if (isSelected && isCorrect) { style = 'bg-green-100 border-green-600'; feedbackAnim = 'battle-answer-correct'; }
            else if (isSelected && !isCorrect) { style = 'bg-red-100 border-red-500'; feedbackAnim = 'battle-answer-wrong'; }
            else if (isCorrect) style = 'bg-green-100 border-green-600';
          }
          return (
            <button
              key={key}
              onClick={() => handleAnswer(key)}
              disabled={!!selected || skipped}
              className={`w-full text-left p-3 rounded-xl border-2 text-[#2a1505] transition-all btn-tactile ${style} ${feedbackAnim}`}
            >
              {text}
            </button>
          );
        })}
        </div>
        {onSkip && (
          <div className="mt-2 pt-2 border-t border-[#c9a87a]/60">
            {skipped ? (
              <p className="text-xs font-bold text-[#7a4a0f] text-center">💰 Skipped — counted as correct!</p>
            ) : (
              <GameButton
                variant="quest"
                onClick={handleSkip}
                disabled={!!selected || grading || !canSkip}
                className="w-full"
                style={{ fontSize: 13 }}
              >
                💰 Skip for {skipCost ?? BATTLE_CONSTANTS.QUESTION_SKIP_GOLD_COST} gold
              </GameButton>
            )}
            {goldSpentThisBattle !== undefined && maxGoldPerBattle !== undefined && (
              <p className="text-[10px] text-[#8b6a3a] text-center mt-1 flex items-center justify-center gap-1">
                Battle skip wallet: {goldSpentThisBattle}/{maxGoldPerBattle} gold
                <InfoTag
                  text={`Pay ${skipCost ?? BATTLE_CONSTANTS.QUESTION_SKIP_GOLD_COST} gold to skip any question and count it as correct. Every battle has its own ${maxGoldPerBattle}-gold skip wallet — once you've spent it all, you have to answer for the rest of the battle.`}
                  // Every other InfoTag call site sits on a dark neutral-900
                  // panel, where the default border-gray-500/text-gray-400
                  // reads fine — this is the first on a parchment/white panel,
                  // where that stock gray both breaks the parchment-only-tokens
                  // rule (docs/STYLE_GUIDE.md) and reads at ~2.5:1 contrast on
                  // white. !-prefixed so it wins regardless of Tailwind's
                  // generated class order, without touching InfoTag's own
                  // default for its other (dark-panel) call sites.
                  className="!border-[#8b5e2a] !text-[#7a4a0f]"
                />
              </p>
            )}
          </div>
        )}
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
