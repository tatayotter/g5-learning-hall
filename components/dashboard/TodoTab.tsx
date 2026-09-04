// components/dashboard/TodoTab.tsx
// Extracted from Dashboard.tsx's `activeTab === 'todo'` block — part of
// splitting that god component apart, same approach as VaultTab/GuildsTab.
// No behavior change.
'use client';

import { UserId, gradeToNumber, USERS } from '@/lib/userSession';
import { useWeeklyData } from '@/hooks/useWeeklyData';
import { GuildKey } from '@/lib/dailyChecklist';
import { questButtonFontFamily, questButtonLetterSpacing, questTextShadowStyle, questTextStyle } from '@/components/GameButton';
import DailyChecklist from '@/components/DailyChecklist';

type UseWeeklyDataReturn = ReturnType<typeof useWeeklyData>;

interface TodoTabProps {
  activeUserId: UserId;
  weekStartingDate: string;
  currentDayName: string;
  // Friday-collapsed-to-"Weekly Review" package data, same shape DailyChecklist
  // already expects (see Dashboard.tsx's mainQuestPackageData memo).
  mainQuestPackageData: any;
  journalLogs: Record<string, unknown> | undefined | null;
  masteredQuizzes: string[] | undefined;
  applyGoldDelta: UseWeeklyDataReturn['applyGoldDelta'];
  todoCount: { done: number; total: number } | null;
  onTodoCountChange: (done: number, total: number) => void;
  setActiveTab: (tab: string) => void;
  setActiveGuild: (guild: GuildKey | null) => void;
  setActiveQuest: (quest: string | null) => void;
}

export default function TodoTab({
  activeUserId,
  weekStartingDate,
  currentDayName,
  mainQuestPackageData,
  journalLogs,
  masteredQuizzes,
  applyGoldDelta,
  todoCount,
  onTodoCountChange,
  setActiveTab,
  setActiveGuild,
  setActiveQuest,
}: TodoTabProps) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 mt-4 mb-2" data-tutorial-id="todo-welcome">
        {/* Same Bungee/stroke/shadow text treatment as the quest
            GameButton's label (2026-08-29), in quest gold instead of
            the button's white. */}
        <h1 className="text-2xl lg:text-3xl" style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing }}>
          <span style={{ position: 'relative', display: 'inline-block' }}>
            <span aria-hidden style={questTextShadowStyle}>Daily To-Dos</span>
            <span style={{ ...questTextStyle, color: '#f5c542' }}>Daily To-Dos</span>
          </span>
        </h1>
        {todoCount && (
          <span className={`text-xs font-bold px-3 py-1 rounded-full flex-shrink-0
            ${todoCount.done === todoCount.total ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            {todoCount.done}/{todoCount.total} done
          </span>
        )}
      </div>
      <p className="text-gray-500 mb-6">Clear today's checklist to claim your daily bonus gold.</p>
      <DailyChecklist
        userId={activeUserId}
        grade={gradeToNumber(USERS[activeUserId]?.grade)}
        currentSunday={weekStartingDate}
        currentDayName={currentDayName}
        packageData={mainQuestPackageData}
        journalLogs={journalLogs}
        masteredQuizzes={masteredQuizzes}
        onGoldAwarded={applyGoldDelta}
        onPlayGuild={(guildKey) => { setActiveTab('guilds'); setActiveGuild(guildKey); }}
        onGoToJournal={() => setActiveTab('journal')}
        onGoToMainQuest={() => { setActiveTab('board'); setActiveQuest(null); }}
        onGoToTrainingMap={() => setActiveTab('monster')}
        onCountChange={onTodoCountChange}
      />
    </div>
  );
}
