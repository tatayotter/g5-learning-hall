// components/dashboard/board/ActiveQuestView.tsx
// Extracted from Dashboard.tsx's board-tab "active main quest" view (study
// notes -> ready-confirm -> quiz). Part of splitting Dashboard.tsx apart,
// same approach as the other components/dashboard pieces. No behavior
// change.
'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { UserId } from '@/lib/userSession';
import { useWeeklyData, WeeklyData } from '@/hooks/useWeeklyData';
import { supabase } from '@/lib/supabase';
import { logAction } from '@/lib/playerlog';
import { trackEvent } from '@/lib/analytics';
import GameButton from '@/components/GameButton';
import QuestModule, { markdownComponents } from '@/components/QuestModule';

type UseWeeklyDataReturn = ReturnType<typeof useWeeklyData>;

interface ActiveQuestViewProps {
  activeUserId: UserId;
  activeQuest: string; // `${day}_${subject}`
  mainQuestPackageData: any;
  quizPhase: 'study' | 'ready' | 'quiz';
  setQuizPhase: (phase: 'study' | 'ready' | 'quiz') => void;
  setActiveQuest: (quest: string | null) => void;
  studyReadRemaining: number;
  data: WeeklyData;
  updateStatsAndJournal: UseWeeklyDataReturn['updateStatsAndJournal'];
}

export default function ActiveQuestView({
  activeUserId,
  activeQuest,
  mainQuestPackageData,
  quizPhase,
  setQuizPhase,
  setActiveQuest,
  studyReadRemaining,
  data,
  updateStatsAndJournal,
}: ActiveQuestViewProps) {
  const [day, subject] = activeQuest.split('_');
  const questData = mainQuestPackageData[day]?.[subject];

  return (
    <div className="w-full max-w-4xl mx-auto animate-in fade-in duration-500">
      {quizPhase === 'study' && (
        <div className="space-y-6">
          <GameButton variant="quest" color="#d4d4d4" onClick={() => { setActiveQuest(null); setQuizPhase('study'); }} style={{ fontSize: 13 }}>
            ← Retreat to Map
          </GameButton>

          <div className="bg-[#f0ddb8] border border-[#8b5e2a] p-8 rounded-xl shadow-lg">
            <h2 className="text-3xl font-bold mb-6 text-[#7a4a0f] font-display">Study Session: {subject}</h2>
            <div className="border-t border-[#c9a87a] pt-6">
              {questData?.summary_markdown
                ? <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{questData.summary_markdown}</ReactMarkdown>
                : <p className="text-[#3a2610] leading-relaxed">No notes available for this module.</p>}
            </div>
          </div>

          <GameButton
            variant="quest"
            color="#eab308"
            onClick={() => { if (studyReadRemaining <= 0) setQuizPhase('ready'); }}
            disabled={studyReadRemaining > 0}
            className="w-full"
            style={{ fontSize: 18 }}
          >
            {studyReadRemaining > 0 ? `🔒 Keep Reading... ${studyReadRemaining}s` : 'I Am Ready To Fight'}
          </GameButton>
        </div>
      )}

      {quizPhase === 'ready' && (
        <div className="bg-[#f0ddb8] border border-[#8b5e2a] p-12 rounded-2xl text-center shadow-2xl">
          <p className="text-[#c9781a] font-bold uppercase tracking-wider text-sm mb-2 font-display">{subject} Encounter</p>
          <h2 className="text-4xl font-display font-bold text-[#2a1505] mb-4">Prepare for Battle</h2>
          <p className="text-[#6b4820] mb-8 max-w-sm mx-auto">
            You are about to start the assessment. Once you enter the exam, there is no turning back.
          </p>
          <div className="flex gap-4 justify-center">
            <GameButton variant="quest" color="#d4d4d4" onClick={() => setQuizPhase('study')} style={{ fontSize: 15 }}>
              Go Back to Notes
            </GameButton>
            <GameButton variant="quest" color="#3b82f6" onClick={() => setQuizPhase('quiz')} style={{ fontSize: 15 }}>
              Start Exam
            </GameButton>
          </div>
        </div>
      )}

      {quizPhase === 'quiz' && (
        <QuestModule
          userId={activeUserId}
          questName={subject}
          questKey={activeQuest}
          questData={questData}
          currentStats={data.character_stats}
          attemptsSoFar={(data.quiz_attempts || {})[activeQuest] || 0}
          isMastered={(data.mastered_quizzes || []).includes(activeQuest)}
          gradeQuiz={async (selectedAnswers) => {
            // Every question now carries a stable content_questions.id (Phase 4 Wave 3,
            // see docs/weekly-progress-redesign-plan.md) — Weekly Review (built
            // client-side by lib/weeklyReview.ts from real questions pulled out of the
            // rest of the week) grades through the exact same id-keyed path as a normal
            // day/subject quiz now, no more bespoke text-matching RPC needed.
            const quizQuestions: { id: string }[] = questData?.quiz || [];
            const answers = quizQuestions.map((q, i) => ({
              question_id: q.id,
              selected: selectedAnswers[i],
            }));
            const { data: graded, error } = await supabase.rpc('grade_content_quiz', {
              p_user_id: activeUserId,
              p_answers: answers,
            });
            if (error || !graded) throw error || new Error('grade_content_quiz returned no data');
            return {
              correct_count: graded.correct_count,
              total: graded.total,
              is_perfect: graded.is_perfect,
              correct_answers: (graded.results || []).map((r: any) => r.correct_answer),
            };
          }}
          onQuizSubmit={(isPerfect, newAttempts, newStats, xpEarned, goldEarned) => {
            const newQuizAttempts = { ...(data.quiz_attempts || {}), [activeQuest]: newAttempts };
            if (isPerfect) {
              const newMasteredQuizzes = [...(data.mastered_quizzes || []), activeQuest];
              const newMasteryCount = (data.mastery_count || 0) + 1;
              updateStatsAndJournal(
                newStats, data.journal_logs,
                data.purchased_items, newMasteryCount, data.honor_grants,
                newQuizAttempts, newMasteredQuizzes,
                data.honor_grants,
                data.guild_sessions_count || 0,
                data.monster_battles_won || 0,
                data.sibling_battles_won || 0,
                (data.perfect_quizzes || 0) + 1
              );
              logAction(activeUserId, data.week_starting_date, 'quiz', `Completed ${subject} in ${newAttempts} attempt(s)`, xpEarned, goldEarned);
              trackEvent('main_quest_completed', { subject, attempts: newAttempts, xp_earned: xpEarned, gold_earned: goldEarned });
              if (newStats.level > data.character_stats.level) {
                logAction(activeUserId, data.week_starting_date, 'achievement', `🎉 Leveled up to Level ${newStats.level}!`, 0, 0);
                trackEvent('guild_level_up', { new_level: newStats.level });
              }
            } else {
              updateStatsAndJournal(
                data.character_stats, data.journal_logs,
                data.purchased_items, data.mastery_count, data.honor_grants,
                newQuizAttempts, data.mastered_quizzes,
                data.honor_grants,
                data.guild_sessions_count || 0,
                data.monster_battles_won || 0,
                data.sibling_battles_won || 0,
                data.perfect_quizzes || 0
              );
            }
          }}
          onExit={() => {
            setActiveQuest(null);
            setQuizPhase('study');
          }}
        />
      )}
    </div>
  );
}
