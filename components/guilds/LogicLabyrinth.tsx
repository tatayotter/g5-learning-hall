'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTimeAttack } from '@/hooks/useTimeAttack';
import { fetchQuestionPool, markQuestionsCompleted, fetchSubclassProfile, updateSubclassProfile, ensureGuildMonsterGranted, GUILD_MONSTER_GRANT_LEVEL, SubclassProfile } from '@/lib/guildEngine';
import { applyLevelUp, XP_PER_CORRECT, GOLD_PER_CORRECT } from '@/lib/guildConfig';
import { logAction } from '@/lib/playerlog';
import { playChime, playClash } from '@/lib/sounds';
import { CharacterStats } from '@/hooks/useWeeklyData';
import { USERS } from '@/lib/userSession';
import GameButton from '@/components/GameButton';
import GuardianSprite from '@/components/guilds/GuardianSprite';

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
  const timeLimit = isTala ? 120 : 60;
  const engine = useTimeAttack<LogicLabyrinthQuestion>(questions, timeLimit);

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
      if (profile.logic_labyrinth_lvl < GUILD_MONSTER_GRANT_LEVEL && level >= GUILD_MONSTER_GRANT_LEVEL) {
        await ensureGuildMonsterGranted(userId, 'logic_labyrinth');
      }
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
      <div className="max-w-2xl mx-auto battle-panel-in">
        <div className="bg-[#0b0d12] border-2 border-cyan-800 rounded-2xl p-10 text-center shadow-2xl">
          <div className="w-40 h-40 mx-auto mb-4">
            <GuardianSprite guild="logiclabyrinth" pose="idle" className="w-full h-full" />
          </div>
          <h2 className="text-4xl font-display font-bold text-cyan-300 mb-2">🧩 Logic Labyrinth</h2>
          <p className="text-cyan-600 font-mono mb-1">Lvl {profile?.logic_labyrinth_lvl || 1} · {profile?.logic_labyrinth_xp || 0}/500 XP</p>
          <p className="text-gray-400 mb-8 text-sm max-w-md mx-auto">Study the pattern or puzzle above, then tap the correct answer from the grid below. Speed and accuracy both matter.</p>

          <div className="grid grid-cols-3 gap-4 mb-8 text-center">
            <div className="bg-black/40 rounded-xl p-4">
              <p className="text-2xl font-bold font-mono text-white">⏱ {timeLimit}s</p>
              <p className="text-xs text-gray-500 mt-1">Time Limit</p>
            </div>
            <div className="bg-black/40 rounded-xl p-4">
              <p className="text-2xl font-bold font-mono text-cyan-400">+{XP_PER_CORRECT} XP</p>
              <p className="text-xs text-gray-500 mt-1">Per Correct</p>
            </div>
            <div className="bg-black/40 rounded-xl p-4">
              <p className="text-2xl font-bold font-mono text-yellow-400">+{GOLD_PER_CORRECT}🪙</p>
              <p className="text-xs text-gray-500 mt-1">Per Correct</p>
            </div>
          </div>

          {questions.length === 0 ? (
            <p className="text-red-400">No active puzzles found for this term.</p>
          ) : (
            <GameButton onClick={() => { engine.start(); setScreen('playing'); }}
              className="bg-cyan-800 hover:bg-cyan-700 text-white font-bold py-3 px-10 rounded-xl transition-colors font-display text-lg">
              ⚔️ Begin Time Attack
            </GameButton>
          )}
          <div className="mt-6">
            <GameButton onClick={onExit} className="text-sm text-gray-500 hover:text-gray-300">← Retreat to Map</GameButton>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'playing' && engine.currentQuestion) {
    const q = engine.currentQuestion;
    const timerPct = (engine.timeLeft / timeLimit) * 100;
    const timerColor = engine.timeLeft <= 10 ? 'bg-red-500' : engine.timeLeft <= 20 ? 'bg-yellow-500' : 'bg-cyan-500';
    const feedbackClass = flashResult === 'correct' ? 'battle-answer-correct' : flashResult === 'wrong' ? 'battle-answer-wrong' : '';

    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <span className={`text-2xl font-bold font-mono ${engine.timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-cyan-300'}`}>⏱ {engine.timeLeft}s</span>
            <div className="w-32 bg-neutral-800 rounded-full h-2">
              <div className={`h-2 rounded-full transition-all ${timerColor}`} style={{ width: `${timerPct}%` }} />
            </div>
          </div>
          <span className="text-cyan-400 font-mono">🔥 x{engine.currentMultiplier}</span>
          <span className="text-cyan-300 font-bold font-mono">Score: {engine.score}</span>
        </div>

        <div className="w-28 h-28 mx-auto mb-2">
          <GuardianSprite guild="logiclabyrinth" pose={flashResult === 'correct' ? 'hurt' : 'idle'} className="w-full h-full" />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={q.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.15 }}
            className={`bg-[#0b0d12] border-2 border-cyan-800 rounded-xl p-8 shadow-2xl ${feedbackClass}`}
          >
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
                  <GameButton
                    key={opt.id}
                    onClick={() => handleSelect(opt.id)}
                    disabled={selectedOption !== null}
                    className={`border-2 rounded-lg p-4 transition-colors text-center ${style} disabled:cursor-default`}
                  >
                    {opt.image_url ? (
                      <img src={opt.image_url} alt={opt.label} className="max-h-20 mx-auto object-contain" />
                    ) : (
                      <span className="text-lg font-bold text-white">{opt.label}</span>
                    )}
                  </GameButton>
                );
              })}
            </div>

            <div className="flex justify-between text-xs text-gray-600 font-mono mt-4">
              <span>✅ {engine.correctCount}</span>
              <span>❌ {engine.wrongCount}</span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto battle-panel-in">
      <div className="bg-[#0b0d12] border-2 border-cyan-800 rounded-2xl p-10 text-center shadow-2xl">
        <div className="w-40 h-40 mx-auto mb-4">
          <GuardianSprite guild="logiclabyrinth" pose="defeated" className="w-full h-full" />
        </div>
        <div className="text-5xl mb-2">{engine.correctCount >= 10 ? '🏆' : engine.correctCount >= 5 ? '⭐' : '🧩'}</div>
        <h2 className="text-3xl font-bold text-cyan-300 mb-4 font-display">Guardian Defeated!</h2>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-black/40 rounded-xl p-5">
            <p className="text-4xl font-bold font-mono text-green-400">{engine.correctCount}</p>
            <p className="text-sm text-gray-500 mt-1">Correct</p>
          </div>
          <div className="bg-black/40 rounded-xl p-5">
            <p className="text-4xl font-bold font-mono text-red-400">{engine.wrongCount}</p>
            <p className="text-sm text-gray-500 mt-1">Wrong</p>
          </div>
          <div className="bg-black/40 rounded-xl p-5">
            <p className="text-4xl font-bold font-mono text-cyan-400">{engine.totalXpEarned}</p>
            <p className="text-sm text-gray-500 mt-1">Subclass XP</p>
          </div>
          <div className="bg-black/40 rounded-xl p-5">
            <p className="text-4xl font-bold font-mono text-yellow-400">🪙 {engine.totalGoldEarned}</p>
            <p className="text-sm text-gray-500 mt-1">Gold Earned</p>
          </div>
        </div>

        <GameButton onClick={onExit} className="bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-3 px-6 rounded-xl transition-colors">
          Return to Campaign Map
        </GameButton>
      </div>
    </div>
  );
}
