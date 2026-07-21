// app/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { UserId, getActiveUser, clearActiveUser, loadClassmates, loadFamilyProtection, loadAvatarOverrides, linkIdentity, recordLastLogin, USERS } from '@/lib/userSession';
import SplashScreen from '@/components/SplashScreen';
import { useWeeklyData, CharacterStats } from '@/hooks/useWeeklyData';
import HeroProfile from '@/components/HeroProfile';
import GuildJournal from '@/components/GuildJournal';
import DailyChecklist from '@/components/DailyChecklist';
import { markGuildSessionToday, GuildKey } from '@/lib/dailyChecklist';
import QuestModule from '@/components/QuestModule';
import { format } from 'date-fns';
import AdminPanel from '@/components/AdminPanel';
import AchievementsBoard from '@/components/AchievementsBoard';
import { supabase } from '@/lib/supabase';
import PlayerLog from '@/components/PlayerLog';
import Lorekeeper from '@/components/guilds/Lorekeeper';
import SpellCaster from '@/components/guilds/SpellCaster';
import NumberRealm from '@/components/guilds/NumberRealm';
import LogicLabyrinth from '@/components/guilds/LogicLabyrinth';
import { logAction } from '@/lib/playerlog';
import MonsterGuild from '@/components/MonsterGuild';
import AdminDashboard from '@/components/AdminDashboard';
import { playCoins, playPageFlip } from '@/lib/sounds';
import Toast from '@/components/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import GameButton from '@/components/GameButton';
import AchievementToast from '@/components/AchievementToast';
import { useAchievementNotifier } from '@/hooks/useAchievementNotifier';
import LexiconArena from '@/components/guilds/LexiconArena';
import GuardianSprite from '@/components/guilds/GuardianSprite';
import { fetchSubclassProfile, SubclassProfile } from '@/lib/guildEngine';
import MonsterShop from '@/components/MonsterShop';
import { useLiveBattleInbox } from '@/hooks/useLiveBattleInbox';
import LiveBattleInviteToast from '@/components/LiveBattleInviteToast';
import { respondToInvite } from '@/lib/liveBattle';
import EventPanel from '@/components/EventPanel';
import EventAnnouncementPopup from '@/components/EventAnnouncementPopup';
import {
  CustomEvent,
  EventQuest,
  UserEventProgressRow,
  fetchActiveEvent,
  fetchEventQuests,
  fetchUserEventProgress,
  hasClaimedEventReward,
  recordEventQuizMastery,
  claimEventReward,
} from '@/lib/customEvents';

const VAULT_CATALOG = {
  "voucher_30m": {
    "name": "🎮 30-Min Gaming Voucher",
    "cost": 100,
    "desc": "Unlocks 30 minutes of console gaming or modding runtime privileges.",
  },
  "jollibee_burger": {
    "name": "🍔 Jollibee Yumburger Reward",
    "cost": 250,
    "desc": "Claim a real-world Jollibee hamburger snack ordered by Tatay. (Limit: 1 per week)",
  },
  "ai_lording": {
    "name": "🧙‍♂️ 30-Min AI Lording Sandbox",
    "cost": 100,
    "desc": "Unlocks 30 minutes of advanced AI prompt mastery using Google Gemini.",
  },
};

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function Dashboard() {
  const [activeUserId, setActiveUserId] = useState<UserId | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    async function hydrate() {
      // Classmates are loaded from Supabase, so USERS must be populated
      // before anything reads USERS[savedUserId] below. Avatar overrides are
      // keyed by user_id, so they must load after classmates exist in USERS.
      await Promise.all([loadClassmates(), loadFamilyProtection()]);
      await loadAvatarOverrides();
      const saved = getActiveUser();
      if (saved && USERS[saved]) {
        setActiveUserId(saved);
        const theme = USERS[saved].theme;
        document.documentElement.classList.toggle('theme-tala', theme === 'tala');
      } else if (saved) {
        // Stale/deactivated account — clear it so the splash screen shows.
        clearActiveUser();
      }
      setHydrated(true);
    }
    hydrate();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (activeUserId) {
      const theme = USERS[activeUserId].theme;
      document.documentElement.classList.toggle('theme-tala', theme === 'tala');
      linkIdentity(activeUserId);
      recordLastLogin(activeUserId);
    }
  }, [activeUserId, hydrated]);

  // App-wide presence so the splash screen can show who's currently online.
  // Separate from the training-map presence channel, which only exists while
  // that tab is open and carries x/y position data this doesn't need.
  useEffect(() => {
    if (!activeUserId) return;
    const channel = supabase.channel('app-presence', {
      config: { presence: { key: activeUserId } },
    });
    channel.subscribe(async status => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ userId: activeUserId });
      }
    });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeUserId]);

  const handleUserSelect = (id: UserId) => {
    setActiveUserId(id);
    const theme = USERS[id].theme;
    document.documentElement.classList.toggle('theme-tala', theme === 'tala');
  };

  const handleAdminSelect = (id: UserId) => {
    setActiveUserId(id);
    const theme = USERS[id].theme;
    document.documentElement.classList.toggle('theme-tala', theme === 'tala');
    setSplashAdminMode(true);
  };

  const handleSwitchUser = () => {
    clearActiveUser();
    document.documentElement.classList.remove('theme-tala');
    setActiveUserId(null);
  };

  const { data, loading, updateStatsAndJournal, currentSunday, applyGoldDelta } = useWeeklyData(activeUserId ?? 'damien');
  // Sticks to whichever top-level tab the player was on across a page refresh
  // instead of always dropping back to Main Quests. sessionStorage (not
  // localStorage) so a fresh browser session still starts clean.
  const [activeTab, setActiveTab] = useState(() =>
    (typeof window !== 'undefined' && sessionStorage.getItem('activeTab')) || 'board'
  );
  useEffect(() => {
    sessionStorage.setItem('activeTab', activeTab);
  }, [activeTab]);
  const [pendingLiveBattleId, setPendingLiveBattleId] = useState<string | null>(null);
  const [claimingKey, setClaimingKey] = useState<string | null>(null);
  const claimBusyRef = useRef(false);
  const liveBattleInbox = useLiveBattleInbox(activeUserId ?? '', activeUserId ? USERS[activeUserId]?.name ?? '' : '');

  const handleAcceptLiveBattleInvite = async () => {
    const invite = liveBattleInbox.incomingInvite;
    if (!invite) return;
    await respondToInvite(invite.battleId, true);
    await liveBattleInbox.sendInviteResponse(invite.fromId, invite.battleId, true);
    liveBattleInbox.clearIncomingInvite();
    setPendingLiveBattleId(invite.battleId);
    setActiveTab('monster');
  };

  const handleDeclineLiveBattleInvite = async () => {
    const invite = liveBattleInbox.incomingInvite;
    if (!invite) return;
    await respondToInvite(invite.battleId, false);
    await liveBattleInbox.sendInviteResponse(invite.fromId, invite.battleId, false);
    liveBattleInbox.clearIncomingInvite();
  };
  const [splashAdminMode, setSplashAdminMode] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);  
  const [activeQuest, setActiveQuest] = useState<string | null>(null);
  const [activeGuild, setActiveGuild] = useState<GuildKey | null>(null);
  const [guildProfile, setGuildProfile] = useState<SubclassProfile | null>(null);

  useEffect(() => {
    if (activeTab !== 'guilds' || !activeUserId) return;
    fetchSubclassProfile(activeUserId).then(setGuildProfile);
  }, [activeTab, activeUserId]);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('sidebarOpen');
    return saved === null ? true : saved === 'true';
  });

  const toggleSidebar = () => {
    setSidebarOpen(prev => {
      const next = !prev;
      localStorage.setItem('sidebarOpen', String(next));
      return next;
    });
  };
  const [quizPhase, setQuizPhase] = useState<'study' | 'ready' | 'quiz'>('study');
  const [myClaims, setMyClaims] = useState<any[]>([]);
  const [toast, setToast] = useState({ show: false, message: '' });
  const { newlyUnlocked, clearNotifications } = useAchievementNotifier(data);

  // --- Custom Events ---
  const [activeEvent, setActiveEvent] = useState<CustomEvent | null>(null);
  const [eventQuests, setEventQuests] = useState<EventQuest[]>([]);
  const [eventProgress, setEventProgress] = useState<UserEventProgressRow[]>([]);
  const [eventClaimed, setEventClaimed] = useState(false);
  const [activeEventQuest, setActiveEventQuest] = useState<string | null>(null);
  const [eventQuizPhase, setEventQuizPhase] = useState<'study' | 'ready' | 'quiz'>('study');
  const [showEventPopup, setShowEventPopup] = useState(false);

  const loadEventData = async (userId: UserId) => {
    const ev = await fetchActiveEvent();
    setActiveEvent(ev);
    if (!ev) {
      setEventQuests([]);
      setEventProgress([]);
      setEventClaimed(false);
      return;
    }
    const gradeLevel = USERS[userId]?.grade === 'Grade 2' ? 2 : 5;
    const [quests, progress, claimed] = await Promise.all([
      fetchEventQuests(ev.id, gradeLevel),
      fetchUserEventProgress(userId, ev.id),
      hasClaimedEventReward(userId, ev.id),
    ]);
    setEventQuests(quests);
    setEventProgress(progress);
    setEventClaimed(claimed);

    if (
      !claimed &&
      typeof window !== 'undefined' &&
      !sessionStorage.getItem(`event_popup_shown_${ev.id}`)
    ) {
      setShowEventPopup(true);
    }
  };

  useEffect(() => {
    if (!activeUserId) return;
    loadEventData(activeUserId);
  }, [activeUserId]);

  const handleDismissEventPopup = () => {
    setShowEventPopup(false);
    if (activeEvent && typeof window !== 'undefined') {
      sessionStorage.setItem(`event_popup_shown_${activeEvent.id}`, '1');
    }
  };

  // Fetch claims filtered to the active user
  const fetchMyClaims = async () => {
    if (!activeUserId) return;
    const { data: claimsData } = await supabase
      .from('reward_claims')
      .select('*')
      .eq('app_user_id', activeUserId)
      .order('created_at', { ascending: false });
    if (claimsData) setMyClaims(claimsData);
  };

  useEffect(() => {
    fetchMyClaims();
  }, [activeUserId]);

  // Live-refresh claimed rewards so the claimable-hours total updates as
  // soon as an admin marks a reward "supplied" from the Admin Dashboard,
  // without the kid needing to reload the page.
  useEffect(() => {
    if (!activeUserId) return;
    const channel = supabase
      .channel(`reward-claims-${activeUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reward_claims', filter: `app_user_id=eq.${activeUserId}` },
        () => fetchMyClaims()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeUserId]);

  const handleClaimReward = async (cost: number, itemName: string, itemKey: string) => {
    if (!data || !activeUserId) return;
    // Guards against a rapid double-click firing two claims before the gold
    // deduction above re-renders — without this, both clicks read the same
    // pre-deduction `data.character_stats.gold` and both pass the balance
    // check, charging gold once (stale-closure double-set) but inserting two
    // reward_claims rows.
    if (claimBusyRef.current) return;
    claimBusyRef.current = true;
    setClaimingKey(itemKey);

    try {
      if (data.character_stats.gold >= cost) {
        const newStats = {
          ...data.character_stats,
          gold: data.character_stats.gold - cost
        };

        const newPurchasedItems = (data.purchased_items || 0) + 1;
        updateStatsAndJournal(newStats, data.journal_logs, newPurchasedItems);
        logAction(activeUserId, data.week_starting_date, 'purchase', `Claimed reward: ${itemName}`, 0, -cost);

        // Insert with user_id so each user's claims are independent
        const { error } = await supabase.from('reward_claims').insert({
          app_user_id: activeUserId,
          item_key: itemKey,
          item_name: itemName,
          cost: cost,
          status: 'pending'
        });

        if (error) {
          console.error("Failed to queue reward:", error);
          alert("Error queuing reward, but gold was deducted. Please tell Tatay!");
        } else {
          playCoins();
          setToast({ show: true, message: `Successfully claimed: ${itemName}!` });
          fetchMyClaims();
        }
      } else {
        const short = cost - data.character_stats.gold;
        alert(`❌ Not enough Gold! You need 🪙 ${short} more gold to claim this.`);
      }
    } finally {
      claimBusyRef.current = false;
      setClaimingKey(null);
    }
  };

  if (!hydrated) {
    return <div className="min-h-screen bg-[#0a0807]" />;
  }

  if (!activeUserId) {
    return <SplashScreen onSelect={handleUserSelect} onAdminSelect={handleAdminSelect} />;
  }

  if (loading) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading realm...</div>;
  }

  if (splashAdminMode && !adminOpen) {
    setAdminOpen(true);
    setSplashAdminMode(false);
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">✨ Great job checking in!</h1>
          <p className="text-gray-400">Your study package for the week is currently being prepared.</p>
        </div>
      </div>
    );
  }

  const currentDayName = format(new Date(), 'EEEE');
  const packageData = typeof data.package_data === 'string' && data.package_data.trim() !== ''
    ? JSON.parse(data.package_data)
    : (data.package_data || {});

  const rotationScreen = (
    <div className="landscape-only fixed inset-0 z-[999] bg-black flex-col items-center justify-center text-center p-8" style={{ display: 'none' }}>
      <div className="text-6xl mb-6">📱</div>
      <h2 className="text-white text-2xl font-bold mb-3">Rotate Your Device</h2>
      <p className="text-gray-400 text-sm">G5 Learning Hall works best in landscape mode. Please rotate your phone sideways to continue.</p>
      <div className="mt-8 text-4xl animate-bounce">↻</div>
    </div>
  );

  if (adminOpen) {
    return (
      <>
        {rotationScreen}
        <div className="app-content">
          <AdminDashboard
            currentData={data}
            currentSunday={currentSunday}
            onUpdateStats={updateStatsAndJournal}
            onBack={() => setAdminOpen(false)}
          />
        </div>
      </>
    );
  }

  return (
    <>
      {rotationScreen}
      <div className="app-content">
        <div className="min-h-screen bg-black text-white flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className={`relative bg-neutral-950 border-r border-neutral-800 transition-all duration-300 ${sidebarOpen ? 'w-full md:w-80 p-6 overflow-y-auto' : 'w-12 h-12 md:h-auto p-0 overflow-visible'}`}>
        {/* Toggle button */}
        <button
          onClick={toggleSidebar}
          className="absolute top-4 right-2 z-10 bg-neutral-800 hover:bg-neutral-700 text-gray-400 hover:text-white rounded-full w-7 h-7 flex items-center justify-center text-sm transition-colors"
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>
        {sidebarOpen && (
          <>
            <HeroProfile userId={activeUserId} stats={data.character_stats} currentDay={currentDayName} />
            <GuildJournal
              userId={activeUserId}
              journalLogs={data.journal_logs || {}}
              stats={data.character_stats}
              currentSunday={data.week_starting_date}
              onSave={updateStatsAndJournal}
            />
            <DailyChecklist
              userId={activeUserId}
              currentSunday={data.week_starting_date}
              currentDayName={currentDayName}
              packageData={data.package_data}
              journalLogs={data.journal_logs}
              masteredQuizzes={data.mastered_quizzes}
              onGoldAwarded={applyGoldDelta}
            />
            {activeEvent && (
              <EventPanel
                event={activeEvent}
                eventQuests={eventQuests}
                progress={eventProgress}
                claimed={eventClaimed}
                onPlayQuest={(eventQuestId) => {
                  setActiveTab('board');
                  setActiveQuest(null);
                  setActiveEventQuest(eventQuestId);
                  setEventQuizPhase('ready');
                }}
              />
            )}
          </>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto relative">
        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-800 mb-8 space-x-2">
          {[
            { id: 'board',   label: 'Main Quests' },
            { id: 'vault',   label: 'Rewards Vault' },
            { id: 'guilds',  label: 'Learning Guilds' },
            { id: 'monster', label: 'Curio Arena' },
            { id: 'log',     label: 'Logs' },
          ].map(tab => (
            <GameButton
              key={tab.id}
              onClick={() => { playPageFlip(); setActiveTab(tab.id); setActiveQuest(null); setActiveEventQuest(null); }}
              className={`px-4 py-2.5 font-bold text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-500 text-blue-400'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-neutral-900 theme-tala:hover:bg-pink-900/20 rounded-t'
              }`}
            >
              {tab.label}
            </GameButton>
          ))}
        </div>

        {/* --- TAB A: QUEST BOARD --- */}
        {activeTab === 'board' && activeQuest === null && activeEventQuest === null && (
          <div>
            <h1 className="text-3xl font-bold mb-2 font-display">🗺️ Active Campaign Map</h1>
            <p className="text-gray-400 mb-8">Select an open, active quest card from the schedule below to begin your training.</p>

            {activeEvent && (
              <div className="mb-8">
                <div className="mb-4 border border-amber-800 rounded-lg overflow-hidden">
                  <div className="p-4 font-bold bg-amber-900/20 text-amber-400">
                    🎪 {activeEvent.title} — Event Quests
                  </div>
                  <div className="p-4 bg-black">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {eventQuests.map((q) => {
                        const isQuestMastered = eventProgress.some(p => p.event_quest_id === q.id && p.is_mastered);
                        return (
                          <div key={q.id} className="bg-[#111] border border-amber-900/50 p-5 rounded-xl">
                            <h3 className="text-lg font-bold mb-3">{q.subject_name}</h3>
                            {isQuestMastered ? (
                              <div className="text-sm text-green-400 mb-2">✅ Quest Completed</div>
                            ) : (
                              <div className="text-sm text-yellow-500 mb-2">⚠️ Quest Available</div>
                            )}
                            <div className="text-xs text-gray-400 mb-4"><img src="/icons/rewards/gift.svg" alt="Gift" className="inline w-4 h-4 align-[-2px]" /> Event reward on full completion</div>
                            <GameButton
                              onClick={() => {
                                setActiveEventQuest(q.id);
                                setEventQuizPhase('ready');
                              }}
                              disabled={isQuestMastered}
                              className="w-full bg-amber-800 hover:bg-amber-700 py-2 rounded font-bold transition-colors text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-amber-800"
                            >
                              {isQuestMastered ? '🔒 Completed' : '📜 Enter Module'}
                            </GameButton>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {WEEKDAYS.map((day) => {
              const isToday = currentDayName === day;
              const daySubjects = packageData[day] || {};
              const subjectKeys = Object.keys(daySubjects);
              const dayFullyMastered = subjectKeys.length > 0 &&
                subjectKeys.every((subjectName) => (data.mastered_quizzes || []).includes(`${day}_${subjectName}`));

              return (
                <div key={day} className={`mb-4 border border-neutral-800 rounded-lg overflow-hidden ${isToday ? 'border-blue-900' : ''}`}>
                  <div className={`p-4 font-bold ${isToday ? 'bg-blue-900/20 text-blue-400' : 'bg-neutral-900 text-gray-300'}`}>
                    📆 {day} Objectives {isToday && '⚡ (CURRENT RUN)'}
                  </div>

                  {dayFullyMastered ? (
                    <div className="p-4 bg-black">
                      <p className="text-sm text-green-400 font-bold">✅ {day} Quests Completed</p>
                    </div>
                  ) : isToday || subjectKeys.length > 0 ? (
                    <div className="p-4 bg-black">
                      {subjectKeys.length === 0 ? (
                        <p className="text-sm text-gray-500">No quests registered for this specific calendar path.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {subjectKeys.map((subjectName) => (
                            <div key={subjectName} className="bg-[#111] border border-[#333] p-5 rounded-xl">
                              <h3 className="text-lg font-bold mb-3">{subjectName}</h3>
                              {(() => {
                                const isQuestMastered = (data.mastered_quizzes || []).includes(`${day}_${subjectName}`);
                                return (
                                  <>
                                    {isQuestMastered ? (
                                      <div className="text-sm text-green-400 mb-2">✅ Quest Completed</div>
                                    ) : (
                                      <div className="text-sm text-yellow-500 mb-2">⚠️ Quest Available</div>
                                    )}
                                    <div className="text-xs text-gray-400 mb-4"><img src="/icons/rewards/gift.svg" alt="Gift" className="inline w-4 h-4 align-[-2px]" /> Loot: up to 200 XP | 50 Gold</div>
                                    <GameButton
                                      onClick={() => {
                                        setActiveQuest(`${day}_${subjectName}`);
                                        setQuizPhase('ready');
                                      }}
                                      disabled={isQuestMastered}
                                      className="w-full bg-neutral-800 hover:bg-neutral-700 py-2 rounded font-bold transition-colors text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-neutral-800"
                                    >
                                      {isQuestMastered ? '🔒 Completed' : '📜 Enter Module'}
                                    </GameButton>
                                  </>
                                );
                              })()}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}

            <AchievementsBoard data={data} />
          </div>
        )}

        {/* --- ACTIVE QUEST VIEW --- */}
        {activeTab === 'board' && activeQuest !== null && (() => {
          const [day, subject] = activeQuest.split('_');
          const questData = packageData[day]?.[subject];

          return (
            <div className="w-full max-w-4xl mx-auto animate-in fade-in duration-500">
              {quizPhase === 'study' && (
                <div className="space-y-6">
                  <GameButton
                    onClick={() => { setActiveQuest(null); setQuizPhase('study'); }}
                    className="text-gray-400 hover:text-white flex items-center text-sm font-bold transition-colors"
                  >
                    ← Retreat to Map
                  </GameButton>

                  <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-xl shadow-lg">
                    <h2 className="text-3xl font-bold mb-6 text-blue-400 font-display">📚 Study Session: {subject}</h2>
                    <div className="text-gray-300 leading-relaxed whitespace-pre-wrap border-t border-neutral-800 pt-6">
                      {questData?.summary_markdown || "No notes available for this module."}
                    </div>
                  </div>

                  <GameButton
                    onClick={() => setQuizPhase('ready')}
                    className="w-full bg-yellow-600 hover:bg-yellow-500 text-black py-4 rounded-lg font-bold text-lg transition-all transform hover:scale-[1.01]"
                  >
                    I Am Ready To Fight
                  </GameButton>
                </div>
              )}

              {quizPhase === 'ready' && (
                <div className="bg-[#111] border border-neutral-800 p-12 rounded-2xl text-center shadow-2xl">
                  <p className="text-blue-400 font-bold uppercase tracking-wider text-sm mb-2 font-display">{subject} Encounter</p>
                  <h2 className="text-4xl font-display font-bold mb-4">Prepare for Battle</h2>
                  <p className="text-gray-400 mb-8 max-w-sm mx-auto">
                    You are about to start the assessment. Once you enter the exam, there is no turning back.
                  </p>
                  <div className="flex gap-4 justify-center">
                    <GameButton
                      onClick={() => setQuizPhase('study')}
                      className="px-6 py-3 text-gray-400 hover:text-white font-bold"
                    >
                      Go Back to Notes
                    </GameButton>
                    <GameButton
                      onClick={() => setQuizPhase('quiz')}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold transition-all"
                    >
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
                      if (newStats.level > data.character_stats.level) {
                        logAction(activeUserId, data.week_starting_date, 'achievement', `🎉 Leveled up to Level ${newStats.level}!`, 0, 0);
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
        })()}

        {/* --- ACTIVE EVENT QUEST VIEW --- */}
        {activeTab === 'board' && activeEventQuest !== null && activeEvent && (() => {
          const eventQuest = eventQuests.find(q => q.id === activeEventQuest);
          const questRow = eventProgress.find(p => p.event_quest_id === activeEventQuest);

          const handleEventQuizSubmit = (isPerfect: boolean, newAttempts: number, newStats: CharacterStats, xpEarned: number, goldEarned: number) => {
            if (!activeUserId || !activeEvent || !eventQuest) return;
            if (isPerfect) {
              updateStatsAndJournal(newStats, data.journal_logs);
              logAction(activeUserId, data.week_starting_date, 'event_quiz', `Completed event quest ${eventQuest.subject_name} in ${newAttempts} attempt(s)`, xpEarned, goldEarned);
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
                  const granted = await claimEventReward(activeUserId, activeEvent.id);
                  if (granted) {
                    setEventClaimed(true);
                    playCoins();
                    setToast({ show: true, message: `🎁 Event reward claimed! Check your Curio Arena collection.` });
                    logAction(activeUserId, data.week_starting_date, 'event_reward', `Completed event: ${activeEvent.title}`, 0, 0);
                  }
                }
              }
            })();
          };

          return (
            <div className="w-full max-w-4xl mx-auto animate-in fade-in duration-500">
              {eventQuizPhase === 'study' && (
                <div className="space-y-6">
                  <GameButton
                    onClick={() => { setActiveEventQuest(null); setEventQuizPhase('study'); }}
                    className="text-gray-400 hover:text-white flex items-center text-sm font-bold transition-colors"
                  >
                    ← Retreat to Map
                  </GameButton>

                  <div className="bg-neutral-900 border border-amber-900 p-8 rounded-xl shadow-lg">
                    <h2 className="text-3xl font-bold mb-6 text-amber-400 font-display">📚 Study Session: {eventQuest?.subject_name}</h2>
                    <div className="text-gray-300 leading-relaxed whitespace-pre-wrap border-t border-neutral-800 pt-6">
                      {eventQuest?.summary_markdown || "No notes available for this module."}
                    </div>
                  </div>

                  <GameButton
                    onClick={() => setEventQuizPhase('ready')}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-black py-4 rounded-lg font-bold text-lg transition-all transform hover:scale-[1.01]"
                  >
                    I Am Ready To Fight
                  </GameButton>
                </div>
              )}

              {eventQuizPhase === 'ready' && (
                <div className="bg-[#111] border border-amber-900 p-12 rounded-2xl text-center shadow-2xl">
                  <p className="text-amber-400 font-bold uppercase tracking-wider text-sm mb-2 font-display">{eventQuest?.subject_name} Encounter</p>
                  <h2 className="text-4xl font-display font-bold mb-4">Prepare for Battle</h2>
                  <p className="text-gray-400 mb-8 max-w-sm mx-auto">
                    You are about to start the event assessment. Once you enter the exam, there is no turning back.
                  </p>
                  <div className="flex gap-4 justify-center">
                    <GameButton
                      onClick={() => setEventQuizPhase('study')}
                      className="px-6 py-3 text-gray-400 hover:text-white font-bold"
                    >
                      Go Back to Notes
                    </GameButton>
                    <GameButton
                      onClick={() => setEventQuizPhase('quiz')}
                      className="bg-amber-600 hover:bg-amber-500 text-white px-8 py-3 rounded-lg font-bold transition-all"
                    >
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
                  onQuizSubmit={handleEventQuizSubmit}
                  onExit={() => {
                    setActiveEventQuest(null);
                    setEventQuizPhase('study');
                  }}
                />
              )}
            </div>
          );
        })()}

        {/* --- TAB B: REWARDS VAULT / SHOP --- */}
        {activeTab === 'vault' && !USERS[activeUserId].isFamily && (
          <MonsterShop
            userId={activeUserId}
            currentStats={data.character_stats}
            onSpendGold={(newStats) => updateStatsAndJournal(newStats, data.journal_logs)}
          />
        )}

        {activeTab === 'vault' && USERS[activeUserId].isFamily && (
          <div>
            <h1 className="text-3xl font-bold mb-8 font-display">🏪 The Gold Token Rewards Vault</h1>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {Object.entries(VAULT_CATALOG).map(([key, item]) => (
                <div key={key} className="bg-[#111] border border-[#333] p-6 rounded-xl flex flex-col justify-between h-full">
                  <div>
                    <h3 className="text-xl font-bold mb-2">{item.name}</h3>
                    <h4 className="text-yellow-400 font-bold mb-4"><img src="/icons/rewards/gold_coin.svg" alt="Gold" className="inline w-4 h-4 align-[-2px]" /> {item.cost} Gold</h4>
                    <p className="text-sm text-gray-400 mb-6">{item.desc}</p>
                  </div>
                  <motion.button
                    onClick={() => handleClaimReward(item.cost, item.name, key)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-2 px-4 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={data.character_stats.gold < item.cost || claimingKey === key}
                  >
                    {claimingKey === key ? 'Claiming...' : data.character_stats.gold >= item.cost ? 'Claim Reward' : 'Not Enough Gold'}
                  </motion.button>
                </div>
              ))}
            </div>

            {/* Monster Arena Shop for family too */}
            <div className="mt-12">
              <MonsterShop
                userId={activeUserId}
                currentStats={data.character_stats}
                onSpendGold={(newStats) => updateStatsAndJournal(newStats, data.journal_logs)}
              />
            </div>

            {/* My Claimed Rewards — filtered to this user */}
            <div className="mt-10 bg-neutral-900 border border-neutral-800 p-6 rounded-xl">
              <h2 className="text-xl font-bold mb-4"><img src="/icons/rewards/package.svg" alt="Package" className="inline w-4 h-4 align-[-2px]" /> My Claimed Rewards</h2>

              {(() => {
                const countOf = (key: string) => myClaims.filter(c => c.item_key === key).length;
                const pendingCountOf = (key: string) => myClaims.filter(c => c.item_key === key && c.status === 'pending').length;
                const voucherCount = countOf('voucher_30m');
                const aiLordingCount = countOf('ai_lording');
                const jollibeeCount = countOf('jollibee_burger');
                // Tatay marks a claim "supplied" only after the hours have already
                // been used (usually Fri/Sat), so remaining claimable hours are the
                // ones still pending — not yet spent.
                const totalClaimableHours = (pendingCountOf('voucher_30m') + pendingCountOf('ai_lording')) * 0.5;
                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 text-sm">
                    <div className="bg-black p-3 rounded border border-neutral-800">
                      <p className="text-gray-500 text-xs">🎮 Gaming Voucher</p>
                      <p className="font-bold text-white">{voucherCount}</p>
                    </div>
                    <div className="bg-black p-3 rounded border border-neutral-800">
                      <p className="text-gray-500 text-xs">🧙‍♂️ AI Lording</p>
                      <p className="font-bold text-white">{aiLordingCount}</p>
                    </div>
                    <div className="bg-black p-3 rounded border border-neutral-800">
                      <p className="text-gray-500 text-xs">🍔 Jollibee Yumburger</p>
                      <p className="font-bold text-white">{jollibeeCount}</p>
                    </div>
                    <div className="bg-black p-3 rounded border border-neutral-800">
                      <p className="text-gray-500 text-xs">⏱️ Total Claimable Hours</p>
                      <p className="font-bold text-yellow-400">{totalClaimableHours}</p>
                      <p className="text-[10px] text-gray-600 mt-0.5">still unused, spend by Saturday</p>
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {myClaims.length > 0 ? (
                  [...myClaims]
                    .sort((a, b) => {
                      if (a.status === 'pending' && b.status !== 'pending') return -1;
                      if (a.status !== 'pending' && b.status === 'pending') return 1;
                      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                    })
                    .map((claim) => (
                    <div key={claim.id} className="flex justify-between items-center bg-black p-3 rounded border border-neutral-800">
                      <div>
                        <p className="font-bold">{claim.item_name}</p>
                        <p className="text-xs text-gray-500">{new Date(claim.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                        claim.status === 'pending'
                          ? 'bg-yellow-900 text-yellow-300'
                          : 'bg-green-900 text-green-300'
                      }`}>
                        {claim.status}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm italic">No rewards claimed yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- TAB: SIDE QUEST GUILDS --- */}
        {activeTab === 'guilds' && (
          <div>
            {activeGuild === null ? (
              <div className="battle-panel-in">
                <h1 className="text-3xl font-bold mb-8 font-display">⚔️ Side Quest Guilds</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {([
                    { key: 'lorekeeper' as GuildKey, guild: 'lorekeeper' as const, name: 'Lorekeeper', desc: 'English guild — Time Attack reading & grammar challenges.', bg: 'bg-[#121a16]', border: 'border-emerald-800 hover:border-emerald-500', title: 'text-emerald-300', lvl: guildProfile?.lorekeeper_lvl },
                    { key: 'spellcaster' as GuildKey, guild: 'spellcaster' as const, name: 'SpellCaster', desc: 'Typing guild — Real-time speed spelling under the clock.', bg: 'bg-[#13111c]', border: 'border-violet-800 hover:border-violet-500', title: 'text-violet-300', lvl: guildProfile?.spellcaster_lvl },
                    { key: 'number_realm' as GuildKey, guild: 'numberrealm' as const, name: 'Number Realm', desc: 'Math guild — Fractions, time, and operations at speed.', bg: 'bg-[#0d0c08]', border: 'border-amber-800 hover:border-amber-500', title: 'text-amber-300', lvl: guildProfile?.number_realm_lvl },
                    { key: 'logic_labyrinth' as GuildKey, guild: 'logiclabyrinth' as const, name: 'Logic Labyrinth', desc: 'IQ guild — Pattern matrices and deduction puzzles.', bg: 'bg-[#0b0d12]', border: 'border-cyan-800 hover:border-cyan-500', title: 'text-cyan-300', lvl: guildProfile?.logic_labyrinth_lvl },
                    { key: 'lexicon_arena' as GuildKey, guild: 'lexiconarena' as const, name: 'Lexicon Arena', desc: 'Spelling guild — Read the definition, pick the correct spelling before time runs out.', bg: 'bg-neutral-900', border: 'border-indigo-800 hover:border-indigo-500', title: 'text-indigo-300', lvl: guildProfile?.lexicon_arena_lvl },
                  ]).map(g => (
                    <motion.button
                      key={g.key}
                      onClick={() => setActiveGuild(g.key)}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className={`${g.bg} border-2 ${g.border} rounded-xl p-6 text-left transition-colors flex items-center gap-4`}
                    >
                      <div className="w-16 h-16 shrink-0">
                        <GuardianSprite guild={g.guild} pose="idle" className="w-full h-full" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className={`text-xl font-bold ${g.title} font-display mb-1`}>{g.name}</h3>
                          {typeof g.lvl === 'number' && (
                            <span className={`text-xs font-mono font-bold ${g.title} bg-black/40 rounded-full px-2 py-0.5 shrink-0`}>Lvl {g.lvl}</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400">{g.desc}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            ) : activeGuild === 'lorekeeper' ? (
              <Lorekeeper
                userId={activeUserId}
                weekStartingDate={data.week_starting_date}
                currentStats={data.character_stats}
                onGoldEarned={(newStats) => {
                  markGuildSessionToday(activeUserId, activeGuild, format(new Date(), 'yyyy-MM-dd'));
                  updateStatsAndJournal(
                    newStats, data.journal_logs,
                    data.purchased_items, data.mastery_count, data.honor_grants,
                    data.quiz_attempts || {}, data.mastered_quizzes || [],
                    data.honor_grants,
                    (data.guild_sessions_count || 0) + 1,
                    data.monster_battles_won || 0,
                    data.sibling_battles_won || 0,
                    data.perfect_quizzes || 0
                  );
                }}
                onExit={() => setActiveGuild(null)}
              />
            ) : activeGuild === 'spellcaster' ? (
              <SpellCaster
                userId={activeUserId}
                weekStartingDate={data.week_starting_date}
                currentStats={data.character_stats}
                onGoldEarned={(newStats) => {
                  markGuildSessionToday(activeUserId, activeGuild, format(new Date(), 'yyyy-MM-dd'));
                  updateStatsAndJournal(
                    newStats, data.journal_logs,
                    data.purchased_items, data.mastery_count, data.honor_grants,
                    data.quiz_attempts || {}, data.mastered_quizzes || [],
                    data.honor_grants,
                    (data.guild_sessions_count || 0) + 1,
                    data.monster_battles_won || 0,
                    data.sibling_battles_won || 0,
                    data.perfect_quizzes || 0
                  );
                }}
                onExit={() => setActiveGuild(null)}
              />
            ) : activeGuild === 'number_realm' ? (
              <NumberRealm
                userId={activeUserId}
                weekStartingDate={data.week_starting_date}
                currentStats={data.character_stats}
                onGoldEarned={(newStats) => {
                  markGuildSessionToday(activeUserId, activeGuild, format(new Date(), 'yyyy-MM-dd'));
                  updateStatsAndJournal(
                    newStats, data.journal_logs,
                    data.purchased_items, data.mastery_count, data.honor_grants,
                    data.quiz_attempts || {}, data.mastered_quizzes || [],
                    data.honor_grants,
                    (data.guild_sessions_count || 0) + 1,
                    data.monster_battles_won || 0,
                    data.sibling_battles_won || 0,
                    data.perfect_quizzes || 0
                  );
                }}
                onExit={() => setActiveGuild(null)}
              />
            ) : activeGuild === 'logic_labyrinth' ? (
              <LogicLabyrinth
                userId={activeUserId}
                weekStartingDate={data.week_starting_date}
                currentStats={data.character_stats}
                onGoldEarned={(newStats) => {
                  markGuildSessionToday(activeUserId, activeGuild, format(new Date(), 'yyyy-MM-dd'));
                  updateStatsAndJournal(
                    newStats, data.journal_logs,
                    data.purchased_items, data.mastery_count, data.honor_grants,
                    data.quiz_attempts || {}, data.mastered_quizzes || [],
                    data.honor_grants,
                    (data.guild_sessions_count || 0) + 1,
                    data.monster_battles_won || 0,
                    data.sibling_battles_won || 0,
                    data.perfect_quizzes || 0
                  );
                }}
                onExit={() => setActiveGuild(null)}
              />
            ) : activeGuild === 'lexicon_arena' ? (
              <LexiconArena
                userId={activeUserId}
                weekStartingDate={data.week_starting_date}
                currentStats={data.character_stats}
                onGoldEarned={(newStats) => {
                  markGuildSessionToday(activeUserId, activeGuild, format(new Date(), 'yyyy-MM-dd'));
                  updateStatsAndJournal(
                    newStats, data.journal_logs,
                    data.purchased_items, data.mastery_count, data.honor_grants,
                    data.quiz_attempts || {}, data.mastered_quizzes || [],
                    data.honor_grants,
                    (data.guild_sessions_count || 0) + 1,
                    data.monster_battles_won || 0,
                    data.sibling_battles_won || 0,
                    data.perfect_quizzes || 0
                  );
                }}
                onExit={() => setActiveGuild(null)}
              />
            ) : null}
          </div>
        )}

        {/* --- TAB: PLAYER LOG --- */}
        {activeTab === 'log' && (
          <div>
            <h1 className="text-3xl font-bold mb-8 font-display">📖 Player Log</h1>
            <PlayerLog userId={activeUserId} />
          </div>
        )}

        {/* --- TAB: ADMIN --- */}

        {activeTab === 'monster' && (
          <MonsterGuild
            userId={activeUserId}
            playerLevel={data.character_stats.level}
            packageData={packageData}
            liveBattleInbox={liveBattleInbox}
            pendingLiveBattleId={pendingLiveBattleId}
            onConsumePendingLiveBattle={() => setPendingLiveBattleId(null)}
            onBattleWon={(kind) => updateStatsAndJournal(
              data.character_stats, data.journal_logs,
              data.purchased_items, data.mastery_count, data.honor_grants,
              data.quiz_attempts || {}, data.mastered_quizzes || [],
              data.honor_grants,
              data.guild_sessions_count || 0,
              (data.monster_battles_won || 0) + (kind === 'trainer' ? 1 : 0),
              (data.sibling_battles_won || 0) + (kind === 'sibling' ? 1 : 0),
              data.perfect_quizzes || 0,
              (data.dummy_battles_won || 0) + (kind === 'dummy' ? 1 : 0)
            )}
          />
        )}

        {liveBattleInbox.incomingInvite && (
          <LiveBattleInviteToast
            fromName={liveBattleInbox.incomingInvite.fromName}
            onAccept={handleAcceptLiveBattleInvite}
            onDecline={handleDeclineLiveBattleInvite}
          />
        )}

        <AchievementToast
          userId={activeUserId}
          newlyUnlocked={newlyUnlocked}
          onDismissAll={clearNotifications}
        />
        <Toast
          message={toast.message}
          show={toast.show}
          onClose={() => setToast({ show: false, message: '' })}
        />
        {showEventPopup && activeEvent && (
          <EventAnnouncementPopup event={activeEvent} onDismiss={handleDismissEventPopup} />
        )}

        {/* ── Back to Splash Screen button ── fixed bottom-right of the dashboard */}
        <motion.button
          onClick={handleSwitchUser}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="fixed bottom-6 right-6 z-50 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-neutral-500 text-gray-400 hover:text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-lg transition-colors flex items-center gap-2"
          title="Switch Hero"
        >
          <span>🏠</span>
          <span>Switch Hero</span>
        </motion.button>
      </main>
    </div>
      </div>
    </>
  );
}
