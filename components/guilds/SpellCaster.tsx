'use client';
import { useState, useEffect, useRef } from 'react';
import { useTimeAttack } from '@/hooks/useTimeAttack';
import { fetchQuestionPool, markQuestionsCompleted, fetchSubclassProfile, updateSubclassProfile, ensureGuildMonsterGranted, GUILD_MONSTER_GRANT_LEVEL, SubclassProfile } from '@/lib/guildEngine';
import { applyLevelUp, XP_PER_CORRECT, GOLD_PER_CORRECT } from '@/lib/guildConfig';
import { logAction } from '@/lib/playerlog';
import { playChime, playClash } from '@/lib/sounds';
import { CharacterStats } from '@/hooks/useWeeklyData';
import { USERS } from '@/lib/userSession';
import GameButton from '@/components/GameButton';
import GuardianSprite from '@/components/guilds/GuardianSprite';

interface SpellCasterQuestion {
  id: string;
  word_string: string;
  difficulty_tier: number;
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
  const inputRef = useRef<HTMLInputElement>(null);

  const isTala = userId === 'tala';
  const gradeLevel = (USERS[userId]?.grade === 'Grade 2') ? 2 : 5;
  const timeLimit = isTala ? 120 : 60;
  const engine = useTimeAttack<SpellCasterQuestion>(questions, timeLimit)

  useEffect(() => {
    async function loadPool() {
      const [pool, subProfile] = await Promise.all([
        fetchQuestionPool(userId, 'sq_spellcaster', 'spellcaster', gradeLevel),
        fetchSubclassProfile(userId)
      ]);
      setQuestions(pool as SpellCasterQuestion[]);
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
      engine.submitResult(true, engine.currentQuestion.id);
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
    await markQuestionsCompleted(userId, 'spellcaster', engine.completedQuestionIds);
    if (profile) {
      const { level, xp } = applyLevelUp(profile.spellcaster_lvl, profile.spellcaster_xp, engine.totalXpEarned);
      await updateSubclassProfile(userId, { spellcaster_lvl: level, spellcaster_xp: xp });
      if (profile.spellcaster_lvl < GUILD_MONSTER_GRANT_LEVEL && level >= GUILD_MONSTER_GRANT_LEVEL) {
        await ensureGuildMonsterGranted(userId, 'spellcaster');
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
            color = typed.toLowerCase() === char.toLowerCase() ? 'text-violet-300' : 'text-red-400';
          }
          return (
            <span key={i} className={`text-4xl font-mono font-bold tracking-widest ${color}`}>
              {char}
            </span>
          );
        })}
      </div>
    );
  };

  if (screen === 'loading') {
    return (
      <div className="bg-[#13111c] border-2 border-violet-800 rounded-xl p-12 text-center text-violet-300 font-mono">
        Summoning spell library...
      </div>
    );
  }

  if (screen === 'ready') {
    return (
      <div className="max-w-2xl mx-auto battle-panel-in">
        <div className="bg-[#13111c] border-2 border-violet-800 rounded-2xl p-10 text-center shadow-2xl">
          <div className="w-40 h-40 mx-auto mb-4">
            <GuardianSprite guild="spellcaster" pose="idle" className="w-full h-full" />
          </div>
          <h2 className="text-4xl font-display font-bold text-violet-300 mb-2">🧙‍♂️ SpellCaster Guild</h2>
          <p className="text-violet-500 font-mono mb-1">Lvl {profile?.spellcaster_lvl || 1} · {profile?.spellcaster_xp || 0}/500 XP</p>
          <p className="text-gray-400 mb-8 font-mono text-sm max-w-md mx-auto">Type each word exactly as shown. The moment you spell it correctly, it vanishes and the next appears. No Enter key — pure speed.</p>

          <div className="grid grid-cols-3 gap-4 mb-8 text-center">
            <div className="bg-black/40 rounded-xl p-4">
              <p className="text-2xl font-bold font-mono text-white">⏱ {timeLimit}s</p>
              <p className="text-xs text-gray-500 mt-1">Time Limit</p>
            </div>
            <div className="bg-black/40 rounded-xl p-4">
              <p className="text-2xl font-bold font-mono text-violet-400">+{XP_PER_CORRECT} XP</p>
              <p className="text-xs text-gray-500 mt-1">Per Correct</p>
            </div>
            <div className="bg-black/40 rounded-xl p-4">
              <p className="text-2xl font-bold font-mono text-yellow-400">+{GOLD_PER_CORRECT}🪙</p>
              <p className="text-xs text-gray-500 mt-1">Per Correct</p>
            </div>
          </div>

          {questions.length === 0 ? (
            <p className="text-red-400">No active words found for this term. Ask Tatay to add some in Supabase.</p>
          ) : (
            <GameButton
              onClick={() => { engine.start(); setScreen('playing'); }}
              className="bg-violet-700 hover:bg-violet-600 text-white font-bold py-3 px-10 rounded-xl transition-colors font-mono text-lg"
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
    const difficultyStars = '★'.repeat(engine.currentQuestion.difficulty_tier) + '☆'.repeat(Math.max(0, 3 - engine.currentQuestion.difficulty_tier));
    const timerPct = (engine.timeLeft / timeLimit) * 100;
    const timerColor = engine.timeLeft <= 10 ? 'bg-red-500' : engine.timeLeft <= 20 ? 'bg-yellow-500' : 'bg-violet-500';
    const feedbackClass = flashResult === 'correct' ? 'battle-answer-correct' : flashResult === 'wrong' ? 'battle-answer-wrong' : '';

    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <span className={`text-2xl font-bold font-mono ${engine.timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-violet-300'}`}>⏱ {engine.timeLeft}s</span>
            <div className="w-32 bg-neutral-800 rounded-full h-2">
              <div className={`h-2 rounded-full transition-all ${timerColor}`} style={{ width: `${timerPct}%` }} />
            </div>
          </div>
          <span className="text-violet-400 font-mono">🔥 x{engine.currentMultiplier}</span>
          <span className="text-violet-300 font-bold font-mono">Score: {engine.score}</span>
        </div>

        <div className="w-28 h-28 mx-auto mb-2">
          <GuardianSprite guild="spellcaster" pose={flashResult === 'correct' ? 'hurt' : 'idle'} className="w-full h-full" />
        </div>

        {/* Static wrapper (not remounted per word) — SpellCaster is real-time
            typing with no submit step, so the input must never lose focus or
            unmount between words. Only the feedback pulse/shake class changes. */}
        <div className={`bg-[#13111c] border-2 border-violet-800 rounded-xl p-8 shadow-2xl transition-colors ${feedbackClass}`}>
          <p className="text-center text-xs text-gray-600 font-mono mb-4">{difficultyStars}</p>

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
            className="w-full bg-black/50 border-2 border-violet-700 rounded-lg p-4 text-center text-xl font-mono text-white focus:outline-none focus:border-violet-400 caret-violet-400"
            placeholder="Type the word..."
          />

          <div className="flex justify-between text-xs text-gray-600 font-mono mt-4">
            <span>✅ {engine.correctCount}</span>
            <span>❌ {engine.wrongCount}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto battle-panel-in">
      <div className="bg-[#13111c] border-2 border-violet-800 rounded-2xl p-10 text-center shadow-2xl font-mono">
        <div className="w-40 h-40 mx-auto mb-4">
          <GuardianSprite guild="spellcaster" pose="defeated" className="w-full h-full" />
        </div>
        <div className="text-5xl mb-2">{engine.correctCount >= 10 ? '🏆' : engine.correctCount >= 5 ? '⭐' : '🧙‍♂️'}</div>
        <h2 className="text-3xl font-bold text-violet-300 mb-4 font-display">Guardian Defeated!</h2>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-black/40 rounded-xl p-5">
            <p className="text-4xl font-bold font-mono text-green-400">{engine.correctCount}</p>
            <p className="text-sm text-gray-500 mt-1">Words Spelled</p>
          </div>
          <div className="bg-black/40 rounded-xl p-5">
            <p className="text-4xl font-bold font-mono text-red-400">{engine.wrongCount}</p>
            <p className="text-sm text-gray-500 mt-1">Missed</p>
          </div>
          <div className="bg-black/40 rounded-xl p-5">
            <p className="text-4xl font-bold font-mono text-violet-400">{engine.totalXpEarned}</p>
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
