'use client';
// app/dev/quest-quiz/page.tsx
// Dev-only route: sandbox for the main-quest quiz screen. Renders a FORK of QuestModule
// (components/dev/QuestModuleSandbox.tsx) with mock data and no Supabase calls, so the
// styling can be tweaked without touching the live component. Not linked from the app.
import { useState } from 'react';
import CurioTrainingPickerSandbox, { OwnedCurio } from '@/components/dev/CurioTrainingPickerSandbox';
import GameButton from '@/components/GameButton';
import QuestModuleSandbox from '@/components/dev/QuestModuleSandbox';

const MOCK_QUEST = {
  summary_markdown:
    '### Fractions Review\n\nA **fraction** names part of a whole.\n\n- Numerator: parts you have\n- Denominator: total equal parts\n\n| Fraction | Meaning |\n|---|---|\n| 1/2 | one of two equal parts |\n| 3/4 | three of four equal parts |',
  quiz: [
    { question: 'Which fraction is equal to 1/2?', options: ['2/4', '1/3', '3/5', '2/3'] },
    { question: 'In 3/4, what is the denominator?', options: ['4', '3', '7', '1'] },
    { question: 'Which is the greatest?', options: ['3/4', '1/2', '1/4', '2/8'] },
  ],
};
// Mock grader: the FIRST option listed in each question above is the right one.
// Friday Review has 36 questions — the count switch below repeats the mock questions to test long quizzes.
const questFor = (n: number) => ({ ...MOCK_QUEST, quiz: Array.from({ length: n }, (_, i) => MOCK_QUEST.quiz[i % MOCK_QUEST.quiz.length]) });

export default function QuestQuizDevPage() {
  const [key, setKey] = useState(0);
  const [dailyUsed, setDailyUsed] = useState(0);
  const [mastered, setMastered] = useState(false);
  const [used, setUsed] = useState(0);
  const [count, setCount] = useState(3);
  const quest = questFor(count);
  const CORRECT = quest.quiz.map(q => q.options[0]);
  const [trainee, setTrainee] = useState<OwnedCurio | undefined>(undefined);
  const [phase, setPhase] = useState<'ready' | 'quiz'>('ready');

  return (
    <div className="min-h-screen bg-white text-[#2a1505] p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center gap-4 text-sm border border-[#c9a87a] rounded-lg p-3 bg-[#f5f0e8]">
          <strong>Quest quiz sandbox</strong>
          <label className="flex items-center gap-1">
            Daily attempts used
            <select value={dailyUsed} onChange={e => { setDailyUsed(+e.target.value); setKey(k => k + 1); }} className="border rounded px-1">
              <option value={0}>0</option><option value={1}>1</option>
            </select>
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={mastered} onChange={e => { setMastered(e.target.checked); setKey(k => k + 1); }} /> Mastered
          </label>
          <label className="flex items-center gap-1">
            Questions
            <select value={count} onChange={e => { setCount(+e.target.value); setKey(k => k + 1); }} className="border rounded px-1">
              <option value={3}>3</option><option value={12}>12</option><option value={36}>36</option>
            </select>
          </label>
          <button onClick={() => { setKey(k => k + 1); setPhase('ready'); setTrainee(undefined); }} className="border border-[#8b5e2a] rounded px-2 py-0.5 bg-white">Reset</button>
          <span className="text-[#6b4820]">Right answer = first option in the mock data.</span>
        </div>

        {phase === 'ready' ? (
          <div className="bg-[#f0ddb8] border border-[#8b5e2a] p-8 rounded-2xl text-center shadow-2xl">
            <p className="text-[#c9781a] font-bold uppercase tracking-wider text-sm mb-2 font-display">Math Encounter</p>
            <h2 className="text-4xl font-display font-bold text-[#2a1505] mb-4">Prepare for Battle</h2>
            <CurioTrainingPickerSandbox userId="dev" selectedId={trainee?.id} onSelect={setTrainee} />
            <GameButton variant="quest" color="#3b82f6" onClick={() => setPhase('quiz')} style={{ fontSize: 15 }}>Start Exam</GameButton>
          </div>
        ) : (
        <QuestModuleSandbox
          key={key}
          userId="dev"
          questName="Math_Fractions"
          questKey="dev-quest"
          questData={quest}
          currentStats={{ xp: 0, gold: 0, level: 1 } as any}
          attemptsSoFar={used}
          dailyAttemptsUsed={dailyUsed}
          isMastered={mastered}
          trainingCurio={trainee ?? null}
          gradeQuiz={async (answers) => {
            const correct = CORRECT.filter((c, i) => answers[i] === c).length;
            return {
              correct_count: correct,
              total: CORRECT.length,
              is_perfect: correct === CORRECT.length,
              correct_answers: CORRECT,
              attempts_used_today: dailyUsed + 1,
            };
          }}
          onQuizSubmit={() => setUsed(u => u + 1)}
          onExit={() => { setKey(k => k + 1); setPhase('ready'); setTrainee(undefined); }}
        />
        )}
      </div>
    </div>
  );
}
