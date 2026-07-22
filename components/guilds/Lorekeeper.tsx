// components/guilds/Lorekeeper.tsx
'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTimeAttack } from '@/hooks/useTimeAttack';
import { fetchQuestionPool, markQuestionsCompleted, fetchSubclassProfile, updateSubclassProfile, ensureGuildMonsterGranted, GUILD_MONSTER_GRANT_LEVEL, SubclassProfile } from '@/lib/guildEngine';
import { applyLevelUp, XP_PER_CORRECT, GOLD_PER_CORRECT } from '@/lib/guildConfig';
import { logAction } from '@/lib/playerlog';
import { trackEvent } from '@/lib/analytics';
import { playChime, playClash } from '@/lib/sounds';
import { CharacterStats } from '@/hooks/useWeeklyData';
import { GUILDS } from '@/lib/dailyChecklist';
import { USERS } from '@/lib/userSession';
import GameButton from '@/components/GameButton';
import GuardianSprite from '@/components/guilds/GuardianSprite';
import CurioRevealModal from '@/components/CurioRevealModal';
import CritBonusToast from '@/components/CritBonusToast';
import { ALL_MONSTERS } from '@/lib/monsterConfig';

interface LorekeeperQuestion {
  id: string;
  passage: string | null;
  question: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_choice: string;
  difficulty_tier: number;
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

  const isTala = userId === 'tala';
  const gradeLevel = (USERS[userId]?.grade === 'Grade 2') ? 2 : 5;
  const timeLimit = isTala ? 120 : 60;
  const engine = useTimeAttack<LorekeeperQuestion>(questions, timeLimit);

  useEffect(() => {
    async function loadPool() {
      try {
        const [pool, subProfile] = await Promise.all([
          fetchQuestionPool(userId, 'sq_lorekeeper', 'lorekeeper', gradeLevel),
          fetchSubclassProfile(userId)
        ]);
        setQuestions(pool as LorekeeperQuestion[]);
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

  const handleAnswer = (choice: string) => {
    if (!engine.currentQuestion) return;
    setSelectedChoice(choice);
    const isCorrect = choice.toLowerCase() === engine.currentQuestion.correct_choice.toLowerCase();
    setFlashResult(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) playChime(); else playClash();
    setTimeout(() => {
      engine.submitResult(isCorrect, engine.currentQuestion!.id, engine.currentQuestion!.difficulty_tier);
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
      <div className="bg-[#121a16] border-2 border-emerald-800 rounded-xl p-12 text-center text-emerald-300 font-serif">
        Gathering scrolls from the archive...
      </div>
    );
  }

  if (screen === 'ready') {
    return (
      <div className="max-w-2xl mx-auto battle-panel-in">
        <div className="bg-[#121a16] border-2 border-emerald-800 rounded-2xl p-10 text-center shadow-2xl">
          <div className="w-40 h-40 mx-auto mb-4">
            <GuardianSprite guild="lorekeeper" pose="idle" className="w-full h-full" />
          </div>
          <h2 className="text-4xl font-display font-bold text-emerald-300 mb-2">Lorekeeper Guild Hall</h2>
          <p className="text-emerald-600 font-serif italic text-sm mb-3 max-w-md mx-auto">{GUILDS.find(g => g.key === 'lorekeeper')?.lore}</p>
          <p className="text-emerald-500 font-serif mb-1">Lvl {profile?.lorekeeper_lvl || 1} · {profile?.lorekeeper_xp || 0}/500 XP</p>
          <p className="text-emerald-600 text-xs mb-1">Difficulty {'★'.repeat(profile?.lorekeeper_tier || 1)}{'☆'.repeat(Math.max(0, 3 - (profile?.lorekeeper_tier || 1)))}</p>
          <p className="text-gray-400 mb-8 font-serif max-w-md mx-auto">Answer as many passage questions as you can in {timeLimit} seconds. Correct answers build your streak — the longer the streak, the greater the gold multiplier.</p>

          <div className="grid grid-cols-3 gap-4 mb-8 text-center">
            <div className="bg-black/40 rounded-xl p-4">
              <p className="text-2xl font-bold font-mono text-white">⏱ {timeLimit}s</p>
              <p className="text-xs text-gray-500 mt-1">Time Limit</p>
            </div>
            <div className="bg-black/40 rounded-xl p-4">
              <p className="text-2xl font-bold font-mono text-emerald-400">+{XP_PER_CORRECT} XP</p>
              <p className="text-xs text-gray-500 mt-1">Per Correct</p>
            </div>
            <div className="bg-black/40 rounded-xl p-4">
              <p className="text-2xl font-bold font-mono text-yellow-400">+{GOLD_PER_CORRECT}<img src="/icons/rewards/gold_coin.svg" alt="Gold" className="inline w-4 h-4 align-[-2px]" /></p>
              <p className="text-xs text-gray-500 mt-1">Per Correct</p>
            </div>
          </div>

          {questions.length === 0 ? (
            <p className="text-red-400">No active questions found for this term. Ask Tatay to add some in Supabase.</p>
          ) : (
            <GameButton
              onClick={() => { engine.start(); setScreen('playing'); trackEvent('guild_quiz_start', { guild_key: 'lorekeeper' }); }}
              className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-3 px-10 rounded-xl transition-colors font-display text-lg"
            >
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
    const choices = [
      { key: 'a', text: q.choice_a },
      { key: 'b', text: q.choice_b },
      { key: 'c', text: q.choice_c },
      { key: 'd', text: q.choice_d }
    ];
    const difficultyStars = '★'.repeat(q.difficulty_tier) + '☆'.repeat(Math.max(0, 3 - q.difficulty_tier));
    const timerPct = (engine.timeLeft / timeLimit) * 100;
    const timerColor = engine.timeLeft <= 10 ? 'bg-red-500' : engine.timeLeft <= 20 ? 'bg-yellow-500' : 'bg-emerald-500';
    const feedbackClass = flashResult === 'correct' ? 'battle-answer-correct' : flashResult === 'wrong' ? 'battle-answer-wrong' : '';

    return (
      <div className="max-w-2xl mx-auto font-serif">
        <CritBonusToast event={engine.lastCrit} />
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <span className={`text-2xl font-bold ${engine.timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-emerald-300'}`}>⏱ {engine.timeLeft}s</span>
            <div className="w-32 bg-neutral-800 rounded-full h-2">
              <div className={`h-2 rounded-full transition-all ${timerColor}`} style={{ width: `${timerPct}%` }} />
            </div>
          </div>
          <span className="text-emerald-400">🔥 x{engine.currentMultiplier} streak</span>
          <span className="text-emerald-300 font-bold">Score: {engine.score}</span>
        </div>

        <div className="w-28 h-28 mx-auto mb-2">
          <GuardianSprite guild="lorekeeper" pose={flashResult === 'correct' ? 'hurt' : 'idle'} className="w-full h-full" />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={q.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.15 }}
            className={`bg-[#121a16] border-2 border-emerald-800 rounded-xl p-8 shadow-2xl ${feedbackClass}`}
          >
            <p className="text-center text-xs text-gray-600 mb-2">{difficultyStars}</p>

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
                  style = c.key.toLowerCase() === q.correct_choice.toLowerCase() ? 'border-green-500 bg-green-900/30' : 'border-red-500 bg-red-900/30';
                }
                return (
                  <GameButton
                    key={c.key}
                    onClick={() => handleAnswer(c.key)}
                    disabled={selectedChoice !== null}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-colors text-gray-200 ${style} disabled:cursor-default`}
                  >
                    {c.text}
                  </GameButton>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // --- RESULTS ---
  return (
    <div className="max-w-2xl mx-auto battle-panel-in">
      {newCurioId && ALL_MONSTERS[newCurioId] && (
        <CurioRevealModal monster={ALL_MONSTERS[newCurioId]} userId={userId} onClose={() => setNewCurioId(null)} />
      )}
      <div className="bg-[#121a16] border-2 border-emerald-800 rounded-2xl p-10 text-center shadow-2xl font-serif">
        <div className="w-40 h-40 mx-auto mb-4">
          <GuardianSprite guild="lorekeeper" pose="defeated" className="w-full h-full" />
        </div>
        <div className="text-5xl mb-2">{engine.correctCount >= 10 ? '🏆' : engine.correctCount >= 5 ? '⭐' : '📜'}</div>
        <h2 className="text-3xl font-bold text-emerald-300 mb-4 font-display">Guardian Defeated!</h2>

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
            <p className="text-4xl font-bold font-mono text-emerald-400">{engine.totalXpEarned}</p>
            <p className="text-sm text-gray-500 mt-1">Subclass XP</p>
          </div>
          <div className="bg-black/40 rounded-xl p-5">
            <p className="text-4xl font-bold font-mono text-yellow-400"><img src="/icons/rewards/gold_coin.svg" alt="Gold" className="inline w-4 h-4 align-[-2px]" /> {engine.totalGoldEarned}</p>
            <p className="text-sm text-gray-500 mt-1">Gold Earned</p>
          </div>
        </div>

        <GameButton
          onClick={onExit}
          className="bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
        >
          Return to Campaign Map
        </GameButton>
      </div>
    </div>
  );
}
