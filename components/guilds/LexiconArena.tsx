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
import { playChime, playClash, playLevelUp } from '@/lib/sounds';
import { CharacterStats } from '@/hooks/useWeeklyData';
import { GUILDS } from '@/lib/dailyChecklist';
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

interface LexiconWord {
  id: string;
  language: string;
  definition: string;
  correct_spelling: string;
  wrong_a: string;
  wrong_b: string;
  wrong_c: string;
  grade_level: number;
}

interface LexiconArenaProps {
  userId: string;
  weekStartingDate: string;
  currentStats: CharacterStats;
  onGoldEarned: (newStats: CharacterStats) => void;
  onExit: () => void;
}

type ScreenState = 'loading' | 'ready' | 'playing' | 'results';

export default function LexiconArena({ userId, weekStartingDate, currentStats, onGoldEarned, onExit }: LexiconArenaProps) {
  const [screen, setScreen] = useState<ScreenState>('loading');
  const [words, setWords] = useState<LexiconWord[]>([]);
  const [profile, setProfile] = useState<SubclassProfile | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [choices, setChoices] = useState<string[]>([]);
  const [newCurioId, setNewCurioId] = useState<string | null>(null);
  const [companionGraduation, setCompanionGraduation] = useState<{
    fromDef: MonsterDef; toDef: MonsterDef; monsterLevel: number; quality: QualityTier;
  } | null>(null);

  const isTala = userId === 'tala';
  const timeLimit = isTala ? 120 : 60;
  const engine = useTimeAttack<LexiconWord>(words, timeLimit);

  // Theme colors
  const accent = isTala ? 'text-pink-600' : 'text-amber-600';
  const langBadge = isTala
    ? 'bg-pink-50 text-pink-700 border border-pink-200'
    : 'bg-blue-50 text-blue-700 border border-blue-200';

  // Load words — routed through the shared guild engine so Lexicon Arena
  // gets the same no-repeat completion tracking and grade-stage
  // progression/prestige as the other 4 guilds, instead of re-serving the
  // full pool every session.
  useEffect(() => {
    async function loadPool() {
      try {
        const [pool, subProfile] = await Promise.all([
          takePrefetch<any[]>(userId, 'guildPool:lexicon_arena')
            ?? fetchQuestionPool(userId, 'sq_lexicon_arena', 'lexicon_arena'),
          takePrefetch<SubclassProfile | null>(userId, 'subclassProfile')
            ?? fetchSubclassProfile(userId)
        ]);
        setWords(shuffle(pool as LexiconWord[]));
        setProfile(subProfile);
        setScreen('ready');
      } catch (err) {
        console.error('Failed to load Lexicon Arena data:', err);
      }
    }
    loadPool();
  }, []);

  useEffect(() => {
    if (engine.phase === 'ended' && screen === 'playing') handleSessionEnd();
  }, [engine.phase]);

  // Re-shuffle the 4 spelling choices each time the word changes — otherwise
  // correct_spelling would sit in a fixed slot across words (same class of
  // bug fixed in the other 4 guilds).
  useEffect(() => {
    if (!engine.currentQuestion) return;
    const w = engine.currentQuestion;
    setChoices(shuffle([w.correct_spelling, w.wrong_a, w.wrong_b, w.wrong_c]));
    setSelected(null);
    setFeedback(null);
  }, [engine.currentQuestion]);

  const handleChoice = (choice: string) => {
    if (selected || !engine.currentQuestion) return;
    const isCorrect = choice === engine.currentQuestion.correct_spelling;
    setSelected(choice);
    setFeedback(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) playChime(); else playClash();
    setTimeout(() => {
      engine.submitResult(isCorrect, engine.currentQuestion!.id, gradeStageIndex(engine.currentQuestion!.grade_level));
      setSelected(null);
      setFeedback(null);
    }, 400);
  };

  const handleSessionEnd = async () => {
    setScreen('results');
    trackEvent('guild_quiz_complete', { guild_key: 'lexicon_arena', correct_count: engine.correctCount, wrong_count: engine.wrongCount, xp_earned: engine.totalXpEarned, gold_earned: engine.totalGoldEarned });
    await markQuestionsCompleted(userId, 'lexicon_arena', engine.completedQuestionIds);

    if (profile) {
      const { level, xp } = applyLevelUp(profile.lexicon_arena_lvl, profile.lexicon_arena_xp, engine.totalXpEarned);
      await updateSubclassProfile(userId, { lexicon_arena_lvl: level, lexicon_arena_xp: xp });
      if (profile.lexicon_arena_lvl < GUILD_MONSTER_GRANT_LEVEL && level >= GUILD_MONSTER_GRANT_LEVEL) {
        const grantedId = await ensureGuildMonsterGranted(userId, 'lexicon_arena');
        if (grantedId) setNewCurioId(grantedId);
      } else if (profile.lexicon_arena_lvl >= GUILD_MONSTER_GRANT_LEVEL) {
        const tierCrossed = getCompanionTierCrossed('lexicon_arena', profile.lexicon_arena_lvl, level);
        const speciesDef = tierCrossed ? getCompanionSpeciesDef('lexicon_arena') : undefined;
        if (tierCrossed && speciesDef) {
          const { level: monsterLevel, quality } = await fetchCompanionInstanceStats(userId, 'lexicon_arena');
          setCompanionGraduation({
            fromDef: getGuildMonsterTierDef(speciesDef, (tierCrossed - 1) as 1 | 2),
            toDef: getGuildMonsterTierDef(speciesDef, tierCrossed),
            monsterLevel,
            quality,
          });
        }
      }
    }

    // Lexicon Arena is unique among the 5 guilds in also feeding the
    // player's overall character XP/level (not just Subclass XP) — preserved
    // as-is from before this guild was unified onto useTimeAttack.
    let newXp = currentStats.xp + engine.totalXpEarned;
    let newLevel = currentStats.level;
    while (newXp >= (500 + newLevel * 100)) {
      newXp -= (500 + newLevel * 100);
      newLevel++;
    }
    if (newLevel > currentStats.level) {
      playLevelUp();
      logAction(userId, weekStartingDate, 'achievement', `🎉 Leveled up to Level ${newLevel}!`, 0, 0);
    }

    const newStats: CharacterStats = {
      ...currentStats,
      gold: currentStats.gold + engine.totalGoldEarned,
      xp: newXp,
      level: newLevel,
    };
    onGoldEarned(newStats);
    logAction(userId, weekStartingDate, 'side_quest', `Lexicon Arena session: ${engine.correctCount} correct, ${engine.wrongCount} wrong, ${engine.totalXpEarned} Subclass XP`, 0, engine.totalGoldEarned);
  };

  if (screen === 'loading') {
    return (
      <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center text-gray-400 animate-pulse">
        Sharpening quills in the arena...
      </div>
    );
  }

  if (screen === 'ready') {
    return (
      <div className="max-w-2xl mx-auto battle-panel-in">
        <div className="bg-white/90 border border-stone-200 rounded-2xl shadow-sm p-8 text-center">
          <div className="w-40 h-40 mx-auto mb-4">
            <GuardianSprite guild="lexiconarena" pose="idle" className="w-full h-full" />
          </div>
          <h2 className={`text-3xl font-display font-bold mb-2 ${accent}`}>Lexicon Arena</h2>
          <p className="text-gray-500 italic text-sm mb-3 max-w-md mx-auto">{GUILDS.find(g => g.key === 'lexicon_arena')?.lore}</p>
          <p className={`${accent} font-mono mb-1`}>Lvl {profile?.lexicon_arena_lvl || 1} · {profile?.lexicon_arena_xp || 0}/500 XP</p>
          <p className="text-gray-500 text-xs mb-1">Grade {profile?.lexicon_arena_tier || MIN_GRADE_STAGE} · {gradeStageStars(profile?.lexicon_arena_tier || MIN_GRADE_STAGE)}</p>
          <p className="text-gray-500 mb-6 text-sm max-w-md mx-auto">
            Read the definition carefully, then pick the <span className="font-bold text-white">correctly spelled word</span> from the four choices. Watch out — the wrong ones look very close!
          </p>

          <div className="grid grid-cols-3 gap-4 mb-8 text-center">
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-2xl font-bold font-mono text-white">⏱ {timeLimit}s</p>
              <p className="text-xs text-gray-500 mt-1">Time Limit</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className={`text-2xl font-bold font-mono ${accent}`}>+{XP_PER_CORRECT} XP</p>
              <p className="text-xs text-gray-500 mt-1">Per Correct</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-2xl font-bold font-mono text-amber-600">+{GOLD_PER_CORRECT}<img src="/icons/rewards/gold_coin.svg" alt="Gold" className="inline w-4 h-4 align-[-2px]" /></p>
              <p className="text-xs text-gray-500 mt-1">Per Correct</p>
            </div>
          </div>

          {words.length === 0 ? (
            <p className="text-red-500">No active words found for this term.</p>
          ) : (
            <GameButton
              variant="quest"
              color={isTala ? '#db2777' : '#d97706'}
              onClick={() => { engine.start(); setScreen('playing'); trackEvent('guild_quiz_start', { guild_key: 'lexicon_arena' }); }}
              style={{ fontSize: 17 }}
            >
              ⚔️ Enter the Arena
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
    const w = engine.currentQuestion;
    const timerPct = (engine.timeLeft / timeLimit) * 100;
    const timerColor = engine.timeLeft <= 10 ? 'bg-red-500' : engine.timeLeft <= 20 ? 'bg-yellow-500' : isTala ? 'bg-pink-500' : 'bg-amber-500';

    return (
      <div className="fixed inset-0 font-serif flex flex-col lg:flex-row lg:items-center lg:justify-center lg:bg-blue-900" style={{ zIndex: 80 }}>
        <CritBonusToast event={engine.lastCrit} />
        <div className="flex flex-col w-full lg:max-w-xl lg:max-h-[90vh] lg:rounded-2xl lg:overflow-hidden lg:shadow-2xl flex-1 min-h-0 lg:flex-none">

          {/* HUD */}
          <div className="flex-shrink-0 bg-stone-900">
            <div className="flex justify-between items-center px-4 py-2">
              <span className={`text-lg font-bold ${engine.timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-blue-400'}`}>⏱ {engine.timeLeft}s</span>
              <span className="text-sm text-orange-400 font-bold">🔥 x{engine.currentMultiplier}</span>
              <span className="text-sm text-blue-400 font-bold">Score: {engine.score}</span>
            </div>
            <div className="h-1.5 bg-stone-700 w-full">
              <div className={`h-1.5 transition-all ${timerColor}`} style={{ width: `${timerPct}%` }} />
            </div>
          </div>

          {/* Sprite strip */}
          <div
            className="flex-shrink-0 flex items-center justify-center py-2"
            style={{ backgroundImage: "url('/guilds/lex-bg.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="w-40 h-40 landscape:w-20 landscape:h-20 lg:w-52 lg:h-52">
              <GuardianSprite guild="lexiconarena" pose={feedback === 'correct' ? 'hurt' : 'idle'} className="w-full h-full" />
            </div>
          </div>

          {/* Word card */}
          <div className="flex-1 flex flex-col min-h-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={w.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.15 }}
                className="bg-white border-t border-stone-200 p-4 shadow-sm flex flex-col flex-1 landscape:overflow-y-auto"
              >
                {/* Language badge */}
                <div className="flex justify-between items-center mb-3">
                  <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full ${langBadge}`}>
                    {w.language}
                  </span>
                  <span className="text-xs text-gray-500 font-mono">{gradeStageStars(w.grade_level)}</span>
                </div>

                {/* Definition */}
                <p className="text-base text-gray-800 leading-relaxed mb-4 text-center font-medium">
                  "{w.definition}"
                </p>

                {/* Choices */}
                <div className="grid grid-cols-2 gap-2 landscape:grid-cols-2">
                  {choices.map((choice, idx) => {
                    const isSelected = selected === choice;
                    const isCorrect = choice === w.correct_spelling;
                    let cardStyle = 'bg-amber-50 border-amber-200 hover:border-blue-400 hover:bg-blue-50 text-gray-800';
                    if (feedback && isSelected) {
                      cardStyle = feedback === 'correct' ? 'bg-green-50 border-green-400 text-gray-800' : 'bg-red-50 border-red-400 text-gray-800';
                    } else if (feedback && isCorrect) {
                      cardStyle = 'bg-green-50 border-green-400 text-gray-800';
                    }
                    return (
                      <GameButton
                        key={`${choice}-${idx}`}
                        onClick={() => handleChoice(choice)}
                        disabled={selected !== null}
                        className={`w-full p-3 rounded-xl border-2 text-center font-bold text-sm transition-all ${cardStyle} disabled:cursor-default`}
                      >
                        {choice}
                      </GameButton>
                    );
                  })}
                </div>

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
  const rank = engine.correctCount >= 10 ? { emoji: '🏆', label: 'Lexicon Master', color: 'text-yellow-500' }
    : engine.correctCount >= 5 ? { emoji: '⭐', label: 'Word Adept', color: 'text-blue-400' }
    : { emoji: '📜', label: 'Apprentice', color: 'text-stone-400' };

  return (
    <div className="fixed inset-0 font-serif flex flex-col lg:flex-row lg:items-center lg:justify-center lg:bg-blue-900 battle-panel-in" style={{ zIndex: 80 }}>
      {newCurioId && ALL_MONSTERS[newCurioId] && (
        <CurioRevealModal monster={ALL_MONSTERS[newCurioId]} userId={userId} onClose={() => { setNewCurioId(null); onExit(); }} />
      )}
      {companionGraduation && (
        <GraduationCeremonyModal {...companionGraduation} userId={userId} onGoToCompendium={() => { setCompanionGraduation(null); onExit(); }} />
      )}
      <div className="flex flex-col w-full lg:max-w-xl lg:max-h-[90vh] lg:rounded-2xl lg:overflow-hidden lg:shadow-2xl flex-1 min-h-0 lg:flex-none">
        <div className="flex-shrink-0 bg-stone-900 px-4 py-3 flex items-center justify-between">
          <span className="text-blue-400 font-bold text-sm tracking-wide uppercase">Session Complete</span>
          <span className={`text-lg font-bold ${rank.color}`}>{rank.emoji} {rank.label}</span>
        </div>
        <div className="flex flex-col landscape:flex-row flex-1 min-h-0">
          <div
            className="flex-shrink-0 flex items-center justify-center py-4 landscape:w-2/5 landscape:py-0"
            style={{ backgroundImage: "url('/guilds/lex-bg.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="w-44 h-44 landscape:w-32 landscape:h-32 lg:w-52 lg:h-52">
              <GuardianSprite guild="lexiconarena" pose="defeated" className="w-full h-full" />
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
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-center">
                <p className={`text-3xl font-bold font-mono ${accent}`}>+{engine.totalXpEarned}</p>
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
                  <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Accuracy</span><span className={`font-bold ${accent}`}>{pct}%</span></div>
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div className={`h-2 rounded-full transition-all ${isTala ? 'bg-pink-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })()}
            <div className="flex flex-col gap-3 mt-auto pt-2">
              <GameButton variant="quest" color="#3b82f6" onClick={() => { engine.start(); setScreen('playing'); }} className="w-full" style={{ fontSize: 15 }}>⚔️ Play Again</GameButton>
              <GameButton variant="quest" color="#8b5e2a" onClick={onExit} className="w-full" style={{ fontSize: 14 }}>← Return to Campaign Map</GameButton>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
