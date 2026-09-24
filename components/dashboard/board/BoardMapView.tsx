// components/dashboard/board/BoardMapView.tsx
// Extracted from Dashboard.tsx's board-tab "map" view — the default board
// screen shown when no quest/event-quest/boss-fight/gauntlet-day is active.
// Part of splitting Dashboard.tsx apart, same approach as VaultTab/GuildsTab
// /JournalTab/TodoTab/ProfileTab. No behavior change.
'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import { UserId, USERS } from '@/lib/userSession';
import { WEEKDAYS } from '@/lib/weekdays';
import { ALL_MONSTERS } from '@/lib/monsterConfig';
import { MonsterImage } from '@/components/battle/shared';
import { supabase } from '@/lib/supabase';
import { questButtonFontFamily, questButtonLetterSpacing, questButtonBoxShadow, questTextShadowStyle, questTextStyle, CURIO_CARD_STYLES } from '@/components/GameButton';
import WelcomeCard from '@/components/WelcomeCard';
import { playPageFlip } from '@/lib/sounds';
import ReferralKeyDisplay from '@/components/ReferralKeyDisplay';
import QuestCard from '@/components/QuestCard';
import BossPersonaFan from '@/components/monster/BossPersonaFan';
import { getPersonasForGrade } from '@/lib/bossPersonas';
import { POOL_READY_THRESHOLD, BossQuestion } from '@/lib/bossFightEngine';
import { CustomEvent, EventQuest, UserEventProgressRow } from '@/lib/customEvents';
import { MAIN_QUEST_DAILY_ATTEMPT_CAP } from '@/lib/mainQuestAttempts';

interface BoardMapViewProps {
  activeUserId: UserId;
  loginStreak: number;
  totalQuests: number;
  masteredQuizzes: string[] | undefined;
  dailyQuestAttempts: Record<string, number> | undefined;
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
  weekStartingDate: string;
  mainQuestPackageData: any;
  gauntletDayPools: Record<string, BossQuestion[]>;
  gauntletDaysDone: Set<string>;
  onEnterGauntletDay: (day: string) => void;
  openTutorialDayName: string | null;
  onEnterQuest: (questKey: string) => void;
}

// Same parchment-tile look as the curio picker's `.ccard` (GameButton.tsx's
// CURIO_CARD_STYLES — the "which curio should train?" cards) — dashed inset
// border, chunky offset drop shadow, gold `.ccard-selected` treatment — but
// without `.ccard`'s own flex/center-column layout, which is tuned for a
// small icon-card and would center this card's day heading + quest-card
// grid instead of stacking them normally. `.daycard`/`.daycard-selected`
// carry the same colors/shadow/dashed-border values, just as a plain block.
const DAY_CARD_STYLES = `
  .daycard { position:relative; border-radius:16px; border:2px solid #8b5e2a;
    background:linear-gradient(180deg,#fffdf7 0%,#fbf3df 100%);
    box-shadow:0 4px 0 #8b5e2a, 0 8px 12px rgba(42,21,5,.22); padding:22px 16px 16px; }
  .daycard::before { content:''; position:absolute; inset:4px; border:1px dashed #c9a87a; border-radius:11px; pointer-events:none; }
  .daycard-selected { border-color:#c9781a; background:linear-gradient(180deg,#ffe9a8 0%,#f5c95c 100%);
    box-shadow:0 4px 0 #c9781a, 0 0 0 3px rgba(245,201,92,.6), 0 8px 14px rgba(201,120,26,.4); }
`;

// A row of the player_log table (lib/playerlog.ts's logAction) — free-text
// description, no structured subject/weekday/quest link, so the parsing
// below is the only way to recover "which subject" and "which day" from it.
interface LogEntry {
  description: string;
  xp_change: number;
  gold_change: number;
  created_at: string;
}

// week_starting_date is Sunday-keyed (hooks/useWeeklyData.ts's currentSunday
// — see project_weekly_content_conventions memory), so Monday..Friday are
// simply +1..+5 days from it.
//
// Pure calendar arithmetic in UTC on purpose. The first version built a LOCAL-midnight Date
// and read it back with toISOString() (UTC), which lands one day early in any UTC+ zone —
// every weekday mapped to the day before for Manila users, so curio-training pills showed
// under the wrong day (caught by testing against real player_log rows, 2026-09-24).
function dateForWeekday(weekStartingDate: string, day: string): string {
  const [y, m, d] = weekStartingDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + WEEKDAYS.indexOf(day) + 1)).toISOString().slice(0, 10);
}

// The calendar date (YYYY-MM-DD) a player_log timestamp falls on in Asia/Manila — the same
// timezone the DB's current_week_start() is fixed to. Fixed UTC+8 (Manila has no DST). Slicing
// the UTC ISO string instead would put anything logged before 8am Manila — a school-morning
// study session — on the previous day.
function manilaDate(iso: string): string {
  return new Date(new Date(iso).getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// One day's card — the curio-picker's parchment card treatment (see
// DAY_CARD_STYLES above), replacing the trail/waypoint treatment tried and
// dropped earlier (2026-09-23): a footprint-image trail drew too much
// attention on its own, and the stripped-down connecting-line version that
// followed still read as awkward, so the whole trail idea was scrapped for
// a plain card list — now restyled to match the rest of the app's cards.
// `clearedContent` (the per-subject XP/Gold + curio-training breakdown) is
// folded behind a tap by default — expanding every cleared day at once
// crowds the screen — while `children` (the open-quest-card grid) always
// renders directly, since there's nothing to fold there.
function DayCard({
  day,
  isToday,
  isTutorialTarget,
  dayFullyMastered,
  clearedContent,
  children,
}: {
  day: string;
  isToday: boolean;
  isTutorialTarget: boolean;
  dayFullyMastered: boolean;
  clearedContent: ReactNode;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`daycard mb-8 ${isToday ? 'daycard-selected' : ''}`}
      data-tutorial-id={isTutorialTarget ? 'board-today-quest' : undefined}
    >
      {isToday && (
        <span
          className="ccard-tag"
          style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing, boxShadow: questButtonBoxShadow, fontSize: 10, background: '#22c55e' }}
        >
          <span style={{ position: 'relative', display: 'inline-block' }}>
            <span aria-hidden style={questTextShadowStyle}>Current Run</span>
            <span style={questTextStyle}>Current Run</span>
          </span>
        </span>
      )}
      <div className="flex items-center gap-2 mb-3">
        {dayFullyMastered && (
          <span
            className="flex-none w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(160deg,#4ade80,#15803d)', border: '2px solid #14532d' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4,13 9,18 20,6" />
            </svg>
          </span>
        )}
        <h2 className="text-xl" style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing }}>
          <span style={{ position: 'relative', display: 'inline-block' }}>
            <span aria-hidden style={questTextShadowStyle}>{day}</span>
            <span style={{ ...questTextStyle, color: isToday ? '#f5c542' : '#e0b872' }}>{day}</span>
          </span>
        </h2>
      </div>

      {dayFullyMastered ? (
        <div>
          <button
            type="button"
            onClick={() => { playPageFlip(); setExpanded(v => !v); }}
            className="w-full flex items-center justify-between gap-2 bg-[#e8f5e0] border border-green-700 rounded-xl px-3 py-2.5"
          >
            <span className="text-sm font-bold text-green-700">All quests cleared this day</span>
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: expanded ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }}
            >
              <polyline points="6,9 12,15 18,9" />
            </svg>
          </button>
          {expanded && <div className="mt-2 space-y-2">{clearedContent}</div>}
        </div>
      ) : (
        children
      )}
    </div>
  );
}

export default function BoardMapView({
  activeUserId,
  loginStreak,
  totalQuests,
  masteredQuizzes,
  dailyQuestAttempts,
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
  weekStartingDate,
  mainQuestPackageData,
  gauntletDayPools,
  gauntletDaysDone,
  onEnterGauntletDay,
  openTutorialDayName,
  onEnterQuest,
}: BoardMapViewProps) {
  // Cleared-day detail (per-subject XP/Gold actually earned, which curios
  // trained) comes from player_log rather than the fixed 200/50 QuestCard
  // shows — the real reward shrinks with extra attempts (lib/quizReward.ts),
  // so only the log has the true number. The log has no structured
  // subject/weekday column though, just a free-text `description` — see
  // LogEntry/dateForWeekday above for how that's recovered.
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  useEffect(() => {
    let cancelled = false;
    if (!activeUserId || !weekStartingDate) return;
    supabase
      .from('player_log')
      .select('description, xp_change, gold_change, created_at')
      .eq('user_id', activeUserId)
      .eq('week_starting_date', weekStartingDate)
      .eq('action_type', 'quiz')
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!cancelled && !error && data) setLogEntries(data as LogEntry[]);
      });
    return () => { cancelled = true; };
  }, [activeUserId, weekStartingDate]);

  // subject name -> what was actually earned clearing it (parsed from
  // logAction's "Completed {subject} in {n} attempt(s)" description).
  const subjectRewards = useMemo(() => {
    const map: Record<string, { xp: number; gold: number }> = {};
    for (const e of logEntries) {
      const m = e.description.match(/^Completed (.+) in \d+ attempt/);
      if (m) map[m[1]] = { xp: e.xp_change, gold: e.gold_change };
    }
    return map;
  }, [logEntries]);

  // calendar date (YYYY-MM-DD) -> curios that trained that day, from
  // ActiveQuestView.tsx's awardTrainingExp "{name} trained +{exp} Curio EXP"
  // log line. No subject/quest_key on these rows, so they can't be
  // reliably attributed to one specific subject card — shown as a
  // day-level list instead (see the mid-session decision on this).
  const curioTrainingByDate = useMemo(() => {
    const map: Record<string, { name: string; exp: number }[]> = {};
    for (const e of logEntries) {
      const m = e.description.match(/trained \+(\d+) Curio EXP$/);
      if (!m) continue;
      const name = e.description.slice(0, e.description.indexOf(' trained +')).replace(/^[^\w]+/, '').trim();
      const date = manilaDate(e.created_at);
      (map[date] ||= []).push({ name, exp: Number(m[1]) });
    }
    return map;
  }, [logEntries]);

  return (
    <div>
      <style>{CURIO_CARD_STYLES}{DAY_CARD_STYLES}</style>
      {/* Same Bungee/stroke/shadow text treatment as the quest
          GameButton's label (2026-08-29), in quest gold instead of
          the button's white. */}
      <h1 className="text-2xl lg:text-3xl mt-4 mb-2" style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing }}>
        <span style={{ position: 'relative', display: 'inline-block' }}>
          <span aria-hidden style={questTextShadowStyle}>Active Campaign Map</span>
          <span style={{ ...questTextStyle, color: '#f5c542' }}>Active Campaign Map</span>
        </span>
      </h1>
      <p className="text-[#6b4820] mb-4 text-sm">Select an open quest card from the schedule below to begin your training.</p>

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
        <div className="mb-6 rounded-[14px] border border-[#c9a87a] bg-[#fdf6e8] px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex-none w-8 h-8 rounded-[10px] bg-[#f0ddb8] flex items-center justify-center text-[#7a4a0f]">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 14a5 5 0 0 0 7.07 0l2-2a5 5 0 0 0-7.07-7.07L10.5 6.4" />
                <path d="M14 10a5 5 0 0 0-7.07 0l-2 2a5 5 0 0 0 7.07 7.07L13.5 17.6" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#7a4a0f] uppercase tracking-wider leading-tight">
                Invite Friends
              </p>
              <p className="text-xs text-[#6b4820] leading-tight">Share your code — you both earn rewards</p>
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
                    onClick={() => { playPageFlip(); onViewClaimedInCompendium(); }}
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

        const dayCurioTraining = dayFullyMastered ? (curioTrainingByDate[dateForWeekday(weekStartingDate, day)] || []) : [];

        return (
          <DayCard
            key={day}
            day={day}
            isToday={isToday}
            dayFullyMastered={dayFullyMastered}
            isTutorialTarget={day === openTutorialDayName}
            clearedContent={
              <>
                {subjectKeys.map((subjectName) => {
                  const reward = subjectRewards[subjectName];
                  return (
                    <div key={subjectName} className="flex items-center justify-between gap-2 bg-white border border-[#c9a87a] rounded-xl px-3 py-2">
                      <span className="text-sm font-bold text-[#2a1505]">{subjectName}</span>
                      {reward && (
                        <span className="flex items-center gap-1.5 flex-none">
                          <span className="flex items-center gap-1 bg-[#e8f5e0] rounded-full px-2 py-0.5 text-[10px] font-bold text-green-700">
                            <img src="/icons/stats/stat_up.svg" alt="" className="w-3 h-3" /> +{reward.xp} EXP
                          </span>
                          <span className="flex items-center gap-1 bg-[#fdf6e8] rounded-full px-2 py-0.5 text-[10px] font-bold text-yellow-700">
                            <img src="/icons/rewards/gold_coin.svg" alt="" className="w-3 h-3" /> +{reward.gold} GOLD
                          </span>
                        </span>
                      )}
                    </div>
                  );
                })}
                {dayCurioTraining.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {dayCurioTraining.map((c, i) => (
                      <span key={i} className="flex items-center gap-1 bg-[#fdf6e8] border border-[#c9a87a] rounded-full px-2.5 py-1 text-xs font-bold text-[#7a4a0f]">
                        {c.name} trained <span className="text-green-700">+{c.exp} EXP</span>
                      </span>
                    ))}
                  </div>
                )}
              </>
            }
          >
            {gauntletActive ? (
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
                  {subjectKeys.map((subjectName) => {
                    const attemptsToday = (dailyQuestAttempts || {})[`${day}_${subjectName}`] || 0;
                    return (
                      <QuestCard
                        key={subjectName}
                        subjectName={subjectName}
                        completed={(masteredQuizzes || []).includes(`${day}_${subjectName}`)}
                        locked={attemptsToday >= MAIN_QUEST_DAILY_ATTEMPT_CAP}
                        onEnter={() => onEnterQuest(`${day}_${subjectName}`)}
                      />
                    );
                  })}
                </div>
              )
            ) : null}
          </DayCard>
        );
      })}

      {/* AchievementsBoard removed — accessible via Hero Profile tab */}
    </div>
  );
}
