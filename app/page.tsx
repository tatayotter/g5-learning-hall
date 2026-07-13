// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useWeeklyData, CharacterStats } from '@/hooks/useWeeklyData'; // Add CharacterStats here
import HeroProfile from '@/components/HeroProfile';
import GuildJournal from '@/components/GuildJournal';
import QuestModule from '@/components/QuestModule'; // Add this line!
import { format } from 'date-fns';
import AdminPanel from '@/components/AdminPanel';
import AchievementsBoard from '@/components/AchievementsBoard';
import { supabase } from '@/lib/supabase';
import PlayerLog from '@/components/PlayerLog';
import { logAction } from '@/lib/playerlog';
import { playCoins, playPageFlip } from '@/lib/sounds';
import Toast from '@/components/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import GameButton from '@/components/GameButton';

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
  const { data, loading, updateStatsAndJournal } = useWeeklyData();
  const [activeTab, setActiveTab] = useState('board');
  const [activeQuest, setActiveQuest] = useState<string | null>(null);
  const [quizPhase, setQuizPhase] = useState<'study' | 'ready' | 'quiz'>('study');
  const [myClaims, setMyClaims] = useState<any[]>([]);
  const [toast, setToast] = useState({ show: false, message: '' });

// Function to fetch the list of claims
const fetchMyClaims = async () => {
  const { data } = await supabase
    .from('reward_claims')
    .select('*')
    .order('created_at', { ascending: false });
  if (data) setMyClaims(data);
};

// Hook to load the list when the page opens
useEffect(() => {
  fetchMyClaims();
}, []);
  const handleClaimReward = async (cost: number, itemName: string, itemKey: string) => {
    console.log("Current Data from Supabase:", data);
    if (!data) return;
    
    if (data.character_stats.gold >= cost) {
      // 1. Deduct the gold
      const newStats = { 
        ...data.character_stats, 
        gold: data.character_stats.gold - cost 
      };

      // 2. Count this purchase
      const newPurchasedItems = (data.purchased_items || 0) + 1;
      
      // 3. Save to Supabase (Weekly Packages)
      updateStatsAndJournal(newStats, data.journal_logs, newPurchasedItems);

      // 4. Log this purchase (Player Log)
      logAction(data.week_starting_date, 'purchase', `Claimed reward: ${itemName}`, 0, -cost);

      // 5. Add to the Reward Fulfillment Queue
      const { error } = await supabase.from('reward_claims').insert({
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

  if (loading) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading realm...</div>;
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

  return (
    <div className="min-h-screen bg-black text-white flex flex-col md:flex-row">
  {/* Sidebar: Always stays, keeping the UI consistent */}
  <aside className="w-full md:w-80 bg-neutral-950 border-r border-neutral-800 p-6 overflow-y-auto">
    <HeroProfile stats={data.character_stats} currentDay={currentDayName} />
    <GuildJournal 
      journalLogs={data.journal_logs || {}} 
      stats={data.character_stats} 
      currentSunday={data.week_starting_date}
      onSave={updateStatsAndJournal} 
    />
  </aside>  

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-800 mb-8 space-x-2">
          {[
            { id: 'board', label: '🏰 Quest Board Landing Hub' },
            { id: 'vault', label: '🏪 The Gold Token Rewards Vault' },
            { id: 'log', label: '📖 Player Log' },
            { id: 'admin', label: '🔑 Tatay Admin' }
          ].map(tab => (
            <GameButton
              key={tab.id}
              onClick={() => { playPageFlip(); setActiveTab(tab.id); setActiveQuest(null); }}
              className={`px-4 py-3 font-extrabold uppercase tracking-wider text-sm transition-colors ${
                activeTab === tab.id 
                  ? 'border-b-2 border-blue-500 text-blue-400' 
                  : 'text-gray-500 hover:text-gray-300 hover:bg-neutral-900 rounded-t'
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
    setQuizPhase('ready'); // Skip straight to "Prepare for Battle"
  }}
  disabled={isQuestMastered}
  className="w-full bg-neutral-800 hover:bg-neutral-700 py-2 rounded font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-neutral-800"
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
  // 1. Extract the data for the specific quest selected
  const [day, subject] = activeQuest.split('_');
  const questData = packageData[day]?.[subject];

  return (
    <div className="w-full max-w-4xl mx-auto animate-in fade-in duration-500">
      
      {/* PHASE 1: STUDY SESSION */}
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
            
            {/* Displaying the Summary Markdown */}
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

      {/* PHASE 2: ARE YOU SURE? */}
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

      {/* Phase 3: QUIZ PROPER */}
{quizPhase === 'quiz' && (
  <QuestModule 
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
        updateStatsAndJournal(newStats, data.journal_logs, data.purchased_items, newMasteryCount, data.honor_grants, newQuizAttempts, newMasteredQuizzes);
        logAction(data.week_starting_date, 'quiz', `Completed ${subject} in ${newAttempts} attempt(s)`, xpEarned, goldEarned);
      } else {
        updateStatsAndJournal(data.character_stats, data.journal_logs, data.purchased_items, data.mastery_count, data.honor_grants, newQuizAttempts, data.mastered_quizzes);
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

{/* --- TAB B: REWARDS VAULT --- */}
        {activeTab === 'vault' && (
          <div>
            <h1 className="text-3xl font-bold mb-8 font-display">🏪 The Gold Token Rewards Vault</h1>
            
            {/* CATALOG GRID */}
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

            {/* 📦 MY CLAIMED REWARDS SECTION */}
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
            
          </div>
        )}
        {/* --- TAB: PLAYER LOG --- */}
        {activeTab === 'log' && (
          <div>
            <h1 className="text-3xl font-bold mb-8 font-display">📖 Player Log</h1>
            <PlayerLog />
          </div>
        )}

        {/* --- TAB C: ADMIN --- */}
     {activeTab === 'admin' && (
       <div>
         <h1 className="text-3xl font-bold mb-6 font-display">🔑 Tatay's Admin Control Panel</h1>
         <AdminPanel 
           currentData={data} 
           currentSunday={data.week_starting_date} 
           onUpdateStats={updateStatsAndJournal} 
         />
       </div>
     )}
     <Toast 
        message={toast.message} 
        show={toast.show} 
        onClose={() => setToast({ show: false, message: '' })} 
      />
      </main>
    </div>
  );
}