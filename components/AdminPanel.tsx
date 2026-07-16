import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CharacterStats, WeeklyData } from '@/hooks/useWeeklyData';
import { logAction } from '@/lib/playerlog';
import { playBlessing } from '@/lib/sounds';
import DeedHistory from '@/components/DeedHistory';
import GuildPoolStats from '@/components/GuildPoolStats';
import GameButton from '@/components/GameButton';

interface AdminPanelProps {
  currentData: WeeklyData;
  currentSunday: string;
  onUpdateStats: (
    newStats: CharacterStats,
    logs: any,
    purchasedItems?: number,
    masteryCount?: number,
    honorGrants?: number
  ) => void;
}
function JournalEntry({ date, entry }: { date: string; entry: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-black border border-neutral-800 rounded-lg overflow-hidden">
      {/* Header row — always visible, click to expand */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex justify-between items-center p-4 text-left hover:bg-neutral-900 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-blue-400 font-bold font-mono text-sm">{date}</span>
          {!expanded && (
            <span className="text-gray-500 text-sm truncate max-w-[200px]">
              {entry.done_today || 'No entry'}
            </span>
          )}
        </div>
        <span className="text-gray-500 text-xs ml-2 shrink-0">
          {expanded ? '▲ collapse' : '▼ expand'}
        </span>
      </button>

      {/* Expanded full entry */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-neutral-800 pt-3">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">⚔️ What I did today</p>
            <p className="text-sm text-gray-200 leading-relaxed">{entry.done_today || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">📋 Tomorrow's plan</p>
            <p className="text-sm text-gray-200 leading-relaxed">{entry.tomorrow_plan || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">🧠 Hardest challenge</p>
            <p className="text-sm text-gray-200 leading-relaxed">{entry.hardest_challenge || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">🙏 Grateful for</p>
            <p className="text-sm text-gray-200 leading-relaxed">{entry.gratitude || '—'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
export default function AdminPanel({ currentData, currentSunday, onUpdateStats }: AdminPanelProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [claims, setClaims] = useState<any[]>([]); // New state for queue
  
  const [jsonPayload, setJsonPayload] = useState(
    typeof currentData.package_data === 'string' 
      ? currentData.package_data 
      : JSON.stringify(currentData.package_data || {}, null, 2)
  );
  
  const [stats, setStats] = useState<CharacterStats>(currentData.character_stats);
  const [deedName, setDeedName] = useState('');
  const [deedGold, setDeedGold] = useState('');

  // Fetch claims on mount
  useEffect(() => {
    const fetchClaims = async () => {
      const { data } = await supabase
        .from('reward_claims')
        .select('*')
        .eq('app_user_id', currentData.user_id)
        .order('created_at', { ascending: false });
      if (data) setClaims(data);
    };
    fetchClaims();
  }, []);

  const toggleStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'pending' ? 'supplied' : 'pending';
    await supabase.from('reward_claims').update({ status: newStatus }).eq('id', id);
    setClaims(claims.map(c => c.id === id ? { ...c, status: newStatus } : c));
  };

  const handleAwardDeed = () => {
    const amount = Number(deedGold);
    if (!deedName.trim() || !amount || amount <= 0) {
      alert('⚠️ Please enter a deed name and a valid gold amount.');
      return;
    }
    const newStats = { ...currentData.character_stats, gold: currentData.character_stats.gold + amount };
    const newHonorGrants = (currentData.honor_grants || 0) + 1;
    onUpdateStats(newStats, currentData.journal_logs, currentData.purchased_items, currentData.mastery_count, newHonorGrants);
    logAction(currentData.user_id, currentSunday, 'deed', deedName, 0, amount);
    playBlessing();
    alert(`✅ Awarded 🪙 ${amount} Gold for: ${deedName}`);
    setDeedName('');
    setDeedGold('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setIsAuthenticated(true);
      } else {
        alert('❌ Access Denied: Incorrect passcode!');
      }
    } catch (err) {
      alert('⚠️ Could not reach the server to verify passcode. Check your connection.');
    }
  };

  const handleSaveJSON = async () => {
    try {
      JSON.parse(jsonPayload);
      const { error } = await supabase
        .from('weekly_packages')
        .update({ package_data: jsonPayload })
        .eq('week_starting_date', currentSunday);
        
      if (error) throw error;
      alert('✅ Quest payload updated successfully! Please refresh the page to load the new map.');
    } catch (err: any) {
      alert(`❌ Invalid JSON or save error: ${err.message}`);
    }
  };

  const handleSaveStats = () => {
    // Normalize: roll any excess XP up into levels, same logic used everywhere else
    let normalizedXp = stats.xp;
    let normalizedLevel = stats.level;
    while (normalizedXp >= (500 + normalizedLevel * 100)) {
      normalizedXp -= (500 + normalizedLevel * 100);
      normalizedLevel += 1;
    }
    const normalizedStats = { ...stats, xp: normalizedXp, level: normalizedLevel };
    setStats(normalizedStats);
    onUpdateStats(normalizedStats, currentData.journal_logs);
    alert('✅ Character stats forcefully overwritten!');
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md bg-[#111] border border-red-900/50 p-8 rounded-xl">
        <h2 className="text-xl font-bold mb-4 text-red-500">🔒 Restricted Area</h2>
        <p className="text-sm text-gray-400 mb-6">Enter the master passcode to access the Tatay Dashboard.</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <input 
            type="password" 
            placeholder="Enter passcode..." 
            className="w-full bg-black border border-neutral-700 rounded p-2 focus:border-red-500 outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <GameButton type="submit" className="w-full bg-red-900 hover:bg-red-800 text-white font-bold py-2 rounded transition-colors">
            Unlock Admin Panel
          </GameButton>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-green-900/20 border border-green-800 p-4 rounded-lg text-green-400 font-bold mb-8">
        🔓 Admin Access Granted
      </div>

      {/* REWARD FULFILLMENT QUEUE */}
      <div className="bg-[#111] border border-[#333] p-6 rounded-xl">
        <h3 className="text-xl font-bold mb-4">📦 Reward Fulfillment Queue</h3>
        <div className="space-y-2">
          {claims.length > 0 ? claims.map((claim) => (
            <div key={claim.id} className="flex justify-between items-center bg-black border border-neutral-800 p-3 rounded-lg">
              <div>
                <p className="font-bold">{claim.item_name}</p>
                <p className="text-xs text-gray-500">{new Date(claim.created_at).toLocaleString()}</p>
              </div>
              <GameButton 
                onClick={() => toggleStatus(claim.id, claim.status)}
                className={`px-3 py-1 rounded text-xs font-bold ${claim.status === 'pending' ? 'bg-yellow-900 text-yellow-300' : 'bg-green-900 text-green-300'}`}
              >
                {claim.status === 'pending' ? 'Mark Supplied' : 'Supplied ✅'}
              </GameButton>
            </div>
          )) : <p className="text-gray-500 text-sm">No pending rewards.</p>}
        </div>
      </div>

      {/* AWARD POINTS FOR DEEDS */}
      <div className="bg-[#111] border border-[#333] p-6 rounded-xl">
        <h3 className="text-xl font-bold mb-4 font-display">🏅 Award Gold for a Good Deed</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Name of Deed</label>
            <input type="text" placeholder="e.g. Cleaned the garage" className="w-full bg-black border border-neutral-700 rounded p-2"
              value={deedName} onChange={e => setDeedName(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Gold Coins Amount</label>
            <input type="number" placeholder="e.g. 50" className="w-full bg-black border border-neutral-700 rounded p-2 font-mono text-yellow-500"
              value={deedGold} onChange={e => setDeedGold(e.target.value)} />
          </div>
        </div>
        <GameButton onClick={handleAwardDeed} className="bg-green-700 hover:bg-green-600 font-bold py-2 px-4 rounded transition-colors">
          🎉 Award Gold
        </GameButton>
      </div>

      {/* DEED HISTORY */}
      <div className="bg-[#111] border border-[#333] p-6 rounded-xl">
        <h3 className="text-xl font-bold mb-4 font-display">📅 Deed History</h3>
        <DeedHistory userId={currentData.user_id} />
      </div>

      {/* ... (rest of your existing sections remain the same) ... */}
      
      {/* STATS OVERRIDE */}
      <div className="bg-[#111] border border-[#333] p-6 rounded-xl">
        <h3 className="text-xl font-bold mb-4">⚙️ Manual Stat Override</h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Level</label>
            <input type="number" className="w-full bg-black border border-neutral-700 rounded p-2 font-mono" 
              value={stats.level} onChange={e => setStats({...stats, level: Number(e.target.value)})} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">XP</label>
            <input type="number" className="w-full bg-black border border-neutral-700 rounded p-2 font-mono" 
              value={stats.xp} onChange={e => setStats({...stats, xp: Number(e.target.value)})} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Gold</label>
            <input type="number" className="w-full bg-black border border-neutral-700 rounded p-2 text-yellow-500 font-mono" 
              value={stats.gold} onChange={e => setStats({...stats, gold: Number(e.target.value)})} />
          </div>
        </div>
        <GameButton onClick={handleSaveStats} className="bg-blue-600 hover:bg-blue-500 font-bold py-2 px-4 rounded transition-colors">
          Force Save Stats
        </GameButton>
      </div>

      {/* SIDE QUEST POOL STATUS */}
      <GuildPoolStats userId={currentData.user_id} />

      {/* QUIZ ATTEMPTS TRACKER */}
      <div className="bg-[#111] border border-[#333] p-6 rounded-xl">
        <h3 className="text-xl font-bold mb-4 font-display">📊 Quiz Attempts</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {Object.entries(currentData.quiz_attempts || {}).map(([key, count]) => {
            const isQuizMastered = (currentData.mastered_quizzes || []).includes(key);
            return (
              <div key={key} className="flex justify-between items-center bg-black border border-neutral-800 p-3 rounded-lg">
                <span className="font-bold">{key.replace('_', ' - ')}</span>
                <span className="flex items-center gap-3">
                  <span className="text-sm text-gray-400 font-mono">{count} attempt{count !== 1 ? 's' : ''}</span>
                  {isQuizMastered ? (
                    <span className="text-xs font-bold text-green-400 uppercase">✅ Mastered</span>
                  ) : (
                    <span className="text-xs font-bold text-gray-500 uppercase">In Progress</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* JOURNAL LEDGER */}
      <div className="bg-[#111] border border-neutral-800 p-6 rounded-xl">
        <h3 className="text-xl font-bold mb-4">📜 Journal Ledger</h3>
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {Object.entries(currentData.journal_logs || {}).length === 0 ? (
            <p className="text-gray-500 text-sm italic">No journal entries yet.</p>
          ) : (
            Object.entries(currentData.journal_logs || {})
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([date, entry]) => (
                <JournalEntry key={date} date={date} entry={entry} />
              ))
          )}
        </div>
      </div>

      {/* JSON PAYLOAD INJECTOR */}
      <div className="bg-[#111] border border-[#333] p-6 rounded-xl">
        <h3 className="text-xl font-bold mb-2">📜 Inject Weekly Quest Payload</h3>
        <textarea 
          className="w-full h-40 bg-black border border-neutral-700 rounded p-4 font-mono text-xs mb-4"
          value={jsonPayload}
          onChange={(e) => setJsonPayload(e.target.value)}
        />
        <GameButton onClick={handleSaveJSON} className="bg-red-800 hover:bg-red-700 font-bold py-3 px-6 rounded w-full">
          ⚠️ OVERWRITE WEEKLY DATABASE
        </GameButton>
      </div>
    </div>
  );
}