'use client';
import { useState, useEffect } from 'react';
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
  difficulty_tier: number;
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
  const [newCurioId, setNewCurioId] = useState<string | null>(null);
  const [companionGraduation, setCompanionGraduation] = useState<{
    fromDef: MonsterDef; toDef: MonsterDef; monsterLevel: number; quality: QualityTier;
  } | null>(null);

  const isTala = userId === 'tala';
  const gradeLevel = gradeToNumber(USERS[userId]?.grade);
  const timeLimit = isTala ? 120 : 60;
  const engine = useTimeAttack<LogicLabyrinthQuestion>(questions, timeLimit);

  useEffect(() => {
    async function loadPool() {
      try {
        const [pool, subProfile] = await Promise.all([
          fetchQuestionPool(userId, 'sq_logic_labyrinth', 'logic_labyrinth', gradeLevel),
          fetchSubclassProfile(userId)
        ]);
        // Shuffle each puzzle's options too — otherwise correct_option_id
        // tends to sit in the same array slot across puzzles (same class of
        // bug fixed in Lorekeeper: a fixed answer position lets a kid win
        // every round by spam-clicking that slot instead of solving anything).
        const parsed = (pool as any[]).map(q => ({
          ...q,
          options_array: shuffle(typeof q.options_array === 'string' ? JSON.parse(q.options_array) : q.options_array)
        }));
        setQuestions(shuffle(parsed as LogicLabyrinthQuestion[]));
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
      engine.submitResult(isCorrect, engine.currentQuestion!.id, engine.currentQuestion!.difficulty_tier);
      setSelectedOption(null);
      setFlashResult(null);
    }, 500);
  };

  const handleSessionEnd = async () => {
    setScreen('results');
    trackEvent('guild_quiz_complete', { guild_key: 'logic_labyrinth', correct_count: engine.correctCount, wrong_count: engine.wrongCount, xp_earned: engine.totalXpEarned, gold_earned: engine.totalGoldEarned });
    await markQuestionsCompleted(userId, 'logic_labyrinth', engine.completedQuestionIds);
    if (profile) {
      const { level, xp } = applyLevelUp(profile.logic_labyrinth_lvl, profile.logic_labyrinth_xp, engine.totalXpEarned);
      await updateSubclassProfile(userId, {
 logic_labyrinth_lvl: level, logic_labyrinth_xp: xp });
      if (profile.logic_labyrinth_lvl < GUILD_MONSTER_GRANT_LEVEL && level >= GUILD_MONSTER_GRANT_LEVEL) {
        const grantedId = await ensureGuildMonsterGranted(userId, 'logic_labyrinth');
        if (grantedId) setNewCurioId(grantedId);
      } else if (profile.logic_labyrinth_lvl >= GUILD_MONSTER_GRANT_LEVEL) {
        const tierCrossed = getCompanionTierCrossed('logic_labyrinth', profile.logic_labyrinth_lvl, level);
        const speciesDef = tierCrossed ? getCompanionSpeciesDef('logic_labyrinth') : undefined;
        if (tierCrossed && speciesDef) {
          const { level: monsterLevel, quality } = await fetchCompanionInstanceStats(userId, 'logic_labyrinth');
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
      logAction(userId, weekStartingDate, 'side_quest', `Logic Labyrinth session: ${engine.correctCount} correct, ${engine.totalXpEarned} Subclass XP`, 0, engine.totalGoldEarned);
    }
  };

  if (screen === 'loading') {
    return <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center text-gray-400 animate-pulse">Initializing logic matrices...</div>;
  }

  if (screen === 'ready') {
    return (
      <div className="max-w-2xl mx-auto battle-panel-in">
        <div className="bg-white/90 border border-stone-200 rounded-2xl shadow-sm p-8 text-center">
          <div className="w-40 h-40 mx-auto mb-4">
            <GuardianSprite guild="logiclabyrinth" pose="idle" className="w-full h-full" />
          </div>
          <h2 className="text-4xl font-display font-bold text-cyan-700 mb-2">Logic Labyrinth</h2>
          <p className="text-cyan-700 font-mono italic text-sm mb-3 max-w-md mx-auto">{GUILDS.find(g => g.key === 'logic_labyrinth')?.lore}</p>
          <p className="text-gray-500 font-mono mb-1">Lvl {profile?.logic_labyrinth_lvl || 1} · {profile?.logic_labyrinth_xp || 0}/500 XP</p>
          <p className="text-cyan-700 text-xs font-mono mb-1">Difficulty {'★'.repeat(profile?.logic_labyrinth_tier || 1)}{'☆'.repeat(Math.max(0, 3 - (profile?.logic_labyrinth_tier || 1)))}</p>
          <p className="text-gray-500 mb-6 text-sm max-w-md mx-auto">Study the pattern or puzzle above, then tap the correct answer from the grid below. Speed and accuracy both matter.</p>

          <div className="grid grid-cols-3 gap-4 mb-8 text-center">
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-2xl font-bold font-mono text-white">⏱ {timeLimit}s</p>
              <p className="text-xs text-gray-500 mt-1">Time Limit</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-2xl font-bold font-mono text-cyan-400">+{XP_PER_CORRECT} XP</p>
              <p className="text-xs text-gray-500 mt-1">Per Correct</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-2xl font-bold font-mono text-amber-600">+{GOLD_PER_CORRECT}<img src="/icons/rewards/gold_coin.svg" alt="Gold" className="inline w-4 h-4 align-[-2px]" /></p>
              <p className="text-xs text-gray-500 mt-1">Per Correct</p>
            </div>
          </div>

          {questions.length === 0 ? (
            <p className="text-red-500">No active puzzles found for this term.</p>
          ) : (
            <GameButton onClick={() => { engine.start(); setScreen('playing'); trackEvent('guild_quiz_start', { guild_key: 'logic_labyrinth' }); }}
              className="bg-cyan-800 hover:bg-cyan-700 text-white font-bold py-3 px-10 rounded-xl transition-colors font-display text-lg">
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
    const timerColor = engine.timeLeft <= 10 ? 'bg-red-500' : engine.timeLeft <= 20 ? 'bg-yellow-500' : 'bg-cyan-500';
    const feedbackClass = flashResult === 'correct' ? 'battle-answer-correct' : flashResult === 'wrong' ? 'battle-answer-wrong' : '';

    return (
      <div className="fixed inset-0 font-serif flex flex-col lg:flex-row lg:items-center lg:justify-center lg:bg-cyan-900" style={{ zIndex: 80 }}>
        <CritBonusToast event={engine.lastCrit} />
        <div className="flex flex-col w-full lg:max-w-xl lg:max-h-[90vh] lg:rounded-2xl lg:overflow-hidden lg:shadow-2xl flex-1 min-h-0 lg:flex-none">

          {/* HUD */}
          <div className="flex-shrink-0 bg-stone-900">
            <div className="flex justify-between items-center px-4 py-2">
              <span className={`text-lg font-bold ${engine.timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-cyan-400'}`}>⏱ {engine.timeLeft}s</span>
              <span className="text-sm text-orange-400 font-bold">🔥 x{engine.currentMultiplier}</span>
              <span className="text-sm text-cyan-400 font-bold">Score: {engine.score}</span>
            </div>
            <div className="h-1.5 bg-stone-700 w-full">
              <div className="h-1.5 bg-cyan-500 transition-all" style={{ width: `${timerPct}%` }} />
            </div>
          </div>

          {/* Sprite strip */}
          <div
            className="flex-shrink-0 flex items-center justify-center py-2"
            style={{ backgroundImage: "url('/guilds/logic-bg.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="w-40 h-40 landscape:w-20 landscape:h-20 lg:w-52 lg:h-52">
              <GuardianSprite guild="logiclabyrinth" pose={flashResult === 'correct' ? 'hurt' : 'idle'} className="w-full h-full" />
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

                {q.matrix_image_url && (
                  <div className="flex justify-center mb-4">
                    <img src={q.matrix_image_url} alt="Logic matrix" className="max-h-40 rounded-lg border border-stone-200 object-contain" />
                  </div>
                )}

                {q.puzzle_prompt_text && (
                  <p className="text-base text-gray-800 text-center mb-4 leading-relaxed bg-amber-50 border border-amber-100 rounded-xl p-3">
                    {q.puzzle_prompt_text}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {q.options_array.map((opt) => {
                    let style = 'bg-amber-50 border-amber-200 hover:border-cyan-400 hover:bg-cyan-50';
                    if (selectedOption === opt.id) {
                      style = opt.id === q.correct_option_id ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400';
                    }
                    return (
                      <GameButton
                        key={opt.id}
                        onClick={() => handleSelect(opt.id)}
                        disabled={selectedOption !== null}
                        className={`border-2 rounded-xl p-3 transition-colors text-center ${style} disabled:cursor-default`}
                      >
                        {opt.image_url ? (
                          <img src={opt.image_url} alt={opt.label} className="max-h-20 mx-auto object-contain" />
                        ) : (
                          <span className="text-base font-bold text-gray-800">{opt.label}</span>
                        )}
                      </GameButton>
                    );
                  })}
                </div>

                <div className="flex justify-between text-xs text-gray-500 font-mono mt-3">
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
  const rank = engine.correctCount >= 10 ? { emoji: '🏆', label: 'Logic Master', color: 'text-yellow-500' }
    : engine.correctCount >= 5 ? { emoji: '⭐', label: 'Adept Solver', color: 'text-cyan-400' }
    : { emoji: '🧩', label: 'Apprentice', color: 'text-stone-400' };

  return (
    <div className="fixed inset-0 font-serif flex flex-col lg:flex-row lg:items-center lg:justify-center lg:bg-cyan-900 battle-panel-in" style={{ zIndex: 80 }}>
      {newCurioId && ALL_MONSTERS[newCurioId] && (
        <CurioRevealModal monster={ALL_MONSTERS[newCurioId]} userId={userId} onClose={() => setNewCurioId(null)} />
      )}
      {companionGraduation && (
        <GraduationCeremonyModal {...companionGraduation} userId={userId} onGoToCompendium={() => setCompanionGraduation(null)} />
      )}
      <div className="flex flex-col w-full lg:max-w-xl lg:max-h-[90vh] lg:rounded-2xl lg:overflow-hidden lg:shadow-2xl flex-1 min-h-0 lg:flex-none">
        <div className="flex-shrink-0 bg-stone-900 px-4 py-3 flex items-center justify-between">
          <span className="text-cyan-400 font-bold text-sm tracking-wide uppercase">Session Complete</span>
          <span className={`text-lg font-bold ${rank.color}`}>{rank.emoji} {rank.label}</span>
        </div>
        <div className="flex flex-col landscape:flex-row flex-1 min-h-0">
          <div
            className="flex-shrink-0 flex items-center justify-center py-4 landscape:w-2/5 landscape:py-0"
            style={{ backgroundImage: "url('/guilds/logic-bg.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="w-44 h-44 landscape:w-32 landscape:h-32 lg:w-52 lg:h-52">
              <GuardianSprite guild="logiclabyrinth" pose="defeated" className="w-full h-full" />
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
              <div className="bg-cyan-50 border border-cyan-200 rounded-2xl p-3 text-center">
                <p className="text-3xl font-bold font-mono text-cyan-700">+{engine.totalXpEarned}</p>
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
                  <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Accuracy</span><span className="font-bold text-cyan-700">{pct}%</span></div>
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-2 bg-cyan-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })()}
            <div className="flex flex-col gap-3 mt-auto pt-2">
              <GameButton onClick={() => { engine.start(); setScreen('playing'); }} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-6 rounded-xl transition-colors text-base">⚔️ Play Again</GameButton>
              <GameButton onClick={onExit} className="w-full bg-stone-100 hover:bg-stone-200 text-gray-600 font-bold py-3 px-6 rounded-xl transition-colors text-sm">← Return to Campaign Map</GameButton>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
