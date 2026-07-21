'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { CharacterStats } from '@/hooks/useWeeklyData';
import { USERS } from '@/lib/userSession';
import { playChime, playClash, playLevelUp } from '@/lib/sounds';
import GameButton from '@/components/GameButton';
import { motion, AnimatePresence } from 'framer-motion';
import { logAction } from '@/lib/playerlog';
import GuardianSprite from '@/components/guilds/GuardianSprite';
import { fetchSubclassProfile, updateSubclassProfile, ensureGuildMonsterGranted, GUILD_MONSTER_GRANT_LEVEL, SubclassProfile } from '@/lib/guildEngine';
import { applyLevelUp } from '@/lib/guildConfig';
import CurioRevealModal from '@/components/CurioRevealModal';
import { ALL_MONSTERS } from '@/lib/monsterConfig';

interface LexiconWord {
  id: string;
  language: string;
  definition: string;
  correct_spelling: string;
  wrong_a: string;
  wrong_b: string;
  wrong_c: string;
}

interface LexiconArenaProps {
  userId: string;
  weekStartingDate: string;
  currentStats: CharacterStats;
  onGoldEarned: (newStats: CharacterStats) => void;
  onExit: () => void;
}

const TIME_LIMIT_DEFAULT = 60;
const TIME_LIMIT_TALA = 120;
const GOLD_PER_CORRECT = 3;
const XP_PER_CORRECT = 5;

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

export default function LexiconArena({ userId, weekStartingDate, currentStats, onGoldEarned, onExit }: LexiconArenaProps) {
  const isTala = userId === 'tala';
  const userProfile = USERS[userId as keyof typeof USERS] ?? USERS['damien'];
  const gradeLevel = userProfile.grade === 'Grade 2' ? 2 : 5;

  const [phase, setPhase] = useState<'intro' | 'playing' | 'result'>('intro');
  const [words, setWords] = useState<LexiconWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [choices, setChoices] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [newCurioId, setNewCurioId] = useState<string | null>(null);
  const TIME_LIMIT = isTala ? TIME_LIMIT_TALA : TIME_LIMIT_DEFAULT;
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [score, setScore] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<SubclassProfile | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackRef = useRef<NodeJS.Timeout | null>(null);

  // Theme colors
  const accent = isTala ? 'text-pink-400' : 'text-amber-400';
  const accentBg = isTala ? 'bg-pink-600 hover:bg-pink-500' : 'bg-amber-600 hover:bg-amber-500';
  const correctBorder = isTala ? 'border-pink-400 bg-pink-900/20' : 'border-green-400 bg-green-900/20';
  const wrongBorder = 'border-red-500 bg-red-900/20';
  const langBadge = isTala
    ? 'bg-pink-900/30 text-pink-300 border border-pink-800'
    : 'bg-blue-900/30 text-blue-300 border border-blue-800';

  // Load words
  useEffect(() => {
    async function loadWords() {
      setLoading(true);
      const { data, error } = await supabase
        .from('sq_lexicon_arena')
        .select('*')
        .eq('term_id', 1)
        .eq('is_active', true)
        .eq('grade_level', gradeLevel);

      console.log('Lexicon fetch result:', data, error);
      console.log('Query params — gradeLevel:', gradeLevel, 'userId:', userId);
      if (data && data.length > 0) {
        setWords(shuffle(data));
      }
      setLoading(false);
    }
    loadWords();
    fetchSubclassProfile(userId).then(setProfile);
  }, [gradeLevel]);

  // Build choices for current word
  useEffect(() => {
    if (!words[currentIndex]) return;
    const w = words[currentIndex];
    setChoices(shuffle([w.correct_spelling, w.wrong_a, w.wrong_b, w.wrong_c]));
    setSelected(null);
    setFeedback(null);
  }, [currentIndex, words]);

  // Timer
  useEffect(() => {
    if (phase !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          endGame();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [phase]);

  const endGame = useCallback(() => {
    setPhase('result');
  }, []);

  const handleChoice = (choice: string) => {
    if (selected || !words[currentIndex]) return;
    const correct = words[currentIndex].correct_spelling;
    const isCorrect = choice === correct;

    setSelected(choice);
    setFeedback(isCorrect ? 'correct' : 'wrong');

    if (isCorrect) {
      playChime();
      setScore(s => s + 1);
    } else {
      playClash();
      setWrongCount(w => w + 1);
    }

    // Auto-advance after short delay
    feedbackRef.current = setTimeout(() => {
      if (currentIndex + 1 >= words.length) {
        // Ran out of words — reshuffle and continue until time runs out
        setWords(prev => shuffle([...prev]));
        setCurrentIndex(0);
      } else {
        setCurrentIndex(i => i + 1);
      }
    }, 800);
  };

  const handleFinish = async () => {
    const goldEarned = score * GOLD_PER_CORRECT;
    const xpEarned = score * XP_PER_CORRECT;
    const accuracy = score + wrongCount > 0 ? Math.round((score / (score + wrongCount)) * 100) : 0;

    let grantedId: string | null = null;
    if (profile) {
      const { level, xp } = applyLevelUp(profile.lexicon_arena_lvl, profile.lexicon_arena_xp, xpEarned);
      await updateSubclassProfile(userId, { lexicon_arena_lvl: level, lexicon_arena_xp: xp });
      if (profile.lexicon_arena_lvl < GUILD_MONSTER_GRANT_LEVEL && level >= GUILD_MONSTER_GRANT_LEVEL) {
        grantedId = await ensureGuildMonsterGranted(userId, 'lexicon_arena');
      }
    }

    let newXp = currentStats.xp + xpEarned;
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
      gold: currentStats.gold + goldEarned,
      xp: newXp,
      level: newLevel,
    };
    onGoldEarned(newStats);
    logAction(userId, weekStartingDate, 'side_quest', `Lexicon Arena session: ${score} correct, ${wrongCount} wrong, ${accuracy}% accuracy — +${xpEarned} XP +${goldEarned} Gold`, xpEarned, goldEarned);
    if (grantedId) {
      setNewCurioId(grantedId); // reveal modal's onClose triggers onExit instead
    } else {
      onExit();
    }
  };

  const current = words[currentIndex];
  const timerPct = (timeLeft / TIME_LIMIT) * 100;
  const timerColor = timeLeft <= 10 ? 'bg-red-500' : timeLeft <= 20 ? 'bg-yellow-500' : isTala ? 'bg-pink-500' : 'bg-amber-500';

  // ── INTRO ──
  if (phase === 'intro') {
    return (
      <div className="max-w-2xl mx-auto">
        <GameButton onClick={onExit} className="text-gray-400 hover:text-white text-sm font-bold mb-6 flex items-center gap-1">
          ← Back to Guilds
        </GameButton>
        <div className="bg-[#111] border border-[#333] rounded-2xl p-10 text-center">
          <div className="w-40 h-40 mx-auto mb-4">
            <GuardianSprite guild="lexiconarena" pose="idle" className="w-full h-full" />
          </div>
          <h2 className={`text-3xl font-display font-bold mb-2 ${accent}`}>Lexicon Arena</h2>
          <p className={`${accent} font-mono mb-1`}>Lvl {profile?.lexicon_arena_lvl || 1} · {profile?.lexicon_arena_xp || 0}/500 XP</p>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            Read the definition carefully, then pick the <span className="font-bold text-white">correctly spelled word</span> from the four choices. Watch out — the wrong ones look very close!
          </p>
          <div className="grid grid-cols-3 gap-4 mb-8 text-center">
            <div className="bg-black/40 rounded-xl p-4">
              <p className="text-2xl font-bold font-mono text-white">⏱ {isTala ? '120s' : '60s'}</p>
              <p className="text-xs text-gray-500 mt-1">Time Limit</p>
            </div>
            <div className="bg-black/40 rounded-xl p-4">
              <p className={`text-2xl font-bold font-mono ${accent}`}>+{XP_PER_CORRECT} XP</p>
              <p className="text-xs text-gray-500 mt-1">Per Correct</p>
            </div>
            <div className="bg-black/40 rounded-xl p-4">
              <p className="text-2xl font-bold font-mono text-yellow-400">+{GOLD_PER_CORRECT}<img src="/icons/rewards/gold_coin.svg" alt="Gold" className="inline w-4 h-4 align-[-2px]" /></p>
              <p className="text-xs text-gray-500 mt-1">Per Correct</p>
            </div>
          </div>
          {loading ? (
            <p className="text-gray-500 animate-pulse">Loading word pool...</p>
          ) : words.length === 0 ? (
            <p className="text-red-400">No words loaded for your grade yet.</p>
          ) : (
            <GameButton
              onClick={() => setPhase('playing')}
              className={`${accentBg} text-white font-bold py-4 px-12 rounded-xl text-lg transition-all`}
            >
              ⚔️ Enter the Arena
            </GameButton>
          )}
        </div>
      </div>
    );
  }

  // ── RESULT ──
  if (phase === 'result') {
    const goldEarned = score * GOLD_PER_CORRECT;
    const xpEarned = score * XP_PER_CORRECT;
    const accuracy = score + wrongCount > 0 ? Math.round((score / (score + wrongCount)) * 100) : 0;

    return (
      <div className="max-w-2xl mx-auto">
        {newCurioId && ALL_MONSTERS[newCurioId] && (
          <CurioRevealModal monster={ALL_MONSTERS[newCurioId]} userId={userId} onClose={() => { setNewCurioId(null); onExit(); }} />
        )}
        <div className="bg-[#111] border border-[#333] rounded-2xl p-10 text-center">
          <div className="w-40 h-40 mx-auto mb-4">
            <GuardianSprite guild="lexiconarena" pose="defeated" className="w-full h-full" />
          </div>
          <div className="text-5xl mb-4">{score >= 10 ? '🏆' : score >= 5 ? '⭐' : '📜'}</div>
          <h2 className="text-3xl font-display font-bold text-white mb-2">Time's Up!</h2>
          <p className="text-gray-400 mb-8">Here's how you did in the Lexicon Arena</p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-black/40 rounded-xl p-5">
              <p className="text-4xl font-bold font-mono text-green-400">{score}</p>
              <p className="text-sm text-gray-500 mt-1">Correct</p>
            </div>
            <div className="bg-black/40 rounded-xl p-5">
              <p className="text-4xl font-bold font-mono text-red-400">{wrongCount}</p>
              <p className="text-sm text-gray-500 mt-1">Wrong</p>
            </div>
            <div className="bg-black/40 rounded-xl p-5">
              <p className={`text-4xl font-bold font-mono ${accent}`}>{accuracy}%</p>
              <p className="text-sm text-gray-500 mt-1">Accuracy</p>
            </div>
            <div className="bg-black/40 rounded-xl p-5">
              <p className="text-4xl font-bold font-mono text-yellow-400"><img src="/icons/rewards/gold_coin.svg" alt="Gold" className="inline w-4 h-4 align-[-2px]" /> {goldEarned}</p>
              <p className="text-sm text-gray-500 mt-1">Gold Earned</p>
            </div>
          </div>

          <p className="text-gray-400 mb-6">
            You also earned <span className={`font-bold ${accent}`}>{xpEarned} XP</span>!
          </p>

          <div className="flex gap-4 justify-center">
            <GameButton
              onClick={() => {
                setPhase('intro');
                setScore(0);
                setWrongCount(0);
                setTimeLeft(isTala ? TIME_LIMIT_TALA : TIME_LIMIT_DEFAULT);
                setCurrentIndex(0);
                setWords(prev => shuffle([...prev]));
              }}
              className="bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              🔁 Play Again
            </GameButton>
            <GameButton
              onClick={handleFinish}
              className={`${accentBg} text-white font-bold py-3 px-6 rounded-xl transition-colors`}
            >
              ✅ Collect Rewards
            </GameButton>
          </div>
        </div>
      </div>
    );
  }

  // ── PLAYING ──
  return (
    <div className="max-w-2xl mx-auto">
      {/* Header: timer + score */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <span className={`text-2xl font-bold font-mono ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
            ⏱ {timeLeft}s
          </span>
          <div className="w-40 bg-neutral-800 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${timerColor}`}
              style={{ width: `${timerPct}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-4 font-mono text-sm">
          <span className="text-green-400">✓ {score}</span>
          <span className="text-red-400">✗ {wrongCount}</span>
          <span className="text-yellow-400"><img src="/icons/rewards/gold_coin.svg" alt="Gold" className="inline w-4 h-4 align-[-2px]" /> {score * GOLD_PER_CORRECT}</span>
        </div>
      </div>

      <div className="w-28 h-28 mx-auto mb-2">
        <GuardianSprite guild="lexiconarena" pose={feedback === 'correct' ? 'hurt' : 'idle'} className="w-full h-full" />
      </div>

      {/* Word card */}
      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key={current.id + currentIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.15 }}
            className="bg-[#111] border border-[#333] rounded-2xl p-8"
          >
            {/* Language badge */}
            <div className="flex justify-between items-center mb-5">
              <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full ${langBadge}`}>
                {current.language}
              </span>
              <span className="text-xs text-gray-600 font-mono">
                Word {currentIndex + 1} of {words.length}
              </span>
            </div>

            {/* Definition */}
            <p className="text-lg text-gray-200 leading-relaxed mb-8 text-center font-medium">
              "{current.definition}"
            </p>

            {/* Choices */}
            <div className="grid grid-cols-2 gap-3">
              {choices.map((choice, idx) => {
                const isSelected = selected === choice;
                const isCorrect = choice === current.correct_spelling;
                let borderClass = 'border-neutral-700 hover:border-neutral-500';

                if (feedback && isSelected) {
                  borderClass = feedback === 'correct' ? correctBorder : wrongBorder;
                } else if (feedback && isCorrect) {
                  borderClass = correctBorder;
                }

                return (
                  <GameButton
                    key={`${choice}-${idx}`}
                    onClick={() => handleChoice(choice)}
                    disabled={!!selected}
                    className={`w-full p-4 rounded-xl border-2 text-center font-bold text-base transition-all ${borderClass} disabled:cursor-default`}
                  >
                    {choice}
                  </GameButton>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
