'use client';
import { useState, useEffect, useRef } from 'react';
import { useTimeAttack } from '@/hooks/useTimeAttack';
import {
  fetchQuestionPool, markQuestionsCompleted, fetchSubclassProfile, updateSubclassProfile,
  ensureGuildMonsterGranted, GUILD_MONSTER_GRANT_LEVEL, SubclassProfile,
  getCompanionTierCrossed, fetchCompanionInstanceStats, getCompanionSpeciesDef,
  gradeStageIndex, gradeStageStars,
} from '@/lib/guildEngine';
import { applyLevelUp, XP_PER_CORRECT, GOLD_PER_CORRECT } from '@/lib/guildConfig';
import { logAction } from '@/lib/playerlog';
import { trackEvent } from '@/lib/analytics';
import { playChime, playClash } from '@/lib/sounds';
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

interface SpellCasterQuestion {
  id: string;
  word_string: string;
  grade_level: number;
}

interface SpellCasterProps {
  userId: string;
  weekStartingDate: string;
  currentStats: CharacterStats;
  onGoldEarned: (newStats: CharacterStats) => void;
  onExit: () => void;
}

type ScreenState = 'loading' | 'ready' | 'playing' | 'results';

export default function SpellCaster({ userId, weekStartingDate, currentStats, onGoldEarned, onExit }: SpellCasterProps) {
  const [screen, setScreen] = useState<ScreenState>('loading');
  const [questions, setQuestions] = useState<SpellCasterQuestion[]>([]);
  const [profile, setProfile] = useState<SubclassProfile | null>(null);
  const [typedValue, setTypedValue] = useState('');
  const [flashResult, setFlashResult] = useState<'correct' | 'wrong' | null>(null);
  const [newCurioId, setNewCurioId] = useState<string | null>(null);
  const [companionGraduation, setCompanionGraduation] = useState<{
    fromDef: MonsterDef; toDef: MonsterDef; monsterLevel: number; quality: QualityTier;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isTala = userId === 'tala';
  const timeLimit = isTala ? 120 : 60;
  const engine = useTimeAttack<SpellCasterQuestion>(questions, timeLimit)

  useEffect(() => {
    async function loadPool() {
      const [pool, subProfile] = await Promise.all([
        takePrefetch<any[]>(userId, 'guildPool:spellcaster')
          ?? fetchQuestionPool(userId, 'sq_spellcaster', 'spellcaster'),
        takePrefetch<SubclassProfile | null>(userId, 'subclassProfile')
          ?? fetchSubclassProfile(userId)
      ]);
      setQuestions(shuffle(pool as SpellCasterQuestion[]));
      setProfile(subProfile);
      setScreen('ready');
    }
    loadPool();
  }, []);

  useEffect(() => {
    if (engine.phase === 'ended' && screen === 'playing') {
      handleSessionEnd();
    }
  }, [engine.phase]);

  // Auto-focus input when playing starts. The input is never remounted
  // between words (see the static wrapper below), so a one-time focus here
  // is enough — no per-word refocus needed, keeping typing uninterrupted.
  useEffect(() => {
    if (screen === 'playing') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [screen]);

  // Real-time match check — no Enter key needed
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTypedValue(val);

    if (!engine.currentQuestion) return;
    const target = engine.currentQuestion.word_string;

    if (val.toLowerCase() === target.toLowerCase()) {
      // Correct match
      playChime();
      setFlashResult('correct');
      engine.submitResult(true, engine.currentQuestion.id, gradeStageIndex(engine.currentQuestion.grade_level));
      setTypedValue('');
      setTimeout(() => setFlashResult(null), 300);
    } else if (val.length >= target.length && !target.toLowerCase().startsWith(val.toLowerCase())) {
      // Wrong — typed as many chars as the word but it doesn't match
      playClash();
      setFlashResult('wrong');
      engine.submitResult(false, engine.currentQuestion.id);
      setTypedValue('');
      setTimeout(() => setFlashResult(null), 300);
    }
  };

  const handleSessionEnd = async () => {
    setScreen('results');
    trackEvent('guild_quiz_complete', { guild_key: 'spellcaster', correct_count: engine.correctCount, wrong_count: engine.wrongCount, xp_earned: engine.totalXpEarned, gold_earned: engine.totalGoldEarned });
    await markQuestionsCompleted(userId, 'spellcaster', engine.completedQuestionIds);
    if (profile) {
      const { level, xp } = applyLevelUp(profile.spellcaster_lvl, profile.spellcaster_xp, engine.totalXpEarned);
      await updateSubclassProfile(userId, { spellcaster_lvl: level, spellcaster_xp: xp });
      if (profile.spellcaster_lvl < GUILD_MONSTER_GRANT_LEVEL && level >= GUILD_MONSTER_GRANT_LEVEL) {
        const grantedId = await ensureGuildMonsterGranted(userId, 'spellcaster');
        if (grantedId) setNewCurioId(grantedId);
      } else if (profile.spellcaster_lvl >= GUILD_MONSTER_GRANT_LEVEL) {
        const tierCrossed = getCompanionTierCrossed('spellcaster', profile.spellcaster_lvl, level);
        const speciesDef = tierCrossed ? getCompanionSpeciesDef('spellcaster') : undefined;
        if (tierCrossed && speciesDef) {
          const { level: monsterLevel, quality } = await fetchCompanionInstanceStats(userId, 'spellcaster');
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
      logAction(userId, weekStartingDate, 'side_quest', `SpellCaster session: ${engine.correctCount} words spelled, ${engine.totalXpEarned} Subclass XP`, 0, engine.totalGoldEarned);
    }
  };

  // Highlight typed characters — green if matching so far, red if mismatch
  const renderWordDisplay = () => {
    if (!engine.currentQuestion) return null;
    const target = engine.currentQuestion.word_string;
    return (
      <div className="flex justify-center gap-0.5 mb-8">
        {target.split('').map((char, i) => {
          const typed = typedValue[i];
          let color = 'text-gray-600'; // untyped
          if (typed !== undefined) {
            color = typed.toLowerCase() === char.toLowerCase() ? 'text-violet-300' : 'text-red-500';
          }
          return (
            <span key={i} className={`text-4xl font-mono font-bold tracking-widest text-gray-900 ${color}`}>
              {char}
            </span>
          );
        })}
      </div>
    );
  };

  if (screen === 'loading') {
    return (
      <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center text-gray-400 animate-pulse">
        Summoning spell library...
      </div>
    );
  }

  if (screen === 'ready') {
    return (
      <div className="max-w-2xl mx-auto battle-panel-in">
        <div className="bg-white/90 border border-stone-200 rounded-2xl shadow-sm p-8 text-center">
          <div className="w-40 h-40 mx-auto mb-4">
            <GuardianSprite guild="spellcaster" pose="idle" className="w-full h-full" />
          </div>
          <h2 className="text-4xl font-display font-bold text-violet-700 mb-2">SpellCaster Guild</h2>
          <p className="text-gray-500 italic text-sm mb-3 max-w-md mx-auto">{GUILDS.find(g => g.key === 'spellcaster')?.lore}</p>
          <p className="text-violet-600 font-medium mb-1">Lvl {profile?.spellcaster_lvl || 1} · {profile?.spellcaster_xp || 0}/500 XP</p>
          <p className="text-gray-500 mb-6 text-sm max-w-md mx-auto">Type each word exactly as shown. The moment you spell it correctly, it vanishes and the next appears. No Enter key — pure speed.</p>

          <div className="grid grid-cols-3 gap-4 mb-8 text-center">
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-2xl font-bold font-mono text-white">⏱ {timeLimit}s</p>
              <p className="text-xs text-gray-500 mt-1">Time Limit</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-2xl font-bold font-mono text-violet-400">+{XP_PER_CORRECT} XP</p>
              <p className="text-xs text-gray-500 mt-1">Per Correct</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-2xl font-bold font-mono text-amber-600">+{GOLD_PER_CORRECT}<img src="/icons/rewards/gold_coin.svg" alt="Gold" className="inline w-4 h-4 align-[-2px]" /></p>
              <p className="text-xs text-gray-500 mt-1">Per Correct</p>
            </div>
          </div>

          {questions.length === 0 ? (
            <p className="text-red-500">No active words found for this term. Ask Tatay to add some in Supabase.</p>
          ) : (
            <GameButton
              variant="quest"
              color={isTala ? '#db2777' : '#9333ea'}
              onClick={() => { engine.start(); setScreen('playing'); trackEvent('guild_quiz_start', { guild_key: 'spellcaster' }); }}
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
    const difficultyStars = gradeStageStars(engine.currentQuestion.grade_level);
    const timerPct = (engine.timeLeft / timeLimit) * 100;
    const timerColor = engine.timeLeft <= 10 ? 'bg-red-500' : engine.timeLeft <= 20 ? 'bg-yellow-500' : 'bg-violet-500';
    const feedbackClass = flashResult === 'correct' ? 'battle-answer-correct' : flashResult === 'wrong' ? 'battle-answer-wrong' : '';

    return (
      <div className="fixed inset-0 font-serif flex flex-col lg:flex-row lg:items-center lg:justify-center lg:bg-violet-900" style={{ zIndex: 80 }}>
        <CritBonusToast event={engine.lastCrit} />
        <div className="flex flex-col w-full lg:max-w-xl lg:max-h-[90vh] lg:rounded-2xl lg:overflow-hidden lg:shadow-2xl flex-1 min-h-0 lg:flex-none">

          {/* HUD */}
          <div className="flex-shrink-0 bg-stone-900">
            <div className="flex justify-between items-center px-4 py-2">
              <span className={`text-lg font-bold ${engine.timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-violet-400'}`}>⏱ {engine.timeLeft}s</span>
              <span className="text-sm text-orange-400 font-bold">🔥 x{engine.currentMultiplier}</span>
              <span className="text-sm text-violet-400 font-bold">Score: {engine.score}</span>
            </div>
            <div className="h-1.5 bg-stone-700 w-full">
              <div className="h-1.5 bg-violet-500 transition-all" style={{ width: `${timerPct}%` }} />
            </div>
          </div>

          {/* Sprite strip */}
          <div
            className="flex-shrink-0 flex items-center justify-center py-2"
            style={{ backgroundImage: "url('/guilds/spell-bg.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="w-40 h-40 landscape:w-20 landscape:h-20 lg:w-52 lg:h-52">
              <GuardianSprite guild="spellcaster" pose={flashResult === 'correct' ? 'hurt' : 'idle'} className="w-full h-full" />
            </div>
          </div>

          {/* Game card — static wrapper, input must never unmount between words */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className={`bg-white border-t border-stone-200 p-4 shadow-sm transition-colors ${feedbackClass} flex flex-col flex-1 landscape:overflow-y-auto`}>
              <p className="text-center text-xs text-gray-500 font-mono mb-4">{difficultyStars}</p>

              {renderWordDisplay()}

              <input
                ref={inputRef}
                type="text"
                value={typedValue}
                onChange={handleInput}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                className="w-full bg-stone-900 border-2 border-violet-700 rounded-lg p-4 text-center text-xl font-mono text-white focus:outline-none focus:border-violet-400 caret-violet-400"
                placeholder="Type the word..."
              />

              <div className="flex justify-between text-xs text-gray-500 font-mono mt-4">
                <span>✅ {engine.correctCount}</span>
                <span>❌ {engine.wrongCount}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // --- RESULTS ---
  const rank = engine.correctCount >= 10 ? { emoji: '🏆', label: 'Master Speller', color: 'text-yellow-500' }
    : engine.correctCount >= 5 ? { emoji: '⭐', label: 'Adept Mage', color: 'text-violet-400' }
    : { emoji: '🧙', label: 'Apprentice', color: 'text-stone-400' };

  return (
    <div className="fixed inset-0 font-serif flex flex-col lg:flex-row lg:items-center lg:justify-center lg:bg-violet-900 battle-panel-in" style={{ zIndex: 80 }}>
      {newCurioId && ALL_MONSTERS[newCurioId] && (
        <CurioRevealModal monster={ALL_MONSTERS[newCurioId]} userId={userId} onClose={() => setNewCurioId(null)} />
      )}
      {companionGraduation && (
        <GraduationCeremonyModal {...companionGraduation} userId={userId} onGoToCompendium={() => setCompanionGraduation(null)} />
      )}
      <div className="flex flex-col w-full lg:max-w-xl lg:max-h-[90vh] lg:rounded-2xl lg:overflow-hidden lg:shadow-2xl flex-1 min-h-0 lg:flex-none">
        <div className="flex-shrink-0 bg-stone-900 px-4 py-3 flex items-center justify-between">
          <span className="text-violet-400 font-bold text-sm tracking-wide uppercase">Session Complete</span>
          <span className={`text-lg font-bold ${rank.color}`}>{rank.emoji} {rank.label}</span>
        </div>
        <div className="flex flex-col landscape:flex-row flex-1 min-h-0">
          <div
            className="flex-shrink-0 flex items-center justify-center py-4 landscape:w-2/5 landscape:py-0"
            style={{ backgroundImage: "url('/guilds/spell-bg.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="w-44 h-44 landscape:w-32 landscape:h-32 lg:w-52 lg:h-52">
              <GuardianSprite guild="spellcaster" pose="defeated" className="w-full h-full" />
            </div>
          </div>
          <div className="flex-1 bg-white overflow-y-auto flex flex-col min-h-0">
          <div className="p-4 flex flex-col gap-3 flex-1">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-green-50 border border-green-200 rounded-2xl p-3 text-center">
                <p className="text-3xl font-bold font-mono text-green-600">{engine.correctCount}</p>
                <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wide">Words Spelled</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-center">
                <p className="text-3xl font-bold font-mono text-red-500">{engine.wrongCount}</p>
                <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wide">Missed</p>
              </div>
              <div className="bg-violet-50 border border-violet-200 rounded-2xl p-3 text-center">
                <p className="text-3xl font-bold font-mono text-violet-700">+{engine.totalXpEarned}</p>
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
                  <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Accuracy</span><span className="font-bold text-violet-700">{pct}%</span></div>
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-2 bg-violet-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })()}
            <div className="flex flex-col gap-3 mt-auto pt-2">
              <GameButton variant="quest" color="#9333ea" onClick={() => { engine.start(); setScreen('playing'); }} className="w-full" style={{ fontSize: 15 }}>⚔️ Play Again</GameButton>
              <GameButton variant="quest" color="#8b5e2a" onClick={onExit} className="w-full" style={{ fontSize: 14 }}>← Return to Campaign Map</GameButton>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
