// components/guilds/Lorekeeper.tsx
'use client';
import { useState, useEffect } from 'react';
import { useTimeAttack } from '@/hooks/useTimeAttack';
import { fetchQuestionPool, markQuestionsCompleted, fetchSubclassProfile, updateSubclassProfile, SubclassProfile } from '@/lib/guildEngine';
import { applyLevelUp } from '@/lib/guildConfig';
import { logAction } from '@/lib/playerlog';
import { playChime, playClash } from '@/lib/sounds';
import { CharacterStats } from '@/hooks/useWeeklyData';

interface LorekeeperQuestion {
  id: string;
  passage: string | null;
  question: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_choice: string;
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

  const isTala = userId === 'tala';
  console.log('Lorekeeper userId:', userId, 'isTala:', isTala, 'duration:', isTala ? 120 : 60);
  const engine = useTimeAttack<LorekeeperQuestion>(questions, isTala ? 120 : 60);

  useEffect(() => {
    async function loadPool() {
      try {
        const [pool, subProfile] = await Promise.all([
          fetchQuestionPool(userId, 'sq_lorekeeper', 'lorekeeper', isTala ? 2 : 5),
          fetchSubclassProfile(userId)
        ]);
        setQuestions(pool as LorekeeperQuestion[]);
        setProfile(subProfile);
        setScreen('ready');
      } catch (err) {
        console.error('Failed to load Lorekeeper data:', err);
        // Handle error state here, e.g., setScreen('error')
      }
    }
    loadPool();
  }, []);

  useEffect(() => {
    if (engine.phase === 'ended' && screen === 'playing') {
      handleSessionEnd();
    }
  }, [engine.phase]);

  const handleAnswer = (choice: string) => {
    if (!engine.currentQuestion) return;
    setSelectedChoice(choice);
    const isCorrect = choice === engine.currentQuestion.correct_choice;
    if (isCorrect) playChime(); else playClash();
    setTimeout(() => {
      engine.submitResult(isCorrect, engine.currentQuestion!.id);
      setSelectedChoice(null);
    }, 400);
  };

  const handleSessionEnd = async () => {
    setScreen('results');
    await markQuestionsCompleted(userId, 'lorekeeper', engine.completedQuestionIds);

    if (profile) {
      const { level, xp } = applyLevelUp(profile.lorekeeper_lvl, profile.lorekeeper_xp, engine.totalXpEarned);
      await updateSubclassProfile(userId, { lorekeeper_lvl: level, lorekeeper_xp: xp });
    }

    if (engine.totalGoldEarned > 0) {
      const newStats = { ...currentStats, gold: currentStats.gold + engine.totalGoldEarned };
      onGoldEarned(newStats);
      logAction(userId, weekStartingDate, 'side_quest', `Lorekeeper session: ${engine.correctCount} correct, ${engine.totalXpEarned} Subclass XP`, 0, engine.totalGoldEarned);
    }
  };

  if (screen === 'loading') {
    return (
      <div className="bg-[#121a16] border-2 border-emerald-800 rounded-xl p-12 text-center text-emerald-300 font-serif">
        Gathering scrolls from the archive...
      </div>
    );
  }

  if (screen === 'ready') {
    return (
      <div className="bg-[#121a16] border-2 border-emerald-800 rounded-xl p-12 text-center shadow-2xl">
        <h2 className="text-4xl font-display font-bold text-emerald-300 mb-2">📜 Lorekeeper Guild Hall</h2>
        <p className="text-emerald-500 font-serif mb-1">Lvl {profile?.lorekeeper_lvl || 1} · {profile?.lorekeeper_xp || 0}/500 XP</p>
        <p className="text-gray-400 mb-8 font-serif">Answer as many passage questions as you can in {isTala ? 120 : 60} seconds. Correct answers build your streak — the longer the streak, the greater the gold multiplier.</p>
        {questions.length === 0 ? (
          <p className="text-red-400">No active questions found for this term. Ask Tatay to add some in Supabase.</p>
        ) : (
          <button
            onClick={() => { engine.start(); setScreen('playing'); }}
            className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-3 px-10 rounded transition-colors font-display text-lg"
          >
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
    const choices = [
      { key: 'a', text: q.choice_a },
      { key: 'b', text: q.choice_b },
      { key: 'c', text: q.choice_c },
      { key: 'd', text: q.choice_d }
    ];
    return (
      <div className="bg-[#121a16] border-2 border-emerald-800 rounded-xl p-8 shadow-2xl font-serif">
        <div className="flex justify-between items-center mb-6">
          <span className="text-2xl font-bold text-emerald-300">⏱ {engine.timeLeft}s</span>
          <span className="text-emerald-400">🔥 x{engine.currentMultiplier} streak</span>
          <span className="text-emerald-300 font-bold">Score: {engine.score}</span>
        </div>

        {q.passage && (
          <div className="bg-black/30 border border-emerald-900 rounded-lg p-4 mb-4 text-gray-300 leading-relaxed">
            {q.passage}
          </div>
        )}

        <p className="text-lg font-bold text-white mb-6">{q.question}</p>

        <div className="space-y-3">
          {choices.map(c => {
            let style = 'border-emerald-800 hover:border-emerald-500 hover:bg-emerald-900/20';
            if (selectedChoice === c.key) {
              style = c.key === q.correct_choice ? 'border-green-500 bg-green-900/30' : 'border-red-500 bg-red-900/30';
            }
            return (
              <button
                key={c.key}
                onClick={() => handleAnswer(c.key)}
                disabled={selectedChoice !== null}
                className={`w-full text-left p-4 rounded-lg border-2 transition-colors text-gray-200 ${style}`}
              >
                {c.text}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // --- RESULTS ---
  return (
    <div className="bg-[#121a16] border-2 border-emerald-800 rounded-xl p-12 text-center shadow-2xl font-serif">
      <h2 className="text-3xl font-bold text-emerald-300 mb-4 font-display">⏳ Time's Up!</h2>
      <p className="text-gray-300 mb-1">{engine.correctCount} correct · {engine.wrongCount} wrong</p>
      <p className="text-xl mb-2">Subclass XP earned: <span className="text-emerald-400 font-mono font-bold">{engine.totalXpEarned}</span></p>
      <p className="text-xl mb-8">Gold earned: <span className="text-yellow-400 font-mono font-bold">{engine.totalGoldEarned}</span></p>
      <button
        onClick={onExit}
        className="bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-3 px-6 rounded transition-colors"
      >
        Return to Campaign Map
      </button>
    </div>
  );
}