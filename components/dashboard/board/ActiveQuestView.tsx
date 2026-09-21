// components/dashboard/board/ActiveQuestView.tsx
// Extracted from Dashboard.tsx's board-tab "active main quest" view (study
// notes -> ready-confirm -> quiz). Part of splitting Dashboard.tsx apart,
// same approach as the other components/dashboard pieces. No behavior
// change.
'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { UserId } from '@/lib/userSession';
import { useWeeklyData, WeeklyData } from '@/hooks/useWeeklyData';
import { supabase } from '@/lib/supabase';
import { logAction } from '@/lib/playerlog';
import { trackEvent } from '@/lib/analytics';
import GameButton from '@/components/GameButton';
import QuestModule, { markdownComponents } from '@/components/QuestModule';
import VisualAid from '@/components/quest/VisualAid';
import CurioTrainingPicker, { TRAINING_EXP_SHARE, OwnedCurio } from '@/components/dashboard/board/CurioTrainingPicker';
import { ALL_MONSTERS, getMonsterLevel } from '@/lib/monsterConfig';

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
  todayStr: string;
  updateStatsAndJournal: UseWeeklyDataReturn['updateStatsAndJournal'];
  bumpDailyQuestAttempt: UseWeeklyDataReturn['bumpDailyQuestAttempt'];
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
  todayStr,
  updateStatsAndJournal,
  bumpDailyQuestAttempt,
}: ActiveQuestViewProps) {
  const [day, subject] = activeQuest.split('_');
  const questData = mainQuestPackageData[day]?.[subject];
  const dailyAttemptsUsed = (data.daily_quest_attempts || {})[activeQuest] || 0;
  const [trainingCurio, setTrainingCurio] = useState<OwnedCurio | undefined>(undefined);
  const trainingCurioId = trainingCurio?.id;
  const [trainingNote, setTrainingNote] = useState<string | null>(null);

  // Awards the training curio its share of the quest XP. Runs once, on the
  // perfect (quest-completed) submission only. Best-effort: a failure here must
  // never block the quest reward itself.
  const awardTrainingExp = async (xpEarned: number) => {
    if (!trainingCurioId) return;
    const exp = Math.floor(xpEarned * TRAINING_EXP_SHARE);
    if (exp <= 0) return;
    try {
      const { data: row, error } = await supabase
        .from('user_monsters')
        .select('monster_id, monster_exp, monster_level')
        .eq('id', trainingCurioId)
        .eq('user_id', activeUserId)
        .maybeSingle();
      if (error || !row) return;
      const newExp = row.monster_exp + exp;
      const newLevel = getMonsterLevel(newExp);
      const { error: updErr } = await supabase
        .from('user_monsters')
        .update({ monster_exp: newExp, monster_level: newLevel })
        .eq('id', trainingCurioId)
        .eq('user_id', activeUserId);
      if (updErr) return;
      const name = ALL_MONSTERS[row.monster_id]?.name ?? 'Your curio';
      const leveled = newLevel > row.monster_level;
      setTrainingNote(`${name} trained: +${exp} Curio EXP${leveled ? ` · Level up! Lv.${newLevel}` : ''}`);
      logAction(activeUserId, data.week_starting_date, 'quiz', `🐾 ${name} trained +${exp} Curio EXP`, exp, 0);
    } catch (e) {
      console.error('Curio training exp failed:', e);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto animate-in fade-in duration-500">
      {quizPhase === 'study' && (
        <div className="space-y-6">
          <GameButton variant="quest" color="#d4d4d4" onClick={() => { setActiveQuest(null); setQuizPhase('study'); }} style={{ fontSize: 13 }}>
            ← Retreat to Map
          </GameButton>

          <div className="bg-white p-8 rounded-xl shadow-lg">
            <h2 className="text-3xl font-bold mb-6 text-[#7a4a0f] font-display">Study Session: {subject}</h2>
            <div className="border-t border-[#c9a87a] pt-6">
              {questData?.summary_markdown
                ? <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{questData.summary_markdown}</ReactMarkdown>
                : <p className="text-[#3a2610] leading-relaxed">No notes available for this module.</p>}
              <VisualAid spec={questData?.visual_aid} />
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
          <CurioTrainingPicker userId={activeUserId} selectedId={trainingCurioId} onSelect={setTrainingCurio} />
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
          dailyAttemptsUsed={dailyAttemptsUsed}
          isMastered={(data.mastered_quizzes || []).includes(activeQuest)}
          trainingNote={trainingNote}
          trainingCurio={trainingCurio ?? null}
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
              p_week_starting_date: data.week_starting_date,
              p_weekday: day,
              p_subject: subject,
              p_today: todayStr,
            });
            if (error || !graded) throw error || new Error('grade_content_quiz returned no data');
            // Mirror the server's authoritative daily-attempt count locally right
            // away — grading and the attempt-count bump happen atomically inside
            // the RPC, so this is never out of sync with what was just recorded.
            bumpDailyQuestAttempt(day, subject, graded.attempts_used_today ?? dailyAttemptsUsed);
            return {
              locked: graded.locked ?? false,
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
              awardTrainingExp(xpEarned);
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
            setTrainingCurio(undefined);
            setTrainingNote(null);
          }}
        />
      )}
    </div>
  );
}
