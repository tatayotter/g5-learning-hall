'use client';
import { useState, useEffect, useRef } from 'react';
import { useTimeAttack } from '@/hooks/useTimeAttack';
import { fetchQuestionPool, markQuestionsCompleted, fetchSubclassProfile, updateSubclassProfile, SubclassProfile } from '@/lib/guildEngine';
import { applyLevelUp } from '@/lib/guildConfig';
import { logAction } from '@/lib/playerlog';
import { playChime, playClash } from '@/lib/sounds';
import { CharacterStats } from '@/hooks/useWeeklyData';

interface NumberRealmQuestion {
  id: string;
  problem_prompt: string;
  expected_layout: 'standard' | 'fraction' | 'time';
  correct_numerator: number | null;
  correct_denominator: number | null;
  correct_standard_ans: string | null;
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
  const engine = useTimeAttack<NumberRealmQuestion>(questions, isTala ? 120 : 60)

  useEffect(() => {
    async function loadPool() {
      const [pool, subProfile] = await Promise.all([
        fetchQuestionPool(userId, 'sq_number_realm', 'number_realm', isTala ? 2 : 5),
        fetchSubclassProfile(userId)
      ]);
      setQuestions(pool as NumberRealmQuestion[]);
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
    engine.submitResult(isCorrect, q.id);
    clearInputs();
    setTimeout(() => setFlashResult(null), 300);
  };

  const handleSessionEnd = async () => {
    setScreen('results');
    await markQuestionsCompleted(userId, 'number_realm', engine.completedQuestionIds);
    if (profile) {
      const { level, xp } = applyLevelUp(profile.number_realm_lvl, profile.number_realm_xp, engine.totalXpEarned);
      await updateSubclassProfile(userId, { number_realm_lvl: level, number_realm_xp: xp });
    }
    if (engine.totalGoldEarned > 0) {
      const newStats = { ...currentStats, gold: currentStats.gold + engine.totalGoldEarned };
      onGoldEarned(newStats);
      logAction(userId, weekStartingDate, 'side_quest', `Number Realm session: ${engine.correctCount} correct, ${engine.totalXpEarned} Subclass XP`, 0, engine.totalGoldEarned);
    }
  };

  const renderInputLayout = (q: NumberRealmQuestion) => {
    const inputBase = "bg-black border-2 border-amber-700 rounded-lg text-center text-2xl font-bold font-mono text-white focus:outline-none focus:border-amber-400 p-3";

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
    return <div className="bg-[#0d0c08] border-2 border-amber-800 rounded-xl p-12 text-center text-amber-300 font-mono">Loading number arrays...</div>;
  }

  if (screen === 'ready') {
    return (
      <div className="bg-[#0d0c08] border-2 border-amber-800 rounded-xl p-12 text-center shadow-2xl">
        <h2 className="text-4xl font-display font-bold text-amber-300 mb-2">🔢 Number Realm</h2>
        <p className="text-amber-600 font-mono mb-1">Lvl {profile?.number_realm_lvl || 1} · {profile?.number_realm_xp || 0}/500 XP</p>
        <p className="text-gray-400 mb-8 font-mono text-sm">Solve math problems in {isTala ? 120 : 60} seconds. Correct answers build your streak — the longer the streak, the greater the gold multiplier.</p>
        {questions.length === 0 ? (
          <p className="text-red-400">No active problems found for this term.</p>
        ) : (
          <button onClick={() => { engine.start(); setScreen('playing'); }}
            className="bg-amber-700 hover:bg-amber-600 text-white font-bold py-3 px-10 rounded transition-colors font-mono text-lg">
            ▶ Begin Time Attack
          </button>
        )}
        <div className="mt-6">
          <button onClick={onExit} className="text-sm text-gray-500 hover:text-gray-300">← Retreat to Map</button>
        </div>
      </div>
    );
  }

  if (screen === 'playing' && engine.currentQuestion) {
    const q = engine.currentQuestion;
    const borderColor = flashResult === 'correct' ? 'border-green-500' : flashResult === 'wrong' ? 'border-red-500' : 'border-amber-800';
    return (
      <div className={`bg-[#0d0c08] border-2 ${borderColor} rounded-xl p-8 shadow-2xl transition-colors`}>
        <div className="flex justify-between items-center mb-8">
          <span className="text-2xl font-bold text-amber-300 font-mono">⏱ {engine.timeLeft}s</span>
          <span className="text-amber-400 font-mono">🔥 x{engine.currentMultiplier}</span>
          <span className="text-amber-300 font-bold font-mono">Score: {engine.score}</span>
        </div>

        <p className="text-xl font-bold text-white text-center mb-6 leading-relaxed">{q.problem_prompt}</p>

        {renderInputLayout(q)}

        <button onClick={checkAnswer}
          className="w-full bg-amber-700 hover:bg-amber-600 text-white font-bold py-3 rounded transition-colors font-mono">
          Submit ↵
        </button>

        <div className="flex justify-between text-xs text-gray-600 font-mono mt-4">
          <span>✅ {engine.correctCount}</span>
          <span>❌ {engine.wrongCount}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0d0c08] border-2 border-amber-800 rounded-xl p-12 text-center shadow-2xl font-mono">
      <h2 className="text-3xl font-bold text-amber-300 mb-4 font-display">⏳ Time's Up!</h2>
      <p className="text-gray-300 mb-1">{engine.correctCount} correct · {engine.wrongCount} wrong</p>
      <p className="text-xl mb-2">Subclass XP: <span className="text-amber-400 font-bold">{engine.totalXpEarned}</span></p>
      <p className="text-xl mb-8">Gold earned: <span className="text-yellow-400 font-bold">{engine.totalGoldEarned}</span></p>
      <button onClick={onExit} className="bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-3 px-6 rounded transition-colors">
        Return to Campaign Map
      </button>
    </div>
  );
}