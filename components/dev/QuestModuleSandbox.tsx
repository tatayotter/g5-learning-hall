// components/dev/QuestModuleSandbox.tsx
// DEV-ONLY FORK of components/QuestModule.tsx — edit freely here; the live quest screen is untouched.
// Rendered by /dev/quest-quiz with mock data. When happy, port the changes back to QuestModule.tsx.
import { useState, useEffect } from 'react';
import { MonsterImage } from '@/components/battle/shared';
import { ALL_MONSTERS } from '@/lib/monsterConfig';
import { CharacterStats } from '@/hooks/useWeeklyData';
import { playChime, playClash, playLevelUp } from '@/lib/sounds';
import VictoryScreen, { CurioTrainingCard, TrainingResult, XpIcon, GoldIcon, XP_REWARD, GOLD_REWARD } from '@/components/VictoryScreen';
import GameButton, { questButtonFontFamily, questButtonLetterSpacing, questButtonBoxShadow, questTextShadowStyle, questTextStyle } from '@/components/GameButton';
import CelebrationOverlay from '@/components/CelebrationOverlay';
import { calculateReward } from '@/lib/quizReward';
import { MAIN_QUEST_DAILY_ATTEMPT_CAP } from '@/lib/mainQuestAttempts';

// Proper Fisher-Yates — sort(() => Math.random() - 0.5) looks equivalent but
// is heavily biased (see components/battle/shared.tsx's shuffleArray).
function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Exported so other screens that render the same summary_markdown (e.g. the
// pre-quest "Study Session" screens in app/page.tsx) can match this styling
// instead of falling back to plain/unstyled markdown.
export const markdownComponents = {
  h1: (props: any) => <h1 className="text-2xl font-bold font-display text-[#2a1505] mt-6 mb-3 first:mt-0" {...props} />,
  h2: (props: any) => <h2 className="text-xl font-bold font-display text-[#2a1505] mt-6 mb-3 first:mt-0" {...props} />,
  h3: (props: any) => <h3 className="text-lg font-bold font-display text-[#7a4a0f] mt-6 mb-2 first:mt-0" {...props} />,
  p: (props: any) => <p className="text-[#3a2610] leading-relaxed mb-4" {...props} />,
  strong: (props: any) => <strong className="text-[#1a0d05] font-bold" {...props} />,
  ul: (props: any) => <ul className="list-disc list-outside pl-5 mb-4 space-y-1 text-[#3a2610]" {...props} />,
  ol: (props: any) => <ol className="list-decimal list-outside pl-5 mb-4 space-y-1 text-[#3a2610]" {...props} />,
  li: (props: any) => <li className="pl-1" {...props} />,
  hr: () => <hr className="border-[#c9a87a] my-6" />,
  blockquote: (props: any) => <blockquote className="border-l-4 border-[#c9781a] pl-4 italic text-[#6b4820] my-4" {...props} />,
  // GFM tables (needs remarkPlugins={[remarkGfm]} passed alongside this map —
  // plain react-markdown doesn't parse table syntax at all, it just falls
  // through as a literal pipe-delimited paragraph).
  table: (props: any) => <div className="overflow-x-auto mb-4"><table className="w-full text-sm border-collapse" {...props} /></div>,
  thead: (props: any) => <thead className="text-[#2a1505]" {...props} />,
  tr: (props: any) => <tr className="border-b border-[#c9a87a]" {...props} />,
  th: (props: any) => <th className="text-left font-bold py-2 px-3 border-b border-[#c9a87a]" {...props} />,
  td: (props: any) => <td className="py-2 px-3 text-[#3a2610]" {...props} />,
};

interface QuizQuestion {
  question: string;
  options: string[];
}

export interface QuizGradeResult {
  correct_count: number;
  total: number;
  is_perfect: boolean;
  correct_answers: string[];
  // Server-authoritative daily-attempt bookkeeping (see
  // MAIN_QUEST_DAILY_ATTEMPT_CAP in lib/mainQuestAttempts.ts).
  // `locked: true` means the cap was already reached BEFORE this call —
  // nothing was graded, no attempt was consumed.
  locked?: boolean;
  attempts_used_today?: number;
}

interface QuestModuleProps {
  userId: string;
  questName: string;
  questKey: string;
  questData: any;
  currentStats: CharacterStats;
  attemptsSoFar: number;
  // How many of today's MAIN_QUEST_DAILY_ATTEMPT_CAP attempts are already
  // used, as of when this module opened — server-authoritative (see
  // ActiveQuestView's dailyAttemptsUsed). Distinct from attemptsSoFar, which
  // is a lifetime counter used only for reward scaling.
  dailyAttemptsUsed: number;
  isMastered: boolean;
  // Curio EXP line shown on the completion screens (set once the award lands).
  trainingResult?: TrainingResult | null;
  // The curio picked to train for this quest — shown next to the progress dots.
  trainingCurio?: { monster_id: string; nickname: string | null; monster_level: number } | null;
  // Grading happens server-side (grade_content_quiz / grade_event_quiz RPCs) —
  // questData never carries correct_answer, so this module can't compare
  // locally even if it wanted to.
  gradeQuiz: (selectedAnswers: Record<number, string>) => Promise<QuizGradeResult>;
  onQuizSubmit: (isPerfect: boolean, newAttempts: number, newStats: CharacterStats, xpEarned: number, goldEarned: number) => void;
  onExit: () => void;
}

const COOLDOWN_SECONDS = 20;

export default function QuestModuleSandbox({ userId, questName, questKey, questData, currentStats, attemptsSoFar, dailyAttemptsUsed, isMastered, trainingCurio, trainingResult, gradeQuiz, onQuizSubmit, onExit }: QuestModuleProps) {
  const safeAttemptsSoFar = Number.isFinite(attemptsSoFar) ? attemptsSoFar : 0;

  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [grading, setGrading] = useState(false);
  const [shuffledOptions, setShuffledOptions] = useState<Record<number, string[]>>({});
  const [correctAnswers, setCorrectAnswers] = useState<string[]>([]);
  const [lastResult, setLastResult] = useState<{ isPerfect: boolean; score: number; total: number; xp: number; gold: number; attemptNumber: number } | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [celebration, setCelebration] = useState<{ active: boolean; type: 'levelup' | 'perfect' }>({ active: false, type: 'perfect' });
  // Server-authoritative count of today's attempts, refreshed from each
  // grading response so the retry button locks the instant the 2nd
  // non-perfect attempt lands, without waiting for a re-fetch/re-render
  // from further up the tree.
  const [dailyUsedToday, setDailyUsedToday] = useState(dailyAttemptsUsed);
  // Only set on the rare defense-in-depth path where the server reports the
  // cap was already hit before this submission (board-level gating should
  // normally prevent ever reaching this) — nothing was graded that time.
  const [alreadyLockedOnEntry, setAlreadyLockedOnEntry] = useState(false);

  // Countdown ticker
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = setTimeout(() => setCooldownRemaining(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldownRemaining]);

  useEffect(() => {
    const newShuffled: Record<number, string[]> = {};
    quiz.forEach((q, i) => {
      newShuffled[i] = shuffleArray(q.options);
    });
    setShuffledOptions(newShuffled);
  }, [submitted]);

  const quiz: QuizQuestion[] = questData?.quiz || [];

  const handleSelect = (qIndex: number, option: string) => {
    if (submitted) return;
    setSelectedAnswers({ ...selectedAnswers, [qIndex]: option });
  };

  const handleSubmitQuiz = async () => {
    if (grading) return;
    setGrading(true);
    let graded: QuizGradeResult;
    try {
      graded = await gradeQuiz(selectedAnswers);
    } catch (err) {
      console.error('Failed to grade quiz:', err);
      setGrading(false);
      alert('⚠️ Could not grade your quiz — please try again.');
      return;
    }
    setGrading(false);

    if (typeof graded.attempts_used_today === 'number') {
      setDailyUsedToday(graded.attempts_used_today);
    }

    // Defense-in-depth: the board normally never lets a locked quest be
    // entered, but this covers a module left open across a day boundary, or
    // opened from a second device that already used up today's attempts.
    // Nothing was graded server-side, so nothing to record here either.
    if (graded.locked) {
      setAlreadyLockedOnEntry(true);
      setSubmitted(true);
      return;
    }

    const { correct_count: correctCount, total, is_perfect: isPerfect, correct_answers: gradedAnswers } = graded;
    const newAttempts = safeAttemptsSoFar + 1;

    let newStats = { ...currentStats };
    let reward = { xp: 0, gold: 0 };

    if (isPerfect) {
      reward = calculateReward(newAttempts);
      newStats.xp += reward.xp;
      newStats.gold += reward.gold;

      let currentXp = newStats.xp;
      let currentLvl = newStats.level;
      while (currentXp >= (500 + currentLvl * 100)) {
        currentXp -= (500 + currentLvl * 100);
        currentLvl += 1;
      }
      newStats.xp = currentXp;
      newStats.level = currentLvl;

      if (currentLvl > currentStats.level) {
        playLevelUp();
        setCelebration({ active: true, type: 'levelup' });
      } else {
        playChime();
        setCelebration({ active: true, type: 'perfect' });
      }
    } else {
      // Wrong answer(s) — lock the retry button behind a short cooldown
      // to nudge re-reading the material instead of instant re-guessing.
      setCooldownRemaining(COOLDOWN_SECONDS);
      playClash();
    }

    setCorrectAnswers(gradedAnswers || []);
    setSubmitted(true);
    setLastResult({ isPerfect, score: correctCount, total, xp: reward.xp, gold: reward.gold, attemptNumber: newAttempts });
    onQuizSubmit(isPerfect, newAttempts, newStats, reward.xp, reward.gold);
  };

  const handleRetry = () => {
    if (cooldownRemaining > 0) return;
    setSelectedAnswers({});
    setSubmitted(false);
    setLastResult(null);
  };

  const allAnswered = quiz.length > 0 && quiz.every((_, i) => selectedAnswers[i] !== undefined);
  // Today's cap reached without a perfect score — the retry button is
  // replaced by a "come back tomorrow" message instead of the usual
  // cooldown-then-retry flow (see lib/mainQuestAttempts.ts).
  const dailyLockedForRestOfDay = alreadyLockedOnEntry || (submitted && !lastResult?.isPerfect && dailyUsedToday >= MAIN_QUEST_DAILY_ATTEMPT_CAP);

  // --- ALREADY MASTERED: locked recap view ---
  if (isMastered) {
    const recap = calculateReward(safeAttemptsSoFar);
    const tries = Math.max(safeAttemptsSoFar, 1);
    return (
      <VictoryScreen
        subtitle={`Mastered in ${tries} attempt${tries !== 1 ? 's' : ''}`}
        rewards={[
          { ...XP_REWARD, value: recap.xp, icon: <XpIcon /> },
          { ...GOLD_REWARD, value: recap.gold, icon: <GoldIcon /> },
        ]}
        actions={
          <GameButton variant="quest" color="#8b5e2a" onClick={onExit} style={{ fontSize: 20 }}>
            Return to Campaign Map
          </GameButton>
        }
      >
        {trainingResult && <CurioTrainingCard result={trainingResult} />}
      </VictoryScreen>
    );
  }

  // --- ALREADY OUT OF ATTEMPTS FOR TODAY (defense-in-depth; the board
  // shouldn't normally let this screen be reached in this state at all) ---
  if (alreadyLockedOnEntry) {
    return (
      <div className="bg-amber-50 border border-amber-600 p-8 rounded-xl text-center">
        <h2 className="text-3xl font-bold text-amber-700 mb-4 font-display">🔒 Quest Locked</h2>
        <p className="text-[#6b4820] mb-6">
          You've already used both attempts for {questName.replace('_', ' ')} today. Come back tomorrow for 2 fresh attempts!
        </p>
        <GameButton variant="quest" color="#8b5e2a" onClick={onExit} style={{ fontSize: 15 }}>
          Return to Campaign Map
        </GameButton>
      </div>
    );
  }

  // --- JUST HIT A PERFECT SCORE ---
  if (submitted && lastResult?.isPerfect) {
    return (
      <VictoryScreen
        subtitle={`Perfect score ${lastResult.score}/${lastResult.total} · ${lastResult.attemptNumber} attempt${lastResult.attemptNumber !== 1 ? 's' : ''}`}
        rewards={[
          { ...XP_REWARD, value: lastResult.xp, icon: <XpIcon /> },
          { ...GOLD_REWARD, value: lastResult.gold, icon: <GoldIcon /> },
        ]}
        actions={
          <GameButton variant="quest" color="#8b5e2a" onClick={onExit} style={{ fontSize: 20 }}>
            Return to Campaign Map
          </GameButton>
        }
      >
        {trainingResult && <CurioTrainingCard result={trainingResult} />}
      </VictoryScreen>
    );
  }

  return (
    <div>
      <style>{`
        .qcard { position:relative; background:linear-gradient(180deg,#fffdf7 0%,#fbf3df 100%); border:2px solid #8b5e2a; border-radius:18px;
          padding:16px 16px 18px; box-shadow:0 5px 0 #8b5e2a, 0 10px 18px rgba(42,21,5,.22); }
        .qcard::before { content:''; position:absolute; inset:5px; border:1px dashed #c9a87a; border-radius:13px; pointer-events:none; }
        .qcard-head { display:flex; align-items:flex-start; gap:12px; margin-bottom:14px; padding-bottom:12px; border-bottom:2px solid #e8d0a0; position:relative; }
        .qcard-num { flex:none; position:relative; overflow:hidden; min-width:2em; height:2em; padding:0 .4em; display:flex; align-items:center; justify-content:center; border:0.0476em solid #000; border-radius:0.508em; }
        .qcard-q { font-weight:800; font-size:17px; line-height:1.35; color:#2a1505; padding-top:6px; }
        .qcard-right { border-color:#15803d; box-shadow:0 5px 0 #15803d, 0 10px 18px rgba(21,128,61,.25); }
        .qcard-miss { border-color:#b91c1c; box-shadow:0 5px 0 #b91c1c, 0 10px 18px rgba(185,28,28,.25); }
        .qopt { display:flex; align-items:center; gap:12px; width:100%; text-align:left; padding:10px 14px;
          font-weight:700; font-size:15px; color:#2a1505; border-radius:14px; border:2px solid #8b5e2a;
          background:linear-gradient(180deg,#fff8e6 0%,#f0ddb8 100%); box-shadow:0 4px 0 #8b5e2a, 0 6px 8px rgba(42,21,5,.25);
          transition:transform .1s, box-shadow .1s, background .15s; cursor:pointer; position:relative; }
        .qopt:not(:disabled):hover { transform:translateY(-2px); box-shadow:0 6px 0 #8b5e2a, 0 9px 12px rgba(42,21,5,.3);
          background:linear-gradient(180deg,#fffdf2 0%,#f7e6c2 100%); }
        .qopt:not(:disabled):active { transform:translateY(3px); box-shadow:0 1px 0 #8b5e2a; }
        .qopt-badge { flex:none; width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center;
          font-weight:900; font-size:14px; color:#fff; background:radial-gradient(circle at 30% 25%,#e8a13a,#b5651a);
          border:2px solid #7a4a0f; box-shadow:inset 0 -2px 0 rgba(0,0,0,.25); text-shadow:0 1px 1px rgba(0,0,0,.4); }
        .qopt-text { flex:1; min-width:0; }
        .qopt-mark { flex:none; font-size:20px; font-weight:900; }
        .qopt-selected { border-color:#c9781a; background:linear-gradient(180deg,#ffe9a8 0%,#f5c95c 100%);
          box-shadow:0 4px 0 #c9781a, 0 0 0 3px rgba(245,201,92,.6), 0 6px 12px rgba(201,120,26,.4); transform:translateY(-1px); }
        .qopt-correct { border-color:#15803d; background:linear-gradient(180deg,#dcfce7 0%,#86efac 100%);
          box-shadow:0 4px 0 #15803d, 0 0 14px rgba(34,197,94,.6); animation:qopt-pop .35s ease-out; }
        .qopt-correct .qopt-badge { background:radial-gradient(circle at 30% 25%,#4ade80,#15803d); border-color:#14532d; }
        .qopt-correct .qopt-mark { color:#15803d; }
        .qopt-wrong { border-color:#b91c1c; background:linear-gradient(180deg,#fee2e2 0%,#fca5a5 100%);
          box-shadow:0 4px 0 #b91c1c; animation:qopt-shake .35s ease-in-out; }
        .qopt-wrong .qopt-badge { background:radial-gradient(circle at 30% 25%,#f87171,#b91c1c); border-color:#7f1d1d; }
        .qopt-wrong .qopt-mark { color:#b91c1c; }
        .qopt-dim { opacity:.55; box-shadow:0 2px 0 #8b5e2a; cursor:default; }
        @keyframes qopt-pop { 0%{transform:scale(1)} 50%{transform:scale(1.04)} 100%{transform:scale(1)} }
        @keyframes qopt-shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }
      `}</style>
      <div className="flex justify-between items-center border-b border-[#c9a87a] pb-4 mb-6">
        <h2 className="text-2xl font-bold text-[#7a4a0f] font-display">{questName.replace('_', ' ')}</h2>
        <span className="bg-[#c9781a]/20 text-[#7a4a0f] text-xs font-bold px-3 py-1 rounded-full border border-[#8b5e2a]">
          ATTEMPT {Math.min(submitted ? dailyUsedToday : dailyUsedToday + 1, MAIN_QUEST_DAILY_ATTEMPT_CAP)} OF {MAIN_QUEST_DAILY_ATTEMPT_CAP} TODAY
        </span>
      </div>

      {quiz.length > 0 ? (
        <div>
          <h3 className="text-xl font-bold mb-4 font-display text-[#2a1505]">Quiz: Score a perfect round to claim loot!</h3>

          {/* Pinned to the bottom of the screen so progress + the training curio stay visible while scrolling. */}
          <div className="fixed bottom-0 inset-x-0 z-30 bg-[#f0ddb8]/95 backdrop-blur border-t-2 border-[#8b5e2a]">
           <div className="max-w-4xl mx-auto px-3 sm:pl-24 sm:pr-4 lg:px-8">
          <div className="py-2 flex items-center justify-between gap-3" aria-label="Quiz progress">
            <div className="flex items-center gap-2">
              {/* Compact progress bar — works for any quiz length (Friday Review has 36 questions) */}
              <span className="w-20 sm:w-48 h-2.5 rounded-full bg-white border border-[#c9a87a] overflow-hidden">
                <span className="block h-full bg-[#c9781a] transition-all" style={{ width: `${quiz.length ? (Object.keys(selectedAnswers).length / quiz.length) * 100 : 0}%` }} />
              </span>
              <span className="sm:ml-2 text-xs font-mono text-[#6b4820]">
                {Object.keys(selectedAnswers).length}/{quiz.length}<span className="hidden sm:inline"> answered</span>
              </span>
            </div>
            {trainingCurio && (
              <div className="flex items-center gap-2 bg-white border-2 border-[#8b5e2a] rounded-full pl-1 pr-3 py-0.5 shadow-sm flex-shrink-0">
                <MonsterImage monster={ALL_MONSTERS[trainingCurio.monster_id]} className="w-8 h-8" emojiClassName="text-2xl" />
                <span className="leading-tight text-xs font-extrabold text-[#2a1505] min-w-0">
                  <span className="block text-[9px] uppercase tracking-wide text-[#c9781a]">Training</span>
                  <span className="block truncate max-w-[92px] sm:max-w-none">{trainingCurio.nickname || ALL_MONSTERS[trainingCurio.monster_id]?.name || 'Curio'} Lv.{trainingCurio.monster_level}</span>
                </span>
              </div>
            )}
          </div>
           </div>
          </div>

          {submitted && !lastResult?.isPerfect && (
            <div className="bg-red-100 border border-red-500 rounded-lg p-4 mb-6 text-red-700">
              <p className="font-bold mb-1">❌ Not quite — {lastResult?.score}/{lastResult?.total} correct.</p>
              <p className="text-sm text-red-600">
                {dailyLockedForRestOfDay
                  ? `No loot awarded this attempt. 🔒 That was your ${MAIN_QUEST_DAILY_ATTEMPT_CAP}${MAIN_QUEST_DAILY_ATTEMPT_CAP === 2 ? 'nd' : 'th'} attempt today — this quest is locked until tomorrow. Review the correct answers below before then.`
                  : "No loot awarded this attempt. 📖 Review your mistakes and remember the correct answers below before your next try — it'll help more than guessing."}
              </p>
            </div>
          )}

          <div className="space-y-6">
            {quiz.map((q, i) => (
              <div key={i} className={`qcard ${submitted ? (selectedAnswers[i] === correctAnswers[i] ? 'qcard-right' : 'qcard-miss') : selectedAnswers[i] !== undefined ? 'qcard-done' : ''}`}>
                <div className="qcard-head">
                  <span
                    className="qcard-num"
                    style={{
                      fontSize: 20,
                      fontFamily: questButtonFontFamily,
                      letterSpacing: questButtonLetterSpacing,
                      boxShadow: questButtonBoxShadow,
                      background: submitted
                        ? (selectedAnswers[i] === correctAnswers[i] ? '#22c55e' : '#ef4444')
                        : selectedAnswers[i] !== undefined ? '#3b82f6' : '#f5c542',
                    }}
                  >
                    <span aria-hidden style={{ position: 'absolute', top: '0.22em', right: '0.15em', width: '0.5em', height: '0.22em', background: 'rgba(255,255,255,0.75)', borderRadius: '50%', transform: 'rotate(10deg)' }} />
                    <span style={{ position: 'relative', display: 'inline-block' }}>
                      <span aria-hidden style={questTextShadowStyle}>{i + 1}</span>
                      <span style={questTextStyle}>{i + 1}</span>
                    </span>
                  </span>
                  <p className="qcard-q">{q.question}</p>
                </div>
                <div className="space-y-2">
                  {(shuffledOptions[i] || q.options).map((opt, optIdx) => {
                    const isSelected = selectedAnswers[i] === opt;
                    const showFeedback = submitted;
                    const isCorrectOption = opt === correctAnswers[i];
                    let state = 'idle';
                    if (showFeedback) {
                      if (isCorrectOption) state = 'correct';
                      else if (isSelected) state = 'wrong';
                      else state = 'dim';
                    } else if (isSelected) state = 'selected';
                    return (
                      <button
                        key={opt}
                        onClick={() => handleSelect(i, opt)}
                        disabled={submitted}
                        className={`qopt qopt-${state}`}
                      >
                        <span className="qopt-badge">{String.fromCharCode(65 + optIdx)}</span>
                        <span className="qopt-text">{opt}</span>
                        {state === 'correct' && <span className="qopt-mark">✔</span>}
                        {state === 'wrong' && <span className="qopt-mark">✖</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3 items-center">
            {submitted ? (
              dailyLockedForRestOfDay ? (
                <>
                  <span className="text-sm text-[#6b4820] font-bold">
                    🔒 Locked — back tomorrow for {MAIN_QUEST_DAILY_ATTEMPT_CAP} fresh attempts
                  </span>
                  <GameButton variant="quest" color="#8b5e2a" onClick={onExit} style={{ fontSize: 22 }}>
                    Return to Campaign Map
                  </GameButton>
                </>
              ) : (
                <>
                  {cooldownRemaining > 0 && (
                    <span className="text-sm text-[#6b4820] font-mono">
                      ⏳ Review time: {cooldownRemaining}s
                    </span>
                  )}
                  <GameButton
                    variant="quest"
                    color="#3b82f6"
                    onClick={handleRetry}
                    disabled={cooldownRemaining > 0}
                    style={{ fontSize: 22 }}
                  >
                    {cooldownRemaining > 0 ? `🔒 Wait ${cooldownRemaining}s` : '🔁 Try Again'}
                  </GameButton>
                </>
              )
            ) : (
              <>
                <GameButton
                  variant="quest"
                  color="#3b82f6"
                  onClick={handleSubmitQuiz}
                  disabled={!allAnswered || grading}
                  style={{ fontSize: 22 }}
                >
                  {grading ? '⏳ Grading...' : '✅ Submit Quiz'}
                </GameButton>
              </>
            )}
          </div>
          <div aria-hidden className="h-16" />
        </div>
      ) : (
        <div className="mt-8 pt-6 border-t border-[#c9a87a] flex justify-between items-center">
          <p className="text-sm text-[#6b4820]">No quiz for this module — read the material above.</p>
        </div>
      )}
    <CelebrationOverlay
        userId={userId}
        trigger={celebration.active}
        type={celebration.type}
        onComplete={() => setCelebration({ active: false, type: 'perfect' })}
      />
    </div>
  );
}