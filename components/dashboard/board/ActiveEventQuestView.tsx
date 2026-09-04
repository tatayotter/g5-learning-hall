// components/dashboard/board/ActiveEventQuestView.tsx
// Extracted from Dashboard.tsx's board-tab "active event quest" view (study
// notes -> ready-confirm -> quiz, event-quest counterpart of
// ActiveQuestView). Part of splitting Dashboard.tsx apart. No behavior
// change.
'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { UserId, USERS, gradeToNumber } from '@/lib/userSession';
import { useWeeklyData, WeeklyData, CharacterStats } from '@/hooks/useWeeklyData';
import { supabase } from '@/lib/supabase';
import { logAction } from '@/lib/playerlog';
import { trackEvent } from '@/lib/analytics';
import GameButton from '@/components/GameButton';
import QuestModule, { markdownComponents } from '@/components/QuestModule';
import {
  CustomEvent,
  EventQuest,
  UserEventProgressRow,
  fetchUserEventProgress,
  recordEventQuizMastery,
  claimEventReward,
} from '@/lib/customEvents';

type UseWeeklyDataReturn = ReturnType<typeof useWeeklyData>;

interface ActiveEventQuestViewProps {
  activeUserId: UserId;
  activeEvent: CustomEvent;
  eventQuests: EventQuest[];
  activeEventQuest: string;
  eventQuizPhase: 'study' | 'ready' | 'quiz';
  setEventQuizPhase: (phase: 'study' | 'ready' | 'quiz') => void;
  setActiveEventQuest: (questId: string | null) => void;
  eventStudyReadRemaining: number;
  data: WeeklyData;
  updateStatsAndJournal: UseWeeklyDataReturn['updateStatsAndJournal'];
  eventProgress: UserEventProgressRow[];
  setEventProgress: (progress: UserEventProgressRow[]) => void;
  setEventClaimed: (claimed: boolean) => void;
  setRevealEventMonster: (monsterId: string | null) => void;
}

export default function ActiveEventQuestView({
  activeUserId,
  activeEvent,
  eventQuests,
  activeEventQuest,
  eventQuizPhase,
  setEventQuizPhase,
  setActiveEventQuest,
  eventStudyReadRemaining,
  data,
  updateStatsAndJournal,
  eventProgress,
  setEventProgress,
  setEventClaimed,
  setRevealEventMonster,
}: ActiveEventQuestViewProps) {
  const eventQuest = eventQuests.find(q => q.id === activeEventQuest);
  const questRow = eventProgress.find(p => p.event_quest_id === activeEventQuest);

  const handleEventQuizSubmit = (isPerfect: boolean, newAttempts: number, newStats: CharacterStats, xpEarned: number, goldEarned: number) => {
    if (!activeUserId || !activeEvent || !eventQuest) return;
    if (isPerfect) {
      updateStatsAndJournal(newStats, data.journal_logs);
      logAction(activeUserId, data.week_starting_date, 'event_quiz', `Completed event quest ${eventQuest.subject_name} in ${newAttempts} attempt(s)`, xpEarned, goldEarned);
      trackEvent('event_quiz_completed', { event_id: activeEvent.id, subject: eventQuest.subject_name, attempts: newAttempts });
    }
    (async () => {
      await recordEventQuizMastery(activeUserId, activeEvent.id, eventQuest.id, isPerfect, newAttempts);
      const newProgress = await fetchUserEventProgress(activeUserId, activeEvent.id);
      setEventProgress(newProgress);

      if (isPerfect) {
        const allMastered = eventQuests.every(q =>
          q.id === eventQuest.id || newProgress.some(p => p.event_quest_id === q.id && p.is_mastered)
        );
        if (allMastered) {
          const gradeLevel = gradeToNumber(USERS[activeUserId]?.grade);
          const grantedMonsterId = await claimEventReward(activeUserId, activeEvent.id, gradeLevel);
          if (grantedMonsterId) {
            setEventClaimed(true);
            setRevealEventMonster(grantedMonsterId);
            logAction(activeUserId, data.week_starting_date, 'event_reward', `Completed event: ${activeEvent.title}`, 0, 0);
            trackEvent('event_reward_claimed', { event_id: activeEvent.id });
          }
        }
      }
    })();
  };

  return (
    <div className="w-full max-w-4xl mx-auto animate-in fade-in duration-500">
      {eventQuizPhase === 'study' && (
        <div className="space-y-6">
          <GameButton variant="quest" color="#d4d4d4" onClick={() => { setActiveEventQuest(null); setEventQuizPhase('study'); }} style={{ fontSize: 13 }}>
            ← Retreat to Map
          </GameButton>

          <div className="bg-[#f0ddb8] border border-[#8b5e2a] p-8 rounded-xl shadow-lg">
            <h2 className="text-3xl font-bold mb-6 text-[#7a4a0f] font-display">Study Session: {eventQuest?.subject_name}</h2>
            <div className="border-t border-[#c9a87a] pt-6">
              {eventQuest?.summary_markdown
                ? <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{eventQuest.summary_markdown}</ReactMarkdown>
                : <p className="text-[#3a2610] leading-relaxed">No notes available for this module.</p>}
            </div>
          </div>

          <GameButton
            variant="quest"
            color="#d97706"
            onClick={() => { if (eventStudyReadRemaining <= 0) setEventQuizPhase('ready'); }}
            disabled={eventStudyReadRemaining > 0}
            className="w-full"
            style={{ fontSize: 18 }}
          >
            {eventStudyReadRemaining > 0 ? `🔒 Keep Reading... ${eventStudyReadRemaining}s` : 'I Am Ready To Fight'}
          </GameButton>
        </div>
      )}

      {eventQuizPhase === 'ready' && (
        <div className="bg-[#f0ddb8] border border-[#8b5e2a] p-12 rounded-2xl text-center shadow-2xl">
          <p className="text-[#c9781a] font-bold uppercase tracking-wider text-sm mb-2 font-display">{eventQuest?.subject_name} Encounter</p>
          <h2 className="text-4xl font-display font-bold text-[#2a1505] mb-4">Prepare for Battle</h2>
          <p className="text-[#6b4820] mb-8 max-w-sm mx-auto">
            You are about to start the event assessment. Once you enter the exam, there is no turning back.
          </p>
          <div className="flex gap-4 justify-center">
            <GameButton variant="quest" color="#d4d4d4" onClick={() => setEventQuizPhase('study')} style={{ fontSize: 15 }}>
              Go Back to Notes
            </GameButton>
            <GameButton variant="quest" color="#d97706" onClick={() => setEventQuizPhase('quiz')} style={{ fontSize: 15 }}>
              Start Exam
            </GameButton>
          </div>
        </div>
      )}

      {eventQuizPhase === 'quiz' && eventQuest && (
        <QuestModule
          userId={activeUserId}
          questName={eventQuest.subject_name}
          questKey={`event_${eventQuest.id}`}
          questData={eventQuest}
          currentStats={data.character_stats}
          attemptsSoFar={questRow?.attempts || 0}
          isMastered={!!questRow?.is_mastered}
          gradeQuiz={async (selectedAnswers) => {
            const { data: graded, error } = await supabase.rpc('grade_event_quiz', {
              p_event_quest_id: eventQuest.id,
              p_selected: selectedAnswers,
            });
            if (error || !graded) throw error || new Error('grade_event_quiz returned no data');
            return {
              correct_count: graded.correct_count,
              total: graded.total,
              is_perfect: graded.is_perfect,
              correct_answers: graded.correct_answers,
            };
          }}
          onQuizSubmit={handleEventQuizSubmit}
          onExit={() => {
            setActiveEventQuest(null);
            setEventQuizPhase('study');
          }}
        />
      )}
    </div>
  );
}
