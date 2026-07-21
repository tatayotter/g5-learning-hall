'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

interface LogEntry {
  id: string;
  user_id: string;
  week_starting_date: string;
  action_type: string;
  description: string;
  xp_change: number;
  gold_change: number;
  created_at: string;
}

const ACTION_ICONS: Record<string, string> = {
  quiz: '📝',
  journal: '📖',
  deed: '🏅',
  achievement: '🏆',
  side_quest: '⚔️',
  purchase: '🛒',
};

export default function PlayerLog({ userId }: { userId: string }) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLog() {
      const { data, error } = await supabase
        .from('player_log')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) {
        setEntries(data as LogEntry[]);
      }
      setLoading(false);
    }
    fetchLog();
  }, [userId]);

  if (loading) {
    return <div className="text-gray-500 animate-pulse">Loading player log...</div>;
  }

  if (entries.length === 0) {
    return <p className="text-gray-500 italic">No log entries yet. Start a quest to write your legend!</p>;
  }

  // Group by week
  const byWeek: Record<string, LogEntry[]> = {};
  entries.forEach((entry) => {
    const key = entry.week_starting_date;
    if (!byWeek[key]) byWeek[key] = [];
    byWeek[key].push(entry);
  });

  return (
    <div className="space-y-8">
      {Object.entries(byWeek).map(([week, weekEntries]) => {
        const totalXp = weekEntries.reduce((s, e) => s + (e.xp_change || 0), 0);
        const totalGold = weekEntries.reduce((s, e) => s + (e.gold_change || 0), 0);
        return (
          <div key={week}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold font-display text-blue-400">
                Week of {format(new Date(week + 'T00:00:00'), 'MMMM d, yyyy')}
              </h3>
              <span className="text-xs font-mono text-gray-400">
                {totalXp > 0 && <span className="text-blue-300 mr-2">+{totalXp} XP</span>}
                {totalGold !== 0 && (
                  <span className={totalGold > 0 ? 'text-yellow-400' : 'text-red-400'}>
                    {totalGold > 0 ? '+' : ''}{totalGold} <img src="/icons/rewards/gold_coin.svg" alt="Gold" className="inline w-4 h-4 align-[-2px]" />
                  </span>
                )}
              </span>
            </div>
            <div className="space-y-2">
              {weekEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex justify-between items-start bg-black border border-neutral-800 rounded-lg p-3"
                >
                  <div className="flex gap-3 items-start">
                    <span className="text-lg">{ACTION_ICONS[entry.action_type] || '📌'}</span>
                    <div>
                      <p className="text-sm text-gray-200">{entry.description}</p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {format(new Date(entry.created_at), 'EEE, MMM d — h:mm a')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-xs font-mono ml-4 flex-shrink-0">
                    {entry.xp_change !== 0 && (
                      <div className="text-blue-400">+{entry.xp_change} XP</div>
                    )}
                    {entry.gold_change !== 0 && (
                      <div className={entry.gold_change > 0 ? 'text-yellow-400' : 'text-red-400'}>
                        {entry.gold_change > 0 ? '+' : ''}{entry.gold_change} <img src="/icons/rewards/gold_coin.svg" alt="Gold" className="inline w-4 h-4 align-[-2px]" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
