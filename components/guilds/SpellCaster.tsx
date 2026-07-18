'use client';
import { useState, useEffect, useRef } from 'react';
import { useTimeAttack } from '@/hooks/useTimeAttack';
import { fetchQuestionPool, markQuestionsCompleted, fetchSubclassProfile, updateSubclassProfile, SubclassProfile } from '@/lib/guildEngine';
import { applyLevelUp } from '@/lib/guildConfig';
import { logAction } from '@/lib/playerlog';
import { playChime, playClash } from '@/lib/sounds';
import { CharacterStats } from '@/hooks/useWeeklyData';
import { USERS } from '@/lib/userSession';

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
  const [flashWrong, setFlashWrong] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isTala = userId === 'tala';
  const gradeLevel = (USERS[userId]?.grade === 'Grade 2') ? 2 : 5;
  const engine = useTimeAttack<SpellCasterQuestion>(questions, isTala ? 120 : 60)

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

  // Auto-focus input when playing starts
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
      engine.submitResult(true, engine.currentQuestion.id);
      setTypedValue('');
    } else if (val.length >= target.length && !target.toLowerCase().startsWith(val.toLowerCase())) {
      // Wrong — typed as many chars as the word but it doesn't match
      playClash();
      setFlashWrong(true);
      engine.submitResult(false, engine.currentQuestion.id);
      setTypedValue('');
      setTimeout(() => setFlashWrong(false), 300);
    }
  };

  const handleSessionEnd = async () => {
    setScreen('results');
    await markQuestionsCompleted(userId, 'spellcaster', engine.completedQuestionIds);
    if (profile) {
      const { level, xp } = applyLevelUp(profile.spellcaster_lvl, profile.spellcaster_xp, engine.totalXpEarned);
      await updateSubclassProfile(userId, { spellcaster_lvl: level, spellcaster_xp: xp });
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
      <div className="bg-[#13111c] border-2 border-violet-800 rounded-xl p-12 text-center shadow-2xl">
        <h2 className="text-4xl font-display font-bold text-violet-300 mb-2">🧙‍♂️ SpellCaster Guild</h2>
        <p className="text-violet-500 font-mono mb-1">Lvl {profile?.spellcaster_lvl || 1} · {profile?.spellcaster_xp || 0}/500 XP</p>
        <p className="text-gray-400 mb-8 font-mono text-sm">Type each word exactly as shown. The moment you spell it correctly, it vanishes and the next appears. No Enter key — pure speed.</p>
        {questions.length === 0 ? (
          <p className="text-red-400">No active words found for this term. Ask Tatay to add some in Supabase.</p>
        ) : (
          <button
            onClick={() => { engine.start(); setScreen('playing'); }}
            className="bg-violet-700 hover:bg-violet-600 text-white font-bold py-3 px-10 rounded transition-colors font-mono text-lg"
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
    const difficultyStars = '★'.repeat(engine.currentQuestion.difficulty_tier) + '☆'.repeat(Math.max(0, 3 - engine.currentQuestion.difficulty_tier));
    return (
      <div className={`bg-[#13111c] border-2 rounded-xl p-8 shadow-2xl transition-colors ${flashWrong ? 'border-red-600' : 'border-violet-800'}`}>
        <div className="flex justify-between items-center mb-8">
          <span className="text-2xl font-bold text-violet-300 font-mono">⏱ {engine.timeLeft}s</span>
          <span className="text-violet-400 font-mono">🔥 x{engine.currentMultiplier}</span>
          <span className="text-violet-300 font-bold font-mono">Score: {engine.score}</span>
        </div>

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
    );
  }

  return (
    <div className="bg-[#13111c] border-2 border-violet-800 rounded-xl p-12 text-center shadow-2xl font-mono">
      <h2 className="text-3xl font-bold text-violet-300 mb-4 font-display">⏳ Time's Up!</h2>
      <p className="text-gray-300 mb-1">{engine.correctCount} words spelled · {engine.wrongCount} missed</p>
      <p className="text-xl mb-2">Subclass XP: <span className="text-violet-400 font-bold">{engine.totalXpEarned}</span></p>
      <p className="text-xl mb-8">Gold earned: <span className="text-yellow-400 font-bold">{engine.totalGoldEarned}</span></p>
      <button onClick={onExit} className="bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-3 px-6 rounded transition-colors">
        Return to Campaign Map
      </button>
    </div>
  );
}