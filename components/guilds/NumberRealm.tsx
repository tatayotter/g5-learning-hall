'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTimeAttack } from '@/hooks/useTimeAttack';
import {
  fetchQuestionPool, markQuestionsCompleted, fetchSubclassProfile, updateSubclassProfile,
  ensureGuildMonsterGranted, GUILD_MONSTER_GRANT_LEVEL, SubclassProfile,
  getCompanionTierCrossed, fetchCompanionInstanceStats, getCompanionSpeciesDef,
} from '@/lib/guildEngine';
import { applyLevelUp, XP_PER_CORRECT, GOLD_PER_CORRECT } from '@/lib/guildConfig';
import { logAction } from '@/lib/playerlog';
import { trackEvent } from '@/lib/analytics';
import { playChime, playClash } from '@/lib/sounds';
import { CharacterStats } from '@/hooks/useWeeklyData';
import { GUILDS } from '@/lib/dailyChecklist';
import { USERS, gradeToNumber } from '@/lib/userSession';
import GameButton from '@/components/GameButton';
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

interface NumberRealmQuestion {
  id: string;
  problem_prompt: string;
  expected_layout: 'standard' | 'fraction' | 'time';
  correct_numerator: number | null;
  correct_denominator: number | null;
  correct_standard_ans: string | null;
  difficulty_tier: number;
}

interface NumberRealmProps {
  userId: string;
  weekStartingDate: string;
  currentStats: CharacterStats;
  onGoldEarned: (newStats: CharacterStats) => void;
  onExit: () => void;
}

type ScreenState = 'loading' | 'ready' | 'playing' | 'results';

export default function NumberRealm({ userId, weekStartingDate, currentStats, onGoldEarned, onExit }: NumberRealmProps) {
  const [screen, setScreen] = useState<ScreenState>('loading');
  const [questions, setQuestions] = useState<NumberRealmQuestion[]>([]);
  const [profile, setProfile] = useState<SubclassProfile | null>(null);
  const [flashResult, setFlashResult] = useState<'correct' | 'wrong' | null>(null);
  const [newCurioId, setNewCurioId] = useState<string | null>(null);
  const [companionGraduation, setCompanionGraduation] = useState<{
    fromDef: MonsterDef; toDef: MonsterDef; monsterLevel: number; quality: QualityTier;
  } | null>(null);

  // Input state for all three layouts
  const [standardAns, setStandardAns] = useState('');
  const [numerator, setNumerator] = useState('');
  const [denominator, setDenominator] = useState('');
  const [hoursAns, setHoursAns] = useState('');
  const [minutesAns, setMinutesAns] = useState('');

  const numRef = useRef<HTMLInputElement>(null);
  const denomRef = useRef<HTMLInputElement>(null);
  const hoursRef = useRef<HTMLInputElement>(null);
  const minutesRef = useRef<HTMLInputElement>(null);
  const standardRef = useRef<HTMLInputElement>(null);

  const isTala = userId === 'tala';
  const gradeLevel = gradeToNumber(USERS[userId]?.grade);
  const timeLimit = isTala ? 120 : 60;
  const engine = useTimeAttack<NumberRealmQuestion>(questions, timeLimit)

  useEffect(() => {
    async function loadPool() {
      const [pool, subProfile] = await Promise.all([
        takePrefetch<any[]>(userId, 'guildPool:number_realm')
          ?? fetchQuestionPool(userId, 'sq_number_realm', 'number_realm', gradeLevel),
        takePrefetch<SubclassProfile | null>(userId, 'subclassProfile')
          ?? fetchSubclassProfile(userId)
      ]);
      setQuestions(shuffle(pool as NumberRealmQuestion[]));
      setProfile(subProfile);
      setScreen('ready');
    }
    loadPool();
  }, []);

  useEffect(() => {
    if (engine.phase === 'ended' && screen === 'playing') handleSessionEnd();
  }, [engine.phase]);

  // Auto-focus first input whenever question changes
  useEffect(() => {
    if (screen !== 'playing' || !engine.currentQuestion) return;
    const layout = engine.currentQuestion.expected_layout;
    setTimeout(() => {
      if (layout === 'fraction') numRef.current?.focus();
      else if (layout === 'time') hoursRef.current?.focus();
      else standardRef.current?.focus();
    }, 50);
  }, [engine.currentQuestion, screen]);

  const clearInputs = () => {
    setStandardAns('');
    setNumerator('');
    setDenominator('');
    setHoursAns('');
    setMinutesAns('');
  };

  const checkAnswer = () => {
    const q = engine.currentQuestion;
    if (!q) return;

    let isCorrect = false;
    if (q.expected_layout === 'standard') {
      isCorrect = standardAns.trim() === (q.correct_standard_ans || '').trim();
    } else if (q.expected_layout === 'fraction') {
      isCorrect =
        parseInt(numerator) === q.correct_numerator &&
        parseInt(denominator) === q.correct_denominator;
    } else if (q.expected_layout === 'time') {
      const [correctH, correctM] = (q.correct_standard_ans || '0:0').split(':');
      isCorrect = parseInt(hoursAns) === parseInt(correctH) && parseInt(minutesAns) === parseInt(correctM);
    }

    if (isCorrect) playChime(); else playClash();
    setFlashResult(isCorrect ? 'correct' : 'wrong');
    engine.submitResult(isCorrect, q.id, q.difficulty_tier);
    clearInputs();
    setTimeout(() => setFlashResult(null), 300);
  };

  const handleSessionEnd = async () => {
    setScreen('results');
    trackEvent('guild_quiz_complete', { guild_key: 'number_realm', correct_count: engine.correctCount, wrong_count: engine.wrongCount, xp_earned: engine.totalXpEarned, gold_earned: engine.totalGoldEarned });
    await markQuestionsCompleted(userId, 'number_realm', engine.completedQuestionIds);
    if (profile) {
      const { level, xp } = applyLevelUp(profile.number_realm_lvl, profile.number_realm_xp, engine.totalXpEarned);
      await updateSubclassProfile(userId, { number_realm_lvl: level, number_realm_xp: xp });
      if (profile.number_realm_lvl < GUILD_MONSTER_GRANT_LEVEL && level >= GUILD_MONSTER_GRANT_LEVEL) {
        const grantedId = await ensureGuildMonsterGranted(userId, 'number_realm');
        if (grantedId) setNewCurioId(grantedId);
      } else if (profile.number_realm_lvl >= GUILD_MONSTER_GRANT_LEVEL) {
        const tierCrossed = getCompanionTierCrossed('number_realm', profile.number_realm_lvl, level);
        const speciesDef = tierCrossed ? getCompanionSpeciesDef('number_realm') : undefined;
        if (tierCrossed && speciesDef) {
          const { level: monsterLevel, quality } = await fetchCompanionInstanceStats(userId, 'number_realm');
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
      logAction(userId, weekStartingDate, 'side_quest', `Number Realm session: ${engine.correctCount} correct, ${engine.totalXpEarned} Subclass XP`, 0, engine.totalGoldEarned);
    }
  };

  const renderInputLayout = (q: NumberRealmQuestion) => {
    const inputBase = "bg-white border-2 border-amber-300 rounded-lg text-center text-2xl font-bold font-mono text-gray-900 focus:outline-none focus:border-amber-500 p-3";

    if (q.expected_layout === 'fraction') {
      return (
        <div className="flex flex-col items-center gap-1 mb-6">
          <input ref={numRef} type="number" value={numerator}
            onChange={e => { setNumerator(e.target.value); if (e.target.value.length >= 3) denomRef.current?.focus(); }}
            onKeyDown={e => e.key === 'ArrowDown' || e.key === 'Tab' ? (e.preventDefault(), denomRef.current?.focus()) : null}
            className={`${inputBase} w-24`} placeholder="?" />
          <div className="w-24 h-0.5 bg-amber-500" />
          <input ref={denomRef} type="number" value={denominator}
            onChange={e => setDenominator(e.target.value)}
            onKeyDown={e => e.key === 'Enter' ? checkAnswer() : null}
            className={`${inputBase} w-24`} placeholder="?" />
        </div>
      );
    }

    if (q.expected_layout === 'time') {
      return (
        <div className="flex items-center justify-center gap-3 mb-6">
          <input ref={hoursRef} type="number" value={hoursAns}
            onChange={e => { setHoursAns(e.target.value); if (e.target.value.length >= 2) minutesRef.current?.focus(); }}
            onKeyDown={e => e.key === 'ArrowRight' || e.key === 'Tab' ? (e.preventDefault(), minutesRef.current?.focus()) : null}
            className={`${inputBase} w-20`} placeholder="hh" />
          <span className="text-3xl font-bold text-amber-400">:</span>
          <input ref={minutesRef} type="number" value={minutesAns}
            onChange={e => setMinutesAns(e.target.value)}
            onKeyDown={e => e.key === 'Enter' ? checkAnswer() : null}
            className={`${inputBase} w-20`} placeholder="mm" />
        </div>
      );
    }

    return (
      <input ref={standardRef} type="text" value={standardAns}
        onChange={e => setStandardAns(e.target.value)}
        onKeyDown={e => e.key === 'Enter' ? checkAnswer() : null}
        className={`${inputBase} w-full mb-6`} placeholder="Your answer..." />
    );
  };

  if (screen === 'loading') {
    return <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center text-gray-400 animate-pulse">Loading number arrays...</div>;
  }

  if (screen === 'ready') {
    return (
      <div className="max-w-2xl mx-auto battle-panel-in">
        <div className="bg-white/90 border border-stone-200 rounded-2xl shadow-sm p-8 text-center">
          <div className="w-40 h-40 mx-auto mb-4">
            <GuardianSprite guild="numberrealm" pose="idle" className="w-full h-full" />
          </div>
          <h2 className="text-4xl font-display font-bold text-amber-700 mb-2">Number Realm</h2>
          <p className="text-gray-500 italic text-sm mb-3 max-w-md mx-auto">{GUILDS.find(g => g.key === 'number_realm')?.lore}</p>
          <p className="text-amber-600 font-medium mb-1">Lvl {profile?.number_realm_lvl || 1} · {profile?.number_realm_xp || 0}/500 XP</p>
          <p className="text-amber-600 text-xs font-medium mb-1">Difficulty {'★'.repeat(profile?.number_realm_tier || 1)}{'☆'.repeat(Math.max(0, 3 - (profile?.number_realm_tier || 1)))}</p>
          <p className="text-gray-500 mb-6 text-sm max-w-md mx-auto">Solve math problems in {timeLimit} seconds. Correct answers build your streak — the longer the streak, the greater the gold multiplier.</p>

          <div className="grid grid-cols-3 gap-4 mb-8 text-center">
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-2xl font-bold font-mono text-white">⏱ {timeLimit}s</p>
              <p className="text-xs text-gray-500 mt-1">Time Limit</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-2xl font-bold font-mono text-amber-400">+{XP_PER_CORRECT} XP</p>
              <p className="text-xs text-gray-500 mt-1">Per Correct</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-2xl font-bold font-mono text-amber-600">+{GOLD_PER_CORRECT}<img src="/icons/rewards/gold_coin.svg" alt="Gold" className="inline w-4 h-4 align-[-2px]" /></p>
              <p className="text-xs text-gray-500 mt-1">Per Correct</p>
            </div>
          </div>

          {questions.length === 0 ? (
            <p className="text-red-500">No active problems found for this term.</p>
          ) : (
            <GameButton onClick={() => { engine.start(); setScreen('playing'); trackEvent('guild_quiz_start', { guild_key: 'number_realm' }); }}
              className="bg-amber-700 hover:bg-amber-600 text-white font-bold py-3 px-10 rounded-xl transition-colors font-mono text-lg">
              ⚔️ Begin Time Attack
            </GameButton>
          )}
          <div className="mt-6">
            <GameButton onClick={onExit} className="text-sm text-gray-400 hover:text-gray-700 font-bold">← Retreat to Map</GameButton>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'playing' && engine.currentQuestion) {
    const q = engine.currentQuestion;
    const difficultyStars = '★'.repeat(q.difficulty_tier) + '☆'.repeat(Math.max(0, 3 - q.difficulty_tier));
    const timerPct = (engine.timeLeft / timeLimit) * 100;
    const timerColor = engine.timeLeft <= 10 ? 'bg-red-500' : engine.timeLeft <= 20 ? 'bg-yellow-500' : 'bg-amber-500';
    const feedbackClass = flashResult === 'correct' ? 'battle-answer-correct' : flashResult === 'wrong' ? 'battle-answer-wrong' : '';

    return (
      <div className="fixed inset-0 font-serif flex flex-col lg:flex-row lg:items-center lg:justify-center lg:bg-amber-900" style={{ zIndex: 80 }}>
        <CritBonusToast event={engine.lastCrit} />
        <div className="flex flex-col w-full lg:max-w-xl lg:max-h-[90vh] lg:rounded-2xl lg:overflow-hidden lg:shadow-2xl flex-1 min-h-0 lg:flex-none">

          {/* HUD */}
          <div className="flex-shrink-0 bg-stone-900">
            <div className="flex justify-between items-center px-4 py-2">
              <span className={`text-lg font-bold ${engine.timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-amber-400'}`}>⏱ {engine.timeLeft}s</span>
              <span className="text-sm text-orange-400 font-bold">🔥 x{engine.currentMultiplier}</span>
              <span className="text-sm text-amber-400 font-bold">Score: {engine.score}</span>
            </div>
            <div className="h-1.5 bg-stone-700 w-full">
              <div className="h-1.5 bg-amber-500 transition-all" style={{ width: `${timerPct}%` }} />
            </div>
          </div>

          {/* Sprite strip */}
          <div
            className="flex-shrink-0 flex items-center justify-center py-2"
            style={{ backgroundImage: "url('/guilds/number-bg.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="w-40 h-40 landscape:w-20 landscape:h-20 lg:w-52 lg:h-52">
              <GuardianSprite guild="numberrealm" pose={flashResult === 'correct' ? 'hurt' : 'idle'} className="w-full h-full" />
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
                <p className="text-center text-xs text-gray-500 font-mono mb-2">{difficultyStars}</p>
                <p className="text-xl font-bold text-gray-900 text-center mb-4 leading-relaxed">{q.problem_prompt}</p>

                {renderInputLayout(q)}

                <GameButton onClick={checkAnswer}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl transition-colors font-mono">
                  Submit ↵
                </GameButton>

                <div className="flex justify-between text-xs text-gray-500 font-mono mt-4">
                  <span>✅ {engine.correctCount}</span>
                  <span>❌ {engine.wrongCount}</span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

        </div>
      </div>
    );
  }

  // --- RESULTS ---
  const rank = engine.correctCount >= 10 ? { emoji: '🏆', label: 'Math Champion', color: 'text-yellow-500' }
    : engine.correctCount >= 5 ? { emoji: '⭐', label: 'Number Adept', color: 'text-amber-400' }
    : { emoji: '🔢', label: 'Apprentice', color: 'text-stone-400' };

  return (
    <div className="fixed inset-0 font-serif flex flex-col lg:flex-row lg:items-center lg:justify-center lg:bg-amber-900 battle-panel-in" style={{ zIndex: 80 }}>
      {newCurioId && ALL_MONSTERS[newCurioId] && (
        <CurioRevealModal monster={ALL_MONSTERS[newCurioId]} userId={userId} onClose={() => setNewCurioId(null)} />
      )}
      {companionGraduation && (
        <GraduationCeremonyModal {...companionGraduation} userId={userId} onGoToCompendium={() => setCompanionGraduation(null)} />
      )}
      <div className="flex flex-col w-full lg:max-w-xl lg:max-h-[90vh] lg:rounded-2xl lg:overflow-hidden lg:shadow-2xl flex-1 min-h-0 lg:flex-none">
        <div className="flex-shrink-0 bg-stone-900 px-4 py-3 flex items-center justify-between">
          <span className="text-amber-400 font-bold text-sm tracking-wide uppercase">Session Complete</span>
          <span className={`text-lg font-bold ${rank.color}`}>{rank.emoji} {rank.label}</span>
        </div>
        <div className="flex flex-col landscape:flex-row flex-1 min-h-0">
          <div
            className="flex-shrink-0 flex items-center justify-center py-4 landscape:w-2/5 landscape:py-0"
            style={{ backgroundImage: "url('/guilds/number-bg.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="w-44 h-44 landscape:w-32 landscape:h-32 lg:w-52 lg:h-52">
              <GuardianSprite guild="numberrealm" pose="defeated" className="w-full h-full" />
            </div>
          </div>
          <div className="flex-1 bg-white overflow-y-auto flex flex-col min-h-0">
          <div className="p-4 flex flex-col gap-3 flex-1">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-green-50 border border-green-200 rounded-2xl p-3 text-center">
                <p className="text-3xl font-bold font-mono text-green-600">{engine.correctCount}</p>
                <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wide">Correct</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-center">
                <p className="text-3xl font-bold font-mono text-red-500">{engine.wrongCount}</p>
                <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wide">Wrong</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-center">
                <p className="text-3xl font-bold font-mono text-amber-700">+{engine.totalXpEarned}</p>
                <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wide">Subclass XP</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-center">
                <p className="text-3xl font-bold font-mono text-amber-600 flex items-center justify-center gap-1">
                  <img src="/icons/rewards/gold_coin.svg" alt="" className="w-5 h-5" />{engine.totalGoldEarned}
                </p>
                <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wide">Gold Earned</p>
              </div>
            </div>
            {(engine.correctCount + engine.wrongCount) > 0 && (() => {
              const pct = Math.round((engine.correctCount / (engine.correctCount + engine.wrongCount)) * 100);
              return (
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Accuracy</span><span className="font-bold text-amber-700">{pct}%</span></div>
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-2 bg-amber-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })()}
            <div className="flex flex-col gap-3 mt-auto pt-2">
              <GameButton onClick={() => { engine.start(); setScreen('playing'); }} className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-6 rounded-xl transition-colors text-base">⚔️ Play Again</GameButton>
              <GameButton onClick={onExit} className="w-full bg-stone-100 hover:bg-stone-200 text-gray-600 font-bold py-3 px-6 rounded-xl transition-colors text-sm">← Return to Campaign Map</GameButton>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
