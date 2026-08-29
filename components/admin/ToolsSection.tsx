'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CharacterStats, WeeklyData } from '@/hooks/useWeeklyData';
import { logAction } from '@/lib/playerlog';
import { playBlessing } from '@/lib/sounds';
import DeedHistory from '@/components/DeedHistory';
import { callAdminApi } from '@/lib/adminApi';

export default function ToolsSection({ currentData, currentSunday, onUpdateStats, passcode }: {
  currentData: WeeklyData;
  currentSunday: string;
  onUpdateStats: (...args: any[]) => void;
  passcode: string;
}) {
  const [userId, setUserId] = useState<'damien' | 'tala'>(currentData.user_id as 'damien' | 'tala');
  const [toolData, setToolData] = useState<WeeklyData>(currentData);
  const [stats, setStats] = useState<CharacterStats>(currentData.character_stats);
  const [deedName, setDeedName] = useState('');
  const [deedGold, setDeedGold] = useState('');
  const [claims, setClaims] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [protectedIds, setProtectedIds] = useState<Set<string>>(new Set());
  const [loginPassword, setLoginPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const loadProtectedIds = async () => {
    const { data } = await supabase.from('family_credentials').select('id');
    setProtectedIds(new Set((data || []).map((r: any) => r.id)));
  };

  const loadUserData = async (id: 'damien' | 'tala') => {
    setLoadingData(true);
    // Level/xp/gold live on player_progress (lifetime, no week key); journal_logs/counters/
    // quiz_attempts/mastered_quizzes live on player_weekly_journal, keyed by content_week_id —
    // see docs/weekly-progress-redesign-plan.md Phase 4 Waves 1 & 4. Only damien (Grade 5) and
    // tala (Grade 2) ever reach this admin tool, so the grade map below is fine hardcoded.
    const grade = id === 'tala' ? 2 : 5;
    const { data: progress } = await supabase
      .from('player_progress')
      .select('level, xp, gold')
      .eq('user_id', id)
      .maybeSingle();
    if (progress) {
      setStats(progress as CharacterStats);
    }
    const { data: week } = await supabase
      .from('content_weeks')
      .select('id')
      .eq('grade', grade)
      .eq('week_starting_date', currentSunday)
      .maybeSingle();
    if (week) {
      const { data } = await supabase
        .from('player_weekly_journal')
        .select('*')
        .eq('user_id', id)
        .eq('content_week_id', week.id)
        .maybeSingle();
      if (data) {
        setToolData(data as WeeklyData);
      }
    }
    const { data: claimsData } = await supabase
      .from('reward_claims')
      .select('*')
      .eq('app_user_id', id)
      .order('created_at', { ascending: false });
    if (claimsData) setClaims(claimsData);
    setLoadingData(false);
  };

  useEffect(() => { loadUserData(userId); loadProtectedIds(); }, [userId]);

  const handleSetLoginPassword = async () => {
    if (!loginPassword.trim()) return;
    setSavingPassword(true);
    const result = await callAdminApi('/api/family-admin', { passcode, id: userId, password: loginPassword });
    if (result.success) {
      alert(`✅ Login password set for ${userId === 'damien' ? 'Damien' : 'Tala'}.`);
      setLoginPassword('');
      loadProtectedIds();
    } else {
      alert(result.error || 'Failed to set password.');
    }
    setSavingPassword(false);
  };

  // NOTE: these act on `userId` (the Damien/Tala picker above), not necessarily the
  // account currently logged into this browser tab — they used to go through
  // onUpdateStats, which is wired to the *active session's own* row (app/page.tsx),
  // so switching the picker to the other kid silently overwrote whoever was actually
  // logged in instead. Routing through the admin RPC (which takes an explicit
  // p_user_id) fixes that along with the RLS tightening.
  const handleAwardDeed = async () => {
    const amount = Number(deedGold);
    if (!deedName.trim() || !amount || amount <= 0) {
      alert('Enter a deed name and valid gold amount.');
      return;
    }
    const result = await callAdminApi('/api/admin-weekly', { passcode, action: 'award_progress_gold', userId, amount });
    if (!result.success) {
      alert(`❌ ${result.error || 'Failed to award gold.'}`);
      return;
    }
    logAction(userId, currentSunday, 'deed', deedName, 0, amount);
    playBlessing();
    alert(`✅ Awarded 🪙 ${amount} Gold for: ${deedName}`);
    setDeedName('');
    setDeedGold('');
    loadUserData(userId);
  };

  const handleSaveStats = async () => {
    let xp = stats.xp;
    let level = stats.level;
    while (xp >= (500 + level * 100)) { xp -= (500 + level * 100); level++; }
    const normalized = { ...stats, xp, level };
    const result = await callAdminApi('/api/admin-weekly', { passcode, action: 'set_progress_stats', userId, characterStats: normalized });
    if (!result.success) {
      alert(`❌ ${result.error || 'Failed to save stats.'}`);
      return;
    }
    setStats(normalized);
    alert('✅ Stats overwritten!');
  };

  const toggleClaim = async (id: number, status: string) => {
    const next = status === 'pending' ? 'supplied' : 'pending';
    const result = await callAdminApi('/api/admin-reward-claim', { passcode, id, status: next });
    if (!result.success) {
      alert('❌ Failed to update reward status.');
      return;
    }
    setClaims(claims.map(c => c.id === id ? { ...c, status: next } : c));
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-[#ede4d3] mb-1">Tools</h2>
      <p className="text-[#8a7c66] text-sm mb-6">Stat overrides, deed grants, and reward management.</p>

      {/* User selector */}
      <div className="flex gap-3 mb-8">
        {(['damien', 'tala'] as const).map(id => (
          <button
            key={id}
            onClick={() => setUserId(id)}
            className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${
              userId === id
                ? id === 'damien' ? 'bg-amber-600 text-[#ede4d3]' : 'bg-pink-600 text-[#ede4d3]'
                : 'bg-[#2a2119] text-[#a89c86] hover:text-[#ede4d3]'
            }`}
          >
            {id === 'damien' ? '⚔️ Damien' : '✨ Tala'}
          </button>
        ))}
      </div>

      {loadingData ? (
        <p className="text-[#8a7c66] animate-pulse">Loading...</p>
      ) : (
        <div className="space-y-6">

          {/* Login password */}
          <div className="bg-[#1c1611] border border-[#3d3225] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-[#8a7c66] uppercase tracking-widest">🔒 Login Password</p>
              {protectedIds.has(userId) ? (
                <span className="text-xs font-bold text-[#7fae52] bg-[#223616]/40 border border-[#33501f] px-2 py-0.5 rounded-full">Protected</span>
              ) : (
                <span className="text-xs font-bold text-[#8a7c66] bg-[#2a2119] border border-[#3d3225] px-2 py-0.5 rounded-full">Not Set — instant login</span>
              )}
            </div>
            <p className="text-[#8a7c66] text-xs mb-3">
              Once set, {userId === 'damien' ? 'Damien' : 'Tala'} will need this password to open their dashboard from the splash screen — classmates won't be able to click into it.
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Set or change password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                className="flex-1 bg-neutral-950 border border-[#3d3225] rounded-lg px-3 py-2 text-[#ede4d3] font-mono focus:outline-none focus:border-neutral-500"
              />
              <button
                onClick={handleSetLoginPassword}
                disabled={savingPassword || !loginPassword.trim()}
                className="bg-[#a8620f] hover:bg-[#c9781a] disabled:opacity-40 text-[#ede4d3] font-bold px-5 py-2 rounded-lg transition-colors"
              >
                {savingPassword ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          {/* Current stats display */}
          <div className="bg-[#1c1611] border border-[#3d3225] rounded-xl p-5">
            <p className="text-xs text-[#8a7c66] uppercase tracking-widest mb-4">Current Stats</p>
            <div className="flex gap-6">
              <div><p className="text-xs text-[#8a7c66]">Level</p><p className="text-2xl font-bold text-[#ede4d3] font-mono">{stats.level}</p></div>
              <div><p className="text-xs text-[#8a7c66]">XP</p><p className="text-2xl font-bold text-[#f0b429] font-mono">{stats.xp}</p></div>
              <div><p className="text-xs text-[#8a7c66]">Gold</p><p className="text-2xl font-bold text-[#f5c542] font-mono"><img src="/icons/rewards/gold_coin.svg" alt="Gold" className="inline w-4 h-4 align-[-2px]" /> {stats.gold}</p></div>
            </div>
          </div>

          {/* Stat override */}
          <div className="bg-[#1c1611] border border-[#3d3225] rounded-xl p-5">
            <p className="text-xs text-[#8a7c66] uppercase tracking-widest mb-4">Override Stats</p>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-xs text-[#8a7c66] block mb-1">Level</label>
                <input type="number" value={stats.level} onChange={e => setStats({ ...stats, level: Number(e.target.value) })}
                  className="w-full bg-neutral-950 border border-[#3d3225] rounded-lg px-3 py-2 text-[#ede4d3] font-mono focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-[#8a7c66] block mb-1">XP</label>
                <input type="number" value={stats.xp} onChange={e => setStats({ ...stats, xp: Number(e.target.value) })}
                  className="w-full bg-neutral-950 border border-[#3d3225] rounded-lg px-3 py-2 text-[#ede4d3] font-mono focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-[#8a7c66] block mb-1">Gold</label>
                <input type="number" value={stats.gold} onChange={e => setStats({ ...stats, gold: Number(e.target.value) })}
                  className="w-full bg-neutral-950 border border-[#3d3225] rounded-lg px-3 py-2 text-[#f5c542] font-mono focus:outline-none" />
              </div>
            </div>
            <button onClick={handleSaveStats} className="bg-[#a8620f] hover:bg-[#c9781a] text-[#ede4d3] font-bold px-5 py-2 rounded-lg transition-colors text-sm">
              Save Stats
            </button>
          </div>

          {/* Award deed */}
          <div className="bg-[#1c1611] border border-[#3d3225] rounded-xl p-5">
            <p className="text-xs text-[#8a7c66] uppercase tracking-widest mb-4">Award Good Deed</p>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="col-span-2">
                <label className="text-xs text-[#8a7c66] block mb-1">Deed Name</label>
                <input type="text" placeholder="e.g. Cleaned the garage" value={deedName} onChange={e => setDeedName(e.target.value)}
                  className="w-full bg-neutral-950 border border-[#3d3225] rounded-lg px-3 py-2 text-[#ede4d3] focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-[#8a7c66] block mb-1">Gold</label>
                <input type="number" placeholder="50" value={deedGold} onChange={e => setDeedGold(e.target.value)}
                  className="w-full bg-neutral-950 border border-[#3d3225] rounded-lg px-3 py-2 text-[#f5c542] font-mono focus:outline-none" />
              </div>
            </div>
            <button onClick={handleAwardDeed} className="bg-[#3f6428] hover:bg-[#4d7a32] text-[#ede4d3] font-bold px-5 py-2 rounded-lg transition-colors text-sm">
              🎉 Award Gold
            </button>
          </div>

          {/* Deed history */}
          <div className="bg-[#1c1611] border border-[#3d3225] rounded-xl p-5">
            <p className="text-xs text-[#8a7c66] uppercase tracking-widest mb-4">Deed History</p>
            <DeedHistory userId={userId} />
          </div>

          {/* Reward queue */}
          <div className="bg-[#1c1611] border border-[#3d3225] rounded-xl p-5">
            <p className="text-xs text-[#8a7c66] uppercase tracking-widest mb-4">Reward Queue</p>
            {claims.length === 0 ? (
              <p className="text-gray-600 text-sm">No pending rewards.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {[...claims]
                  .sort((a, b) => {
                    if (a.status === 'pending' && b.status !== 'pending') return -1;
                    if (a.status !== 'pending' && b.status === 'pending') return 1;
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                  })
                  .map(claim => (
                  <div key={claim.id} className="flex justify-between items-center bg-neutral-950 border border-[#2a2119] rounded-lg px-4 py-3">
                    <div>
                      <p className="text-[#ede4d3] font-medium text-sm">{claim.item_name}</p>
                      <p className="text-xs text-[#8a7c66]">{new Date(claim.created_at).toLocaleDateString()} · <img src="/icons/rewards/gold_coin.svg" alt="Gold" className="inline w-4 h-4 align-[-2px]" /> {claim.cost}</p>
                    </div>
                    <button
                      onClick={() => toggleClaim(claim.id, claim.status)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                        claim.status === 'pending' ? 'bg-yellow-900/50 text-[#f5c542] border border-yellow-800 hover:bg-yellow-800' : 'bg-[#223616]/50 text-[#7fae52] border border-[#33501f]'
                      }`}
                    >
                      {claim.status === 'pending' ? 'Mark Supplied' : '✅ Supplied'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quiz attempts */}
          <div className="bg-[#1c1611] border border-[#3d3225] rounded-xl p-5">
            <p className="text-xs text-[#8a7c66] uppercase tracking-widest mb-4">Quiz Attempts This Week</p>
            {Object.keys(toolData.quiz_attempts || {}).length === 0 ? (
              <p className="text-gray-600 text-sm">No attempts yet.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(toolData.quiz_attempts || {}).map(([key, count]) => {
                  const mastered = (toolData.mastered_quizzes || []).includes(key);
                  return (
                    <div key={key} className="flex justify-between items-center bg-neutral-950 border border-[#2a2119] rounded-lg px-4 py-2">
                      <span className="text-sm text-[#c9bfae]">{key.replace('_', ' — ')}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-[#8a7c66] font-mono">{count} attempt{count !== 1 ? 's' : ''}</span>
                        <span className={`text-xs font-bold ${mastered ? 'text-[#7fae52]' : 'text-gray-600'}`}>
                          {mastered ? '✅' : '…'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
