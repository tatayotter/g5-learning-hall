'use client';
import { useState, useEffect } from 'react';
import { useTimeAttack } from '@/hooks/useTimeAttack';
import { fetchQuestionPool, markQuestionsCompleted, fetchSubclassProfile, updateSubclassProfile, SubclassProfile } from '@/lib/guildEngine';
import { applyLevelUp } from '@/lib/guildConfig';
import { logAction } from '@/lib/playerlog';
import { playChime, playClash } from '@/lib/sounds';
import { CharacterStats } from '@/hooks/useWeeklyData';
import { USERS } from '@/lib/userSession';

interface LogicOption {
  id: string;
  label: string;
  image_url?: string;
}

interface LogicLabyrinthQuestion {
  id: string;
  puzzle_prompt_text: string | null;
  matrix_image_url: string | null;
  options_array: LogicOption[];
  correct_option_id: string;
}

interface LogicLabyrinthProps {
  userId: string;
  weekStartingDate: string;
  currentStats: CharacterStats;
  onGoldEarned: (newStats: CharacterStats) => void;
  onExit: () => void;
}

type ScreenState = 'loading' | 'ready' | 'playing' | 'results';

export default function LogicLabyrinth({ userId, weekStartingDate, currentStats, onGoldEarned, onExit }: LogicLabyrinthProps) {
  const [screen, setScreen] = useState<ScreenState>('loading');
  const [questions, setQuestions] = useState<LogicLabyrinthQuestion[]>([]);
  const [profile, setProfile] = useState<SubclassProfile | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [flashResult, setFlashResult] = useState<'correct' | 'wrong' | null>(null);

  const isTala = userId === 'tala';
  const gradeLevel = (USERS[userId]?.grade === 'Grade 2') ? 2 : 5;
  const engine = useTimeAttack<LogicLabyrinthQuestion>(questions, isTala ? 120 : 60);

  useEffect(() => {
    async function loadPool() {
      try {
        const [pool, subProfile] = await Promise.all([
          fetchQuestionPool(userId, 'sq_logic_labyrinth', 'logic_labyrinth', gradeLevel),
          fetchSubclassProfile(userId)
        ]);
        const parsed = (pool as any[]).map(q => ({
          ...q,
          options_array: typeof q.options_array === 'string' ? JSON.parse(q.options_array) : q.options_array
        }));
        setQuestions(parsed as LogicLabyrinthQuestion[]);
        setProfile(subProfile);
        setScreen('ready');
      } catch (err) {
        console.error('Failed to load Logic Labyrinth data:', err);
        // Add an 'error' state if desired to show a retry button to the user
      }
    }
    loadPool();
  }, []);

  useEffect(() => {
    if (engine.phase === 'ended' && screen === 'playing') handleSessionEnd();
  }, [engine.phase]);

  const handleSelect = (optionId: string) => {
    if (selectedOption || !engine.currentQuestion) return;
    const isCorrect = optionId === engine.currentQuestion.correct_option_id;
    setSelectedOption(optionId);
    setFlashResult(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) playChime(); else playClash();

    setTimeout(() => {
      engine.submitResult(isCorrect, engine.currentQuestion!.id);
      setSelectedOption(null);
      setFlashResult(null);
    }, 500);
  };

  const handleSessionEnd = async () => {
    setScreen('results');
    await markQuestionsCompleted(userId, 'logic_labyrinth', engine.completedQuestionIds);
    if (profile) {
      const { level, xp } = applyLevelUp(profile.logic_labyrinth_lvl, profile.logic_labyrinth_xp, engine.totalXpEarned);
      await updateSubclassProfile(userId, {
 logic_labyrinth_lvl: level, logic_labyrinth_xp: xp });
    }
    if (engine.totalGoldEarned > 0) {
      const newStats = { ...currentStats, gold: currentStats.gold + engine.totalGoldEarned };
      onGoldEarned(newStats);
      logAction(userId, weekStartingDate, 'side_quest', `Logic Labyrinth session: ${engine.correctCount} correct, ${engine.totalXpEarned} Subclass XP`, 0, engine.totalGoldEarned);
    }
  };

  if (screen === 'loading') {
    return <div className="bg-[#0b0d12] border-2 border-cyan-800 rounded-xl p-12 text-center text-cyan-300 font-sans">Initializing logic matrices...</div>;
  }

  if (screen === 'ready') {
    return (
      <div className="bg-[#0b0d12] border-2 border-cyan-800 rounded-xl p-12 text-center shadow-2xl">
        <h2 className="text-4xl font-display font-bold text-cyan-300 mb-2">🧩 Logic Labyrinth</h2>
        <p className="text-cyan-600 font-mono mb-1">Lvl {profile?.logic_labyrinth_lvl || 1} · {profile?.logic_labyrinth_xp || 0}/500 XP</p>
        <p className="text-gray-400 mb-8 text-sm">Study the pattern or puzzle above, then tap the correct answer from the grid below. Speed and accuracy both matter.</p>
        {questions.length === 0 ? (
          <p className="text-red-400">No active puzzles found for this term.</p>
        ) : (
          <button onClick={() => { engine.start(); setScreen('playing'); }}
            className="bg-cyan-800 hover:bg-cyan-700 text-white font-bold py-3 px-10 rounded transition-colors font-display text-lg">
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
    const borderColor = flashResult === 'correct' ? 'border-green-500' : flashResult === 'wrong' ? 'border-red-500' : 'border-cyan-800';

    return (
      <div className={`bg-[#0b0d12] border-2 ${borderColor} rounded-xl p-8 shadow-2xl transition-colors`}>
        <div className="flex justify-between items-center mb-6">
          <span className="text-2xl font-bold text-cyan-300 font-mono">⏱ {engine.timeLeft}s</span>
          <span className="text-cyan-400 font-mono">🔥 x{engine.currentMultiplier}</span>
          <span className="text-cyan-300 font-bold font-mono">Score: {engine.score}</span>
        </div>

        {q.matrix_image_url && (
          <div className="flex justify-center mb-6">
            <img
              src={q.matrix_image_url}
              alt="Logic matrix"
              className="max-h-48 rounded-lg border border-cyan-900 object-contain"
            />
          </div>
        )}

        {q.puzzle_prompt_text && (
          <p className="text-lg text-white text-center mb-6 leading-relaxed border border-cyan-900 rounded-lg p-4 bg-black/30">
            {q.puzzle_prompt_text}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          {q.options_array.map((opt) => {
            let style = 'border-cyan-900 hover:border-cyan-500 hover:bg-cyan-900/20';
            if (selectedOption === opt.id) {
              style = opt.id === q.correct_option_id
                ? 'border-green-500 bg-green-900/30'
                : 'border-red-500 bg-red-900/30';
            }
            return (
              <button
                key={opt.id}
                onClick={() => handleSelect(opt.id)}
                disabled={selectedOption !== null}
                className={`border-2 rounded-lg p-4 transition-colors text-center ${style}`}
              >
                {opt.image_url ? (
                  <img src={opt.image_url} alt={opt.label} className="max-h-20 mx-auto object-contain" />
                ) : (
                  <span className="text-lg font-bold text-white">{opt.label}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex justify-between text-xs text-gray-600 font-mono mt-4">
          <span>✅ {engine.correctCount}</span>
          <span>❌ {engine.wrongCount}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0b0d12] border-2 border-cyan-800 rounded-xl p-12 text-center shadow-2xl">
      <h2 className="text-3xl font-bold text-cyan-300 mb-4 font-display">⏳ Time's Up!</h2>
      <p className="text-gray-300 mb-1">{engine.correctCount} correct · {engine.wrongCount} wrong</p>
      <p className="text-xl mb-2">Subclass XP: <span className="text-cyan-400 font-bold font-mono">{engine.totalXpEarned}</span></p>
      <p className="text-xl mb-8">Gold earned: <span className="text-yellow-400 font-bold font-mono">{engine.totalGoldEarned}</span></p>
      <button onClick={onExit} className="bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-3 px-6 rounded transition-colors">
        Return to Campaign Map
      </button>
    </div>
  );
}