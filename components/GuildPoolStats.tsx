'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CURRENT_TERM } from '@/lib/guildConfig';
import { USERS } from '@/lib/userSession';

interface GuildStat {
  label: string;
  icon: string;
  tableName: string;
  questType: string;
  color: string;
}

const GUILDS: GuildStat[] = [
  { label: 'Lorekeeper', icon: '📜', tableName: 'sq_lorekeeper', questType: 'lorekeeper', color: 'text-emerald-400' },
  { label: 'SpellCaster', icon: '🧙‍♂️', tableName: 'sq_spellcaster', questType: 'spellcaster', color: 'text-purple-400' },
  { label: 'Number Realm', icon: '🔢', tableName: 'sq_number_realm', questType: 'number_realm', color: 'text-amber-400' },
  { label: 'Logic Labyrinth', icon: '🧩', tableName: 'sq_logic_labyrinth', questType: 'logic_labyrinth', color: 'text-cyan-400' },
];

interface PoolStat {
  questType: string;
  totalQuestions: number;
  answeredQuestions: number;
  remaining: number;
  prestigeWarning: boolean;
}

export default function GuildPoolStats({ userId }: { userId: string }) {
  const [stats, setStats] = useState<PoolStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const userProfile = USERS[userId as keyof typeof USERS] || USERS['damien'];
  const gradeLevel = userProfile.grade === 'Grade 2' ? 2 : 5;

  async function fetchStats() {
    setLoading(true);
    const results = await Promise.all(
      GUILDS.map(async (guild) => {
        // Count only questions for this user's grade level
        const { count: total } = await supabase
          .from(guild.tableName)
          .select('*', { count: 'exact', head: true })
          .eq('term_id', CURRENT_TERM)
          .eq('is_active', true)
          .eq('grade_level', gradeLevel);

        // Count only questions this specific user has answered
        const { count: answered } = await supabase
          .from('user_completed_questions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('quest_type', guild.questType);

        const totalQ = total || 0;
        const answeredQ = answered || 0;
        const remaining = Math.max(0, totalQ - answeredQ);

        return {
          questType: guild.questType,
          totalQuestions: totalQ,
          answeredQuestions: answeredQ,
          remaining,
          prestigeWarning: remaining <= 5 && totalQ > 0
        };
      })
    );
    setStats(results);
    setLastRefreshed(new Date());
    setLoading(false);
  }

  useEffect(() => { fetchStats(); }, [userId]);

  return (
    <div className="bg-[#111] border border-[#333] p-6 rounded-xl">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold font-display">⚔️ Side Quest Pool Status</h3>
        <button
          onClick={fetchStats}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500 animate-pulse">Checking question pools...</p>
      ) : (
        <div className="space-y-4">
          {GUILDS.map((guild) => {
            const stat = stats.find(s => s.questType === guild.questType);
            if (!stat) return null;
            const pct = stat.totalQuestions > 0
              ? Math.min(100, (stat.answeredQuestions / stat.totalQuestions) * 100)
              : 0;
            return (
              <div key={guild.questType} className="bg-black border border-neutral-800 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className={`font-bold ${guild.color}`}>{guild.icon} {guild.label}</span>
                  {stat.prestigeWarning && (
                    <span className="text-xs font-bold text-red-400 animate-pulse">⚠️ Load more questions soon</span>
                  )}
                  {stat.totalQuestions === 0 && (
                    <span className="text-xs text-gray-600 italic">No questions loaded yet</span>
                  )}
                </div>
                <div className="flex justify-between text-xs text-gray-400 font-mono mb-2">
                  <span>{stat.answeredQuestions} answered</span>
                  <span>{stat.remaining} remaining</span>
                  <span>{stat.totalQuestions} total (Grade {gradeLevel} · Term {CURRENT_TERM})</span>
                </div>
                <div className="w-full bg-neutral-800 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${pct >= 80 ? 'bg-red-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-green-600'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-gray-600 mt-4">
        Last refreshed: {lastRefreshed.toLocaleTimeString()} · Grade {gradeLevel} · Term {CURRENT_TERM} · Pool prestiges automatically when all questions are answered.
      </p>
    </div>
  );
}
