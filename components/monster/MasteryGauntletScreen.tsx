'use client';
// components/monster/MasteryGauntletScreen.tsx
// Topic Mastery Gauntlet — one weekday's slice of the term-break review
// quest. Substitutes that day's normal quest cards on the board (see
// components/Dashboard.tsx, which builds the full-week pool, splits it into
// 5 daily chunks via splitPoolIntoDays, and passes this screen just its own
// day's chunk). Deliberately calmer than BossFightScreen: no hearts, no
// lose state, no battle art. A wrong answer just requeues the question to
// the end of the session so the student sees it again before finishing.
//
// Styled per docs/STYLE_GUIDE.md — ordinary review content, not an
// atmospheric set-piece like the Term Boss Fight, so it gets the parchment
// treatment (like QuestModule/BattleQuestionModal) rather than BossFightScreen's
// dark horror styling.
//
// See lib/masteryGauntletEngine.ts and
// supabase/migrations/20260828140000_topic_mastery_gauntlet.sql +
// 20260828150000_gauntlet_daily_split.sql.
import { useState, useEffect, useMemo } from 'react';
import { ActionTile } from '@/components/battle/BattleStage';
import { shuffle, BossQuestion } from '@/lib/bossFightEngine';
import { useGauntletQueue } from '@/lib/masteryGauntletEngine';
import { gradeMonsterQuestion } from '@/lib/guildEngine';
import GameButton from '@/components/GameButton';
import VictoryScreen from '@/components/VictoryScreen';

interface MasteryGauntletScreenProps {
  userId: string;
  grade: number;
  term: number;
  day: string; // "Monday" .. "Friday" — this screen's own chunk
  pool: BossQuestion[];
  eventTitle: string;
  onExit: (completedThisDay: boolean) => void;
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-[10px] text-[#6b4820] mb-1 uppercase tracking-wide font-bold">
        <span>Mastery</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 bg-[#e8d0a0] rounded-full overflow-hidden border border-[#c9a87a]">
        <div
          className="h-full bg-gradient-to-r from-green-700 to-green-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// Extracted (rather than left inline) so components/dev/UiGallery.tsx can
// preview the real empty/finished screens instead of a static JSX copy that
// could drift out of sync.
export function GauntletEmptyScreen({ day, onExit }: { day: string; onExit: () => void }) {
  return (
    <div className="bg-[#f0ddb8] border border-[#8b5e2a] rounded-2xl p-6 text-center">
      <p className="text-[#6b4820] text-sm mb-4">No review questions landed on {day} — try another day's card.</p>
      <GameButton variant="quest" color="#8b5e2a" onClick={onExit} style={{ fontSize: 15 }}>
        Back
      </GameButton>
    </div>
  );
}

// Same reasoning as GauntletEmptyScreen above. No reward tiles: a day's
// gauntlet pays nothing by itself, the event reward comes once every weekday
// is done. There is no lose state, so completing always earns all 3 stars.
export function GauntletFinishedScreen({ day, mastered, onExit }: { day: string; mastered?: number; onExit: () => void }) {
  return (
    <VictoryScreen
      title="Gauntlet Complete!"
      subtitle={mastered ? `${day}: ${mastered} question${mastered === 1 ? '' : 's'} mastered` : `${day} cleared`}
      actions={
        <GameButton variant="quest" color="#15803d" onClick={onExit} style={{ fontSize: 20 }}>
          Done
        </GameButton>
      }
    >
      <p className="vs-rise text-sm font-semibold text-[#6b4820] max-w-sm mx-auto" style={{ animationDelay: '800ms' }}>
        Finish every weekday&apos;s gauntlet to claim this event&apos;s reward.
      </p>
    </VictoryScreen>
  );
}

export default function MasteryGauntletScreen({
  userId, grade, term, day, pool, eventTitle, onExit,
}: MasteryGauntletScreenProps) {
  const [finished, setFinished] = useState(false);
  const [masteredCount, setMasteredCount] = useState(0);

  if (pool.length === 0) {
    return <GauntletEmptyScreen day={day} onExit={() => onExit(false)} />;
  }

  if (finished) {
    return <GauntletFinishedScreen day={day} mastered={masteredCount} onExit={() => onExit(true)} />;
  }

  return (
    <GauntletBattle
      pool={pool}
      eventTitle={eventTitle}
      userId={userId}
      grade={grade}
      term={term}
      onFinished={n => { setMasteredCount(n); setFinished(true); }}
    />
  );
}

// Exported (alongside the Empty/Finished screens above) so
// components/dev/UiGallery.tsx can preview the real battle UI with a mock
// pool instead of a static JSX copy.
export function GauntletBattle({
  pool, eventTitle, userId, grade, term, onFinished,
}: {
  pool: BossQuestion[];
  eventTitle: string;
  userId: string;
  grade: number;
  term: number;
  onFinished: (mastered: number) => void;
}) {
  const { status, current, correctCount, originalPoolSize, progressPct, submitAnswer } = useGauntletQueue(pool);
  const shuffledOptions = useMemo(() => (current ? shuffle(current.options) : []), [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [grading, setGrading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  useEffect(() => {
    if (status === 'won') onFinished(originalPoolSize);
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnswer = async (opt: string) => {
    if (grading || selected || !current) return;
    setSelected(opt);
    setGrading(true);
    const { correct: isCorrect } = await gradeMonsterQuestion(userId, current.id, opt);
    setGrading(false);
    setFeedback(isCorrect ? 'correct' : 'wrong');
    setTimeout(() => {
      setFeedback(null);
      setSelected(null);
      submitAnswer(isCorrect);
    }, 700);
  };

  if (!current) return null;

  return (
    <div className="relative rounded-2xl border border-[#8b5e2a] bg-[#f0ddb8] overflow-hidden p-5">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <p className="text-[#2a1505] font-bold text-lg font-display">{eventTitle}</p>
          <div className="w-48 mt-1"><ProgressBar pct={progressPct} /></div>
        </div>
        <p className="text-[11px] text-[#6b4820] font-mono">{correctCount}/{originalPoolSize} mastered</p>
      </div>

      <div className="bg-white border border-[#c9a87a] rounded-xl p-4">
        {feedback && (
          <p className={`text-sm font-bold mb-2 ${feedback === 'correct' ? 'text-green-700' : 'text-[#7a4a0f]'}`}>
            {feedback === 'correct' ? '✅ Correct!' : '↺ Not quite — you\'ll see this one again.'}
          </p>
        )}
        <p className="text-[11px] text-[#6b4820] mb-1 uppercase tracking-wide font-bold">{current.subject}</p>
        <p className="text-[#2a1505] font-bold mb-3 leading-snug">{current.question}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {shuffledOptions.map(opt => (
            <ActionTile
              key={opt}
              icon={<span className="text-lg">▸</span>}
              title={opt}
              onClick={() => handleAnswer(opt)}
              disabled={grading || !!selected}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
