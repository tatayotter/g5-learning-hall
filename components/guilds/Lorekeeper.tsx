// components/guilds/Lorekeeper.tsx
'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTimeAttack } from '@/hooks/useTimeAttack';
import {
  fetchQuestionPool, markQuestionsCompleted, fetchSubclassProfile, updateSubclassProfile,
  ensureGuildMonsterGranted, GUILD_MONSTER_GRANT_LEVEL, SubclassProfile,
  getCompanionTierCrossed, fetchCompanionInstanceStats, getCompanionSpeciesDef,
  gradeStageIndex, gradeStageStars, MIN_GRADE_STAGE,
} from '@/lib/guildEngine';
import { applyLevelUp, XP_PER_CORRECT, GOLD_PER_CORRECT } from '@/lib/guildConfig';
import { logAction } from '@/lib/playerlog';
import { trackEvent } from '@/lib/analytics';
import { playChime, playClash } from '@/lib/sounds';
import { CharacterStats } from '@/hooks/useWeeklyData';
import { GUILDS } from '@/lib/dailyChecklist';
import GameButton, { questButtonFontFamily, questButtonLetterSpacing, questTextShadowStyle, questTextStyle } from '@/components/GameButton';
import GuardianSprite from '@/components/guilds/GuardianSprite';
import CurioRevealModal from '@/components/CurioRevealModal';
import GraduationCeremonyModal from '@/components/GraduationCeremonyModal';
import CritBonusToast from '@/components/CritBonusToast';
import { ALL_MONSTERS, getGuildMonsterTierDef, MonsterDef } from '@/lib/monsterConfig';
import { QualityTier } from '@/lib/curioQuality';
import { takePrefetch } from '@/lib/tabPrefetch';

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

interface LorekeeperQuestion {
  id: string;
  passage: string | null;
  question: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_choice: string;
  grade_level: number;
}

interface LorekeeperProps {
  userId: string;
  weekStartingDate: string;
  currentStats: CharacterStats;
  onGoldEarned: (newStats: CharacterStats) => void;
  onExit: () => void;
}

type ScreenState = 'loading' | 'ready' | 'playing' | 'results';

export default function Lorekeeper({ userId, weekStartingDate, currentStats, onGoldEarned, onExit }: LorekeeperProps) {
  const [screen, setScreen] = useState<ScreenState>('loading');
  const [questions, setQuestions] = useState<LorekeeperQuestion[]>([]);
  const [profile, setProfile] = useState<SubclassProfile | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [flashResult, setFlashResult] = useState<'correct' | 'wrong' | null>(null);
  const [newCurioId, setNewCurioId] = useState<string | null>(null);
  const [companionGraduation, setCompanionGraduation] = useState<{
    fromDef: MonsterDef; toDef: MonsterDef; monsterLevel: number; quality: QualityTier;
  } | null>(null);
  const [shuffledChoices, setShuffledChoices] = useState<{ key: string; text: string }[]>([]);

  const isTala = userId === 'tala';
  const timeLimit = isTala ? 120 : 60;
  const engine = useTimeAttack<LorekeeperQuestion>(questions, timeLimit);

  useEffect(() => {
    async function loadPool() {
      try {
        const [pool, subProfile] = await Promise.all([
          takePrefetch<any[]>(userId, 'guildPool:lorekeeper')
            ?? fetchQuestionPool(userId, 'sq_lorekeeper', 'lorekeeper'),
          takePrefetch<SubclassProfile | null>(userId, 'subclassProfile')
            ?? fetchSubclassProfile(userId)
        ]);
        setQuestions(shuffle(pool as LorekeeperQuestion[]));
        setProfile(subProfile);
        setScreen('ready');
      } catch (err) {
        console.error('Failed to load Lorekeeper data:', err);
      }
    }
    loadPool();
  }, []);

  useEffect(() => {
    if (engine.phase === 'ended' && screen === 'playing') {
      handleSessionEnd();
    }
  }, [engine.phase]);

  // Re-shuffle answer order each time the question changes — without this,
  // choices always rendered in fixed a/b/c/d order, so whichever slot the
  // seed data happened to put correct_choice in (e.g. "b") was correct for
  // nearly every question, making spam-clicking that slot a free win.
  useEffect(() => {
    if (!engine.currentQuestion) return;
    const q = engine.currentQuestion;
    setShuffledChoices(shuffle([
      { key: 'a', text: q.choice_a },
      { key: 'b', text: q.choice_b },
      { key: 'c', text: q.choice_c },
      { key: 'd', text: q.choice_d },
    ]));
  }, [engine.currentQuestion]);

  const handleAnswer = (choice: string) => {
    if (!engine.currentQuestion) return;
    setSelectedChoice(choice);
    const isCorrect = choice.toLowerCase() === engine.currentQuestion.correct_choice.toLowerCase();
    setFlashResult(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) playChime(); else playClash();
    setTimeout(() => {
      engine.submitResult(isCorrect, engine.currentQuestion!.id, gradeStageIndex(engine.currentQuestion!.grade_level));
      setSelectedChoice(null);
      setFlashResult(null);
    }, 400);
  };

  const handleSessionEnd = async () => {
    setScreen('results');
    trackEvent('guild_quiz_complete', { guild_key: 'lorekeeper', correct_count: engine.correctCount, wrong_count: engine.wrongCount, xp_earned: engine.totalXpEarned, gold_earned: engine.totalGoldEarned });
    await markQuestionsCompleted(userId, 'lorekeeper', engine.completedQuestionIds);

    if (profile) {
      const { level, xp } = applyLevelUp(profile.lorekeeper_lvl, profile.lorekeeper_xp, engine.totalXpEarned);
      await updateSubclassProfile(userId, { lorekeeper_lvl: level, lorekeeper_xp: xp });
      if (profile.lorekeeper_lvl < GUILD_MONSTER_GRANT_LEVEL && level >= GUILD_MONSTER_GRANT_LEVEL) {
        const grantedId = await ensureGuildMonsterGranted(userId, 'lorekeeper');
        if (grantedId) setNewCurioId(grantedId);
      } else if (profile.lorekeeper_lvl >= GUILD_MONSTER_GRANT_LEVEL) {
        // Only checked once the companion already exists (the branch above
        // handles the same-session grant+tier-up edge case by just deferring
        // the ceremony to next session — see getCompanionTierCrossed).
        const tierCrossed = getCompanionTierCrossed('lorekeeper', profile.lorekeeper_lvl, level);
        const speciesDef = tierCrossed ? getCompanionSpeciesDef('lorekeeper') : undefined;
        if (tierCrossed && speciesDef) {
          const { level: monsterLevel, quality } = await fetchCompanionInstanceStats(userId, 'lorekeeper');
          setCompanionGraduation({
            fromDef: getGuildMonsterTierDef(speciesDef, (tierCrossed - 1) as 1 | 2),
            toDef: getGuildMonsterTierDef(speciesDef, tierCrossed),
            monsterLevel,
            quality,
          });
        }
      }
    }

    if (engine.totalGoldEarned > 0) {
      const newStats = { ...currentStats, gold: currentStats.gold + engine.totalGoldEarned };
      onGoldEarned(newStats);
      logAction(userId, weekStartingDate, 'side_quest', `Lorekeeper session: ${engine.correctCount} correct, ${engine.totalXpEarned} Subclass XP`, 0, engine.totalGoldEarned);
    }
  };

  if (screen === 'loading') {
    return (
      <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center text-gray-400 animate-pulse">
        Gathering scrolls from the archive...
      </div>
    );
  }

  if (screen === 'ready') {
    return (
      <div className="max-w-2xl mx-auto battle-panel-in">
        <div className="bg-white/90 border border-stone-200 rounded-2xl shadow-sm p-8 text-center">
          <div className="w-40 h-40 mx-auto mb-4">
            <GuardianSprite guild="lorekeeper" pose="idle" className="w-full h-full" />
          </div>
          {/* Same Bungee/stroke/shadow text treatment as the quest GameButton's
              label (2026-08-29), in the guild's own theme color instead of
              the button's white. */}
          <h2 className="text-2xl mb-2" style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing }}>
            <span style={{ position: 'relative', display: 'inline-block' }}>
              <span aria-hidden style={questTextShadowStyle}>Lorekeeper Guild Hall</span>
              <span style={{ ...questTextStyle, color: '#34d399' }}>Lorekeeper Guild Hall</span>
            </span>
          </h2>
          <p className="text-emerald-700 font-mono italic text-sm mb-3 max-w-md mx-auto">{GUILDS.find(g => g.key === 'lorekeeper')?.lore}</p>
          <p className="text-gray-500 font-mono mb-1">Lvl {profile?.lorekeeper_lvl || 1} · {profile?.lorekeeper_xp || 0}/500 XP</p>
          <p className="text-emerald-700 text-xs font-mono mb-4">Grade {profile?.lorekeeper_tier || MIN_GRADE_STAGE} · {gradeStageStars(profile?.lorekeeper_tier || MIN_GRADE_STAGE)}</p>
          <p className="text-gray-500 mb-6 text-sm max-w-md mx-auto">Answer as many passage questions as you can in {timeLimit} seconds. Correct answers build your streak — the longer the streak, the greater the gold multiplier.</p>

          <div className="grid grid-cols-3 gap-4 mb-8 text-center">
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-2xl font-bold font-mono text-[#2a1505]">⏱ {timeLimit}s</p>
              <p className="text-xs text-gray-500 mt-1">Time Limit</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-2xl font-bold font-mono text-emerald-500">+{XP_PER_CORRECT} XP</p>
              <p className="text-xs text-gray-500 mt-1">Per Correct</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-2xl font-bold font-mono text-amber-600">+{GOLD_PER_CORRECT}<img src="/icons/rewards/gold_coin.svg" alt="Gold" className="inline w-4 h-4 align-[-2px]" /></p>
              <p className="text-xs text-gray-500 mt-1">Per Correct</p>
            </div>
          </div>

          {questions.length === 0 ? (
            <p className="text-red-500">No active questions found for this term. Ask Tatay to add some in Supabase.</p>
          ) : (
            <GameButton
              variant="quest"
              color={isTala ? '#db2777' : '#047857'}
              onClick={() => { engine.start(); setScreen('playing'); trackEvent('guild_quiz_start', { guild_key: 'lorekeeper' }); }}
              style={{ fontSize: 17 }}
            >
              ⚔️ Begin Time Attack
            </GameButton>
          )}
          <div className="mt-6">
            <GameButton variant="quest" color="#d4d4d4" onClick={onExit} style={{ fontSize: 13 }}>← Retreat to Map</GameButton>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'playing' && engine.currentQuestion) {
    const q = engine.currentQuestion;
    const choices = shuffledChoices;
    const difficultyStars = gradeStageStars(q.grade_level);
    const timerPct = (engine.timeLeft / timeLimit) * 100;
    const timerColor = engine.timeLeft <= 10 ? 'bg-red-500' : engine.timeLeft <= 20 ? 'bg-yellow-500' : 'bg-emerald-500';
    const feedbackClass = flashResult === 'correct' ? 'battle-answer-correct' : flashResult === 'wrong' ? 'battle-answer-wrong' : '';

    return (
      <div className="fixed inset-0 font-serif flex flex-col lg:flex-row lg:items-center lg:justify-center lg:bg-emerald-800" style={{ zIndex: 80 }}>
        <CritBonusToast event={engine.lastCrit} />
        {/* Centered column — full width on mobile, max-w-xl on desktop */}
        <div className="flex flex-col w-full lg:max-w-xl lg:max-h-[90vh] lg:rounded-2xl lg:overflow-hidden lg:shadow-2xl flex-1 min-h-0 lg:flex-none">

        {/* HUD */}
        <div className="flex-shrink-0 bg-stone-900">
          <div className="flex justify-between items-center px-4 py-2">
            <span className={`text-lg font-bold ${engine.timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>⏱ {engine.timeLeft}s</span>
            <span className="text-sm text-orange-400 font-bold">🔥 x{engine.currentMultiplier}</span>
            <span className="text-sm text-emerald-400 font-bold">Score: {engine.score}</span>
          </div>
          {/* Full-width timer bar — always Lorekeeper emerald */}
          <div className="h-1.5 bg-stone-700 w-full">
            <div className="h-1.5 bg-emerald-500 transition-all" style={{ width: `${timerPct}%` }} />
          </div>
        </div>

        {/* Sprite strip — explicit bg image so it always shows the guild scene */}
        <div
          className="flex-shrink-0 flex items-center justify-center py-2"
          style={{ backgroundImage: "url('/guilds/lorekeeper-bg.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
          <div className="w-40 h-40 landscape:w-20 landscape:h-20 lg:w-52 lg:h-52">
            <GuardianSprite guild="lorekeeper" pose={flashResult === 'correct' ? 'hurt' : 'idle'} className="w-full h-full" />
          </div>
        </div>

        {/* Question card */}
        <div className="flex-1 flex flex-col min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={q.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.15 }}
            className={`bg-white border-t border-stone-200 p-4 shadow-sm ${feedbackClass} flex flex-col flex-1 landscape:overflow-y-auto`}
          >
            <p className="text-center text-xs text-gray-500 mb-1">{difficultyStars}</p>

            {q.passage && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-3 text-gray-700 text-base leading-snug">
                {q.passage}
              </div>
            )}

            <p className="text-base font-bold text-gray-900 mb-3">{q.question}</p>

            <div className="grid grid-cols-1 landscape:grid-cols-2 gap-2">
              {choices.map((c, idx) => {
                const label = ['A', 'B', 'C', 'D'][idx];
                const isSelected = selectedChoice === c.key;
                const isCorrect = c.key.toLowerCase() === q.correct_choice.toLowerCase();
                let cardStyle = 'bg-amber-50 border-amber-200 hover:border-emerald-400 hover:bg-emerald-50';
                let badgeStyle = 'bg-amber-200 text-amber-800';
                if (isSelected) {
                  if (isCorrect) {
                    cardStyle = 'bg-green-50 border-green-400';
                    badgeStyle = 'bg-green-500 text-white';
                  } else {
                    cardStyle = 'bg-red-50 border-red-400';
                    badgeStyle = 'bg-red-500 text-white';
                  }
                }
                return (
                  <GameButton
                    key={c.key}
                    onClick={() => handleAnswer(c.key)}
                    disabled={selectedChoice !== null}
                    className={`w-full text-left px-3 py-3 rounded-xl border-2 transition-colors text-base text-gray-800 ${cardStyle} disabled:cursor-default flex items-center gap-3`}
                  >
                    <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${badgeStyle}`}>{label}</span>
                    <span>{c.text}</span>
                  </GameButton>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
        </div>
        </div>{/* end centered column */}
      </div>
    );
  }

  // --- RESULTS ---
  const rank = engine.correctCount >= 10 ? { emoji: '🏆', label: 'Master Scholar', color: 'text-yellow-500' }
    : engine.correctCount >= 5 ? { emoji: '⭐', label: 'Adept Reader', color: 'text-emerald-400' }
    : { emoji: '📜', label: 'Apprentice', color: 'text-stone-400' };

  return (
    <div className="fixed inset-0 font-serif flex flex-col lg:flex-row lg:items-center lg:justify-center lg:bg-emerald-800 battle-panel-in" style={{ zIndex: 80 }}>
      {newCurioId && ALL_MONSTERS[newCurioId] && (
        <CurioRevealModal monster={ALL_MONSTERS[newCurioId]} userId={userId} onClose={() => setNewCurioId(null)} />
      )}
      {companionGraduation && (
        <GraduationCeremonyModal
          {...companionGraduation}
          userId={userId}
          onGoToCompendium={() => setCompanionGraduation(null)}
        />
      )}

      {/* Centered column */}
      <div className="flex flex-col w-full lg:max-w-xl lg:max-h-[90vh] lg:rounded-2xl lg:overflow-hidden lg:shadow-2xl flex-1 min-h-0 lg:flex-none">

        {/* Header bar — always full width */}
        <div className="flex-shrink-0 bg-stone-900 px-4 py-3 flex items-center justify-between">
          <span className="text-emerald-400 font-bold text-sm tracking-wide uppercase">Session Complete</span>
          <span className={`text-lg font-bold ${rank.color}`}>{rank.emoji} {rank.label}</span>
        </div>

        {/* Body — portrait: stacked | landscape: side-by-side */}
        <div className="flex flex-col landscape:flex-row flex-1 min-h-0">

          {/* Sprite strip */}
          <div
            className="flex-shrink-0 flex items-center justify-center py-4 landscape:w-2/5 landscape:py-0"
            style={{ backgroundImage: "url('/guilds/lorekeeper-bg.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="w-44 h-44 landscape:w-32 landscape:h-32 lg:w-52 lg:h-52">
              <GuardianSprite guild="lorekeeper" pose="defeated" className="w-full h-full" />
            </div>
          </div>

          {/* Results card */}
          <div className="flex-1 bg-white overflow-y-auto flex flex-col min-h-0">
          <div className="p-4 flex flex-col gap-3 flex-1">

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-green-50 border border-green-200 rounded-2xl p-3 text-center">
                <p className="text-3xl font-bold font-mono text-green-600">{engine.correctCount}</p>
                <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wide">Correct</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-center">
                <p className="text-3xl font-bold font-mono text-red-500">{engine.wrongCount}</p>
                <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wide">Wrong</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-center">
                <p className="text-3xl font-bold font-mono text-emerald-700">+{engine.totalXpEarned}</p>
                <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wide">Subclass XP</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-center">
                <p className="text-3xl font-bold font-mono text-amber-600 flex items-center justify-center gap-1">
                  <img src="/icons/rewards/gold_coin.svg" alt="" className="w-5 h-5" />
                  {engine.totalGoldEarned}
                </p>
                <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wide">Gold Earned</p>
              </div>
            </div>

            {/* Accuracy bar */}
            {(engine.correctCount + engine.wrongCount) > 0 && (() => {
              const total = engine.correctCount + engine.wrongCount;
              const pct = Math.round((engine.correctCount / total) * 100);
              return (
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Accuracy</span>
                    <span className="font-bold text-emerald-700">{pct}%</span>
                  </div>
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-2 bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })()}

            {/* Actions */}
            <div className="flex flex-col gap-3 mt-auto pt-2">
              <GameButton variant="quest" color="#047857" onClick={() => { engine.start(); setScreen('playing'); }} className="w-full" style={{ fontSize: 15 }}>
                ⚔️ Play Again
              </GameButton>
              <GameButton variant="quest" color="#8b5e2a" onClick={onExit} className="w-full" style={{ fontSize: 14 }}>
                ← Return to Campaign Map
              </GameButton>
            </div>
          </div>
          </div>{/* end results card */}
        </div>{/* end body row */}

      </div>{/* end centered column */}
    </div>
  );
}
