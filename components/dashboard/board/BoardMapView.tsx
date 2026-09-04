// components/dashboard/board/BoardMapView.tsx
// Extracted from Dashboard.tsx's board-tab "map" view — the default board
// screen shown when no quest/event-quest/boss-fight/gauntlet-day is active.
// Part of splitting Dashboard.tsx apart, same approach as VaultTab/GuildsTab
// /JournalTab/TodoTab/ProfileTab. No behavior change.
'use client';

import ReactMarkdown from 'react-markdown';
import { UserId, USERS } from '@/lib/userSession';
import { WEEKDAYS } from '@/lib/weekdays';
import { ALL_MONSTERS } from '@/lib/monsterConfig';
import { MonsterImage } from '@/components/battle/shared';
import { questButtonFontFamily, questButtonLetterSpacing, questTextShadowStyle, questTextStyle } from '@/components/GameButton';
import WelcomeCard from '@/components/WelcomeCard';
import ReferralKeyDisplay from '@/components/ReferralKeyDisplay';
import QuestCard from '@/components/QuestCard';
import BossPersonaFan from '@/components/monster/BossPersonaFan';
import { getPersonasForGrade } from '@/lib/bossPersonas';
import { POOL_READY_THRESHOLD, BossQuestion } from '@/lib/bossFightEngine';
import { CustomEvent, EventQuest, UserEventProgressRow } from '@/lib/customEvents';

interface BoardMapViewProps {
  activeUserId: UserId;
  loginStreak: number;
  totalQuests: number;
  masteredQuizzes: string[] | undefined;
  dashReferralKey: string | null;

  activeEvent: CustomEvent | null;
  eventClaimed: boolean;
  claimedMonsterId: string | null;
  onViewClaimedInCompendium: () => void;
  eventQuests: EventQuest[];
  eventProgress: UserEventProgressRow[];
  onEnterEventQuest: (questId: string) => void;

  bossEventActive: boolean;
  bossGradeLevel: number;
  bossDefeated: Set<string>;
  bossPoolCounts: Record<string, number>;
  onChallengeBoss: (subject: string) => void;

  currentDayName: string;
  mainQuestPackageData: any;
  gauntletDayPools: Record<string, BossQuestion[]>;
  gauntletDaysDone: Set<string>;
  onEnterGauntletDay: (day: string) => void;
  openTutorialDayName: string | null;
  onEnterQuest: (questKey: string) => void;
}

export default function BoardMapView({
  activeUserId,
  loginStreak,
  totalQuests,
  masteredQuizzes,
  dashReferralKey,
  activeEvent,
  eventClaimed,
  claimedMonsterId,
  onViewClaimedInCompendium,
  eventQuests,
  eventProgress,
  onEnterEventQuest,
  bossEventActive,
  bossGradeLevel,
  bossDefeated,
  bossPoolCounts,
  onChallengeBoss,
  currentDayName,
  mainQuestPackageData,
  gauntletDayPools,
  gauntletDaysDone,
  onEnterGauntletDay,
  openTutorialDayName,
  onEnterQuest,
}: BoardMapViewProps) {
  return (
    <div>
      {/* Same Bungee/stroke/shadow text treatment as the quest
          GameButton's label (2026-08-29), in quest gold instead of
          the button's white. */}
      <h1 className="text-2xl lg:text-3xl mt-4 mb-2" style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing }}>
        <span style={{ position: 'relative', display: 'inline-block' }}>
          <span aria-hidden style={questTextShadowStyle}>Active Campaign Map</span>
          <span style={{ ...questTextStyle, color: '#f5c542' }}>Active Campaign Map</span>
        </span>
      </h1>
      <p className="text-gray-500 mb-4 text-sm">Select an open, active quest card from the schedule below to begin your training.</p>

      <div data-tutorial-id="board-welcome">
        <WelcomeCard
          playerName={USERS[activeUserId]?.name ?? activeUserId}
          loginStreak={loginStreak}
          totalQuests={totalQuests}
          completedQuests={masteredQuizzes?.length ?? 0}
        />
      </div>

      {/* Compact referral key — invite friends from the board */}
      {dashReferralKey && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-amber-500 text-base">🔗</span>
            <div>
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wider leading-tight">
                Invite Friends
              </p>
              <p className="text-xs text-gray-500 leading-tight">Share your code — you both earn rewards</p>
            </div>
          </div>
          <ReferralKeyDisplay referralKey={dashReferralKey} compact />
        </div>
      )}

      {activeEvent && (
        <div className="mb-10">
          <div className="relative rounded-2xl border-2 border-amber-500/70 bg-gradient-to-br from-[#1a1005] to-black shadow-[0_0_0_2px_#000,0_0_40px_-8px_rgba(245,158,11,0.35)] overflow-hidden">
            {activeEvent.banner_url && (
              <div className="absolute inset-0 z-0">
                <img src={activeEvent.banner_url} alt="" className="w-full h-full object-cover opacity-35" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0d0700] via-[#0d0700]/85 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d0700] via-transparent to-transparent" />
              </div>
            )}
            <div className="relative z-10">
            <div className="p-6 pb-5">
              <h2 className="text-2xl font-bold text-white font-display mb-1">{activeEvent.title}</h2>
              <p className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                Limited-time event <span className="text-amber-700 mx-1">•</span> Bonus loot inside
              </p>
            </div>
            {eventClaimed ? (
              <div className="px-6 pb-6 flex flex-col items-center text-center gap-3">
                <p className="text-green-400 font-bold">
                  ✅ Special Event Completed. You have collected {(claimedMonsterId && ALL_MONSTERS[claimedMonsterId]?.name) ?? 'your reward'}!
                </p>
                {claimedMonsterId && ALL_MONSTERS[claimedMonsterId] && (
                  <button
                    type="button"
                    onClick={onViewClaimedInCompendium}
                    className="cursor-pointer"
                    title="View in Compendium"
                  >
                    <MonsterImage
                      monster={ALL_MONSTERS[claimedMonsterId]}
                      className="w-24 h-24 hover:scale-105 transition-transform"
                      emojiClassName="text-7xl"
                    />
                  </button>
                )}
              </div>
            ) : (
            <div className="px-6 pb-6">
              {(activeEvent.details_markdown || activeEvent.reward_lore_markdown) && (
                <div className="mb-5 space-y-3">
                  {activeEvent.details_markdown && (
                    <div className="text-sm text-gray-300 leading-relaxed">
                      <ReactMarkdown>{activeEvent.details_markdown}</ReactMarkdown>
                    </div>
                  )}
                  {activeEvent.reward_lore_markdown && (
                    <div className="text-sm text-yellow-200/90 leading-relaxed bg-amber-900/10 border border-amber-900/40 rounded-lg p-3">
                      <ReactMarkdown>{activeEvent.reward_lore_markdown}</ReactMarkdown>
                    </div>
                  )}
                </div>
              )}
              {activeEvent.content_source === 'gauntlet' ? (
                <p className="text-xs text-emerald-400/90 font-bold uppercase tracking-wide">
                  ⚔️ This week's board below is your Topic Mastery Gauntlet — one review session per day.
                </p>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {eventQuests.map((q) => {
                  const isQuestMastered = eventProgress.some(p => p.event_quest_id === q.id && p.is_mastered);
                  return (
                    <QuestCard
                      key={q.id}
                      subjectName={q.subject_name}
                      completed={isQuestMastered}
                      onEnter={() => onEnterEventQuest(q.id)}
                    />
                  );
                })}
              </div>
              )}
            </div>
            )}
            </div>
          </div>
        </div>
      )}

      {bossEventActive && (
        <div className="mb-10">
          {/* overflow-hidden: BossPersonaFan fans its cards out with
              absolute positioning, which can spill past this box's
              edges (the source of the horizontal-scroll bug) — clip it
              here instead of relying solely on the page-level
              overflow-x guard in globals.css. */}
          <div className="rounded-2xl border-2 border-purple-700/70 bg-gradient-to-br from-[#0d0512] to-black shadow-[0_0_0_2px_#000,0_0_40px_-8px_rgba(147,51,234,0.35)] p-6 overflow-hidden">
            <h2 className="text-xl font-bold text-white font-display mb-1">Term Boss — The Forgetting</h2>
            <p className="text-xs font-bold text-purple-400 uppercase tracking-wide mb-4">
              Defeat every persona to push it back
            </p>
            <BossPersonaFan
              personas={getPersonasForGrade(bossGradeLevel)}
              defeated={bossDefeated}
              readySubjects={new Set(Object.entries(bossPoolCounts).filter(([, c]) => c >= POOL_READY_THRESHOLD).map(([s]) => s))}
              onChallenge={onChallengeBoss}
            />
          </div>
        </div>
      )}

      {WEEKDAYS.map((day) => {
        const isToday = currentDayName === day;
        const gauntletActive = activeEvent?.content_source === 'gauntlet';
        // During a live gauntlet event, that day's slice of the review
        // pool substitutes the normal per-subject cards entirely —
        // mainQuestPackageData is irrelevant this week (break weeks
        // don't get BOW-generated content in the first place, see
        // project_term_break_special_content_plan memory).
        const daySubjects = mainQuestPackageData[day] || {};
        const subjectKeys = Object.keys(daySubjects);
        const gauntletDayQuestions = gauntletDayPools[day] || [];
        const dayFullyMastered = gauntletActive
          ? gauntletDaysDone.has(day)
          : subjectKeys.length > 0 &&
            subjectKeys.every((subjectName) => (masteredQuizzes || []).includes(`${day}_${subjectName}`));

        return (
          <div key={day} className="mb-8" data-tutorial-id={day === openTutorialDayName ? 'board-today-quest' : undefined}>
            <div className="flex items-center gap-3 mb-4">
              <h2 className={`text-sm font-bold uppercase tracking-wide whitespace-nowrap ${isToday ? 'text-amber-600' : 'text-gray-400'}`}>
                {day} Objectives {isToday && <span className="text-amber-500">⚡ (Current Run)</span>}
              </h2>
              <div className={`flex-1 h-px ${isToday ? 'bg-amber-400/50' : 'bg-gray-200'}`} />
            </div>

            {dayFullyMastered ? (
              <p className="text-sm text-green-600 font-bold">✅ {day} Quests Completed</p>
            ) : gauntletActive ? (
              gauntletDayQuestions.length === 0 ? (
                <p className="text-sm text-gray-400">Gathering this day's review questions…</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  <QuestCard
                    subjectName="Topic Mastery Gauntlet"
                    completed={false}
                    onEnter={() => onEnterGauntletDay(day)}
                  />
                </div>
              )
            ) : isToday || subjectKeys.length > 0 ? (
              subjectKeys.length === 0 ? (
                <p className="text-sm text-gray-400">No quests registered for this specific calendar path.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {subjectKeys.map((subjectName) => (
                    <QuestCard
                      key={subjectName}
                      subjectName={subjectName}
                      completed={(masteredQuizzes || []).includes(`${day}_${subjectName}`)}
                      onEnter={() => onEnterQuest(`${day}_${subjectName}`)}
                    />
                  ))}
                </div>
              )
            ) : null}
          </div>
        );
      })}

      {/* AchievementsBoard removed — accessible via Hero Profile tab */}
    </div>
  );
}
