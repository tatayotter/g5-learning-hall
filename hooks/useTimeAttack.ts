// hooks/useTimeAttack.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { TIME_ATTACK_DURATION, XP_PER_CORRECT, GOLD_PER_CORRECT, SCORE_PER_CORRECT, SCORE_PENALTY_WRONG, getStreakMultiplier } from '@/lib/guildConfig';

export type TimeAttackPhase = 'idle' | 'active' | 'ended';

export function useTimeAttack<T>(questionPool: T[], duration: number = TIME_ATTACK_DURATION) {
  const [phase, setPhase] = useState<TimeAttackPhase>('idle');
  const [timeLeft, setTimeLeft] = useState(duration);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [totalXpEarned, setTotalXpEarned] = useState(0);
  const [totalGoldEarned, setTotalGoldEarned] = useState(0);
  const completedIdsRef = useRef<string[]>([]);

  useEffect(() => {
    if (phase !== 'active') return;
    if (timeLeft <= 0) {
      setPhase('ended');
      return;
    }
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, timeLeft]);

  const start = useCallback(() => {
    setPhase('active');
    setTimeLeft(duration);
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setCorrectCount(0);
    setWrongCount(0);
    setTotalXpEarned(0);
    setTotalGoldEarned(0);
    completedIdsRef.current = [];
  }, [duration]);

  // Call this with true/false for whether the submitted answer was correct.
  // questionId is used to record it in the "no repeats" completed-questions log.
  const submitResult = useCallback((isCorrect: boolean, questionId: string) => {
    if (phase !== 'active') return;

    completedIdsRef.current.push(questionId);

    if (isCorrect) {
      const newStreak = streak + 1;
      const multiplier = getStreakMultiplier(newStreak);
      setStreak(newStreak);
      setScore(s => s + SCORE_PER_CORRECT);
      setCorrectCount(c => c + 1);
      setTotalXpEarned(x => x + XP_PER_CORRECT);
      setTotalGoldEarned(g => g + GOLD_PER_CORRECT * multiplier);
    } else {
      setStreak(0);
      setScore(s => Math.max(0, s - SCORE_PENALTY_WRONG));
      setWrongCount(c => c + 1);
    }

    // Advance to next question, looping back to the start if the pool runs out
    // before the timer does (rare, but possible with a small pool).
    setCurrentIndex(i => (questionPool.length > 0 ? (i + 1) % questionPool.length : 0));
  }, [phase, streak, questionPool.length]);

  const currentMultiplier = getStreakMultiplier(streak);
  const currentQuestion = questionPool[currentIndex] || null;

  return {
    phase,
    timeLeft,
    currentQuestion,
    score,
    streak,
    currentMultiplier,
    correctCount,
    wrongCount,
    totalXpEarned,
    totalGoldEarned,
    completedQuestionIds: completedIdsRef.current,
    start,
    submitResult
  };
}