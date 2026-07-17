// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { UserId, getActiveUser, clearActiveUser, loadClassmates, loadFamilyProtection, loadAvatarOverrides, USERS } from '@/lib/userSession';
import SplashScreen from '@/components/SplashScreen';
import { useWeeklyData, CharacterStats } from '@/hooks/useWeeklyData';
import HeroProfile from '@/components/HeroProfile';
import GuildJournal from '@/components/GuildJournal';
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
import MonsterShop from '@/components/MonsterShop';

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
    }
  }, [activeUserId, hydrated]);

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

  const { data, loading, updateStatsAndJournal, currentSunday } = useWeeklyData(activeUserId ?? 'damien');
  const [activeTab, setActiveTab] = useState('board');
  const [splashAdminMode, setSplashAdminMode] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);  
  const [activeQuest, setActiveQuest] = useState<string | null>(null);
  const [activeGuild, setActiveGuild] = useState<string | null>(null);
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

  const handleClaimReward = async (cost: number, itemName: string, itemKey: string) => {
    if (!data || !activeUserId) return;

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
      <aside className={`relative bg-neutral-950 border-r border-neutral-800 overflow-y-auto transition-all duration-300 ${sidebarOpen ? 'w-full md:w-80 p-6' : 'w-12 p-0'}`}>
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
          </>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto relative">
        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-800 mb-8 space-x-2">
          {[
            { id: 'board',   label: '🏰 Main Quests' },
            { id: 'vault',   label: '🏪 Rewards Vault' },
            { id: 'guilds',  label: '⚔️ Learning Guilds' },
            { id: 'monster', label: '🐉 Monster Arena' },
            { id: 'log',     label: '📖 Logs' },
          ].map(tab => (
            <GameButton
              key={tab.id}
              onClick={() => { playPageFlip(); setActiveTab(tab.id); setActiveQuest(null); }}
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
        {activeTab === 'board' && activeQuest === null && (
          <div>
            <h1 className="text-3xl font-bold mb-2 font-display">🗺️ Active Campaign Map</h1>
            <p className="text-gray-400 mb-8">Select an open, active quest card from the schedule below to begin your training.</p>

            {WEEKDAYS.map((day) => {
              const isToday = currentDayName === day;
              const daySubjects = packageData[day] || {};
              const subjectKeys = Object.keys(daySubjects);

              return (
                <div key={day} className={`mb-4 border border-neutral-800 rounded-lg overflow-hidden ${isToday ? 'border-blue-900' : ''}`}>
                  <div className={`p-4 font-bold ${isToday ? 'bg-blue-900/20 text-blue-400' : 'bg-neutral-900 text-gray-300'}`}>
                    📆 {day} Objectives {isToday && '⚡ (CURRENT RUN)'}
                  </div>

                  {isToday || subjectKeys.length > 0 ? (
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
                                    <div className="text-xs text-gray-400 mb-4">🎁 Loot: up to 200 XP | 50 Gold</div>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.entries(VAULT_CATALOG).map(([key, item]) => (
                <div key={key} className="bg-[#111] border border-[#333] p-6 rounded-xl flex flex-col justify-between h-full">
                  <div>
                    <h3 className="text-xl font-bold mb-2">{item.name}</h3>
                    <h4 className="text-yellow-400 font-bold mb-4">🪙 {item.cost} Gold</h4>
                    <p className="text-sm text-gray-400 mb-6">{item.desc}</p>
                  </div>
                  <motion.button
                    onClick={() => handleClaimReward(item.cost, item.name, key)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-2 px-4 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={data.character_stats.gold < item.cost}
                  >
                    {data.character_stats.gold >= item.cost ? 'Claim Reward' : 'Not Enough Gold'}
                  </motion.button>
                </div>
              ))}
            </div>

            {/* My Claimed Rewards — filtered to this user */}
            <div className="mt-10 bg-neutral-900 border border-neutral-800 p-6 rounded-xl">
              <h2 className="text-xl font-bold mb-4">📦 My Claimed Rewards</h2>
              <div className="space-y-3">
                {myClaims.length > 0 ? (
                  myClaims.map((claim) => (
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

            {/* Monster Arena Shop for family too */}
            <div className="mt-12">
              <MonsterShop
                userId={activeUserId}
                currentStats={data.character_stats}
                onSpendGold={(newStats) => updateStatsAndJournal(newStats, data.journal_logs)}
              />
            </div>
          </div>
        )}

        {/* --- TAB: SIDE QUEST GUILDS --- */}
        {activeTab === 'guilds' && (
          <div>
            {activeGuild === null ? (
              <>
                <h1 className="text-3xl font-bold mb-8 font-display">⚔️ Side Quest Guilds</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <button
                    onClick={() => setActiveGuild('lorekeeper')}
                    className="bg-[#121a16] border-2 border-emerald-800 hover:border-emerald-500 rounded-xl p-6 text-left transition-colors"
                  >
                    <h3 className="text-xl font-bold text-emerald-300 font-display mb-1">📜 Lorekeeper</h3>
                    <p className="text-sm text-gray-400">English guild — Time Attack reading & grammar challenges.</p>
                  </button>
                  <button
                    onClick={() => setActiveGuild('spellcaster')}
                    className="bg-[#13111c] border-2 border-violet-800 hover:border-violet-500 rounded-xl p-6 text-left transition-colors"
                  >
                    <h3 className="text-xl font-bold text-violet-300 font-display mb-1">🧙‍♂️ SpellCaster</h3>
                    <p className="text-sm text-gray-400">Typing guild — Real-time speed spelling under the clock.</p>
                  </button>
                  <button
                    onClick={() => setActiveGuild('number_realm')}
                    className="bg-[#0d0c08] border-2 border-amber-800 hover:border-amber-500 rounded-xl p-6 text-left transition-colors"
                  >
                    <h3 className="text-xl font-bold text-amber-300 font-display mb-1">🔢 Number Realm</h3>
                    <p className="text-sm text-gray-400">Math guild — Fractions, time, and operations at speed.</p>
                  </button>
                  <button
                    onClick={() => setActiveGuild('logic_labyrinth')}
                    className="bg-[#0b0d12] border-2 border-cyan-800 hover:border-cyan-500 rounded-xl p-6 text-left transition-colors"
                  >
                    <h3 className="text-xl font-bold text-cyan-300 font-display mb-1">🧩 Logic Labyrinth</h3>
                    <p className="text-sm text-gray-400">IQ guild — Pattern matrices and deduction puzzles.</p>
                  </button>
                  <button
                    onClick={() => setActiveGuild('lexicon_arena')}
                    className="bg-neutral-900 border-2 border-indigo-800 hover:border-indigo-500 rounded-xl p-6 text-left transition-colors"
                  >
                    <h3 className="text-xl font-bold text-indigo-300 font-display mb-1">🧿 Lexicon Arena</h3>
                    <p className="text-sm text-gray-400">Spelling guild — Read the definition, pick the correct spelling before time runs out.</p>
                  </button>
                </div>
              </>
            ) : activeGuild === 'lorekeeper' ? (
              <Lorekeeper
                userId={activeUserId}
                weekStartingDate={data.week_starting_date}
                currentStats={data.character_stats}
                onGoldEarned={(newStats) => updateStatsAndJournal(
                  newStats, data.journal_logs,
                  data.purchased_items, data.mastery_count, data.honor_grants,
                  data.quiz_attempts || {}, data.mastered_quizzes || [],
                  data.honor_grants,
                  (data.guild_sessions_count || 0) + 1,
                  data.monster_battles_won || 0,
                  data.sibling_battles_won || 0,
                  data.perfect_quizzes || 0
                )}
                onExit={() => setActiveGuild(null)}
              />
            ) : activeGuild === 'spellcaster' ? (
              <SpellCaster
                userId={activeUserId}
                weekStartingDate={data.week_starting_date}
                currentStats={data.character_stats}
                onGoldEarned={(newStats) => updateStatsAndJournal(newStats, data.journal_logs)}
                onExit={() => setActiveGuild(null)}
              />
            ) : activeGuild === 'number_realm' ? (
              <NumberRealm
                userId={activeUserId}
                weekStartingDate={data.week_starting_date}
                currentStats={data.character_stats}
                onGoldEarned={(newStats) => updateStatsAndJournal(newStats, data.journal_logs)}
                onExit={() => setActiveGuild(null)}
              />
            ) : activeGuild === 'logic_labyrinth' ? (
              <LogicLabyrinth
                userId={activeUserId}
                weekStartingDate={data.week_starting_date}
                currentStats={data.character_stats}
                onGoldEarned={(newStats) => updateStatsAndJournal(newStats, data.journal_logs)}
                onExit={() => setActiveGuild(null)}
              />
            ) : activeGuild === 'lexicon_arena' ? (
              <LexiconArena
                userId={activeUserId}
                weekStartingDate={data.week_starting_date}
                currentStats={data.character_stats}
                onGoldEarned={(newStats) => updateStatsAndJournal(newStats, data.journal_logs)}
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
